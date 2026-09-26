/**
 * Vercel Serverless Function: /api/auth/register
 * Persists registered accounts across devices in the shared store.
 */

import { put, list, del } from '@vercel/blob';

const BLOB_KEY = 'pm-profiles-store.json';

async function readStore() {
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) return { profiles: [], users: [] };
    const { blobs } = await list({ prefix: 'pm-profiles-store' });
    if (blobs.length === 0) return { profiles: [], users: [] };
    const blob = blobs.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())[0];
    const res = await fetch(blob.url);
    const data = await res.json();
    return { profiles: Array.isArray(data.profiles) ? data.profiles : [], users: Array.isArray(data.users) ? data.users : [] };
  } catch {
    return { profiles: [], users: [] };
  }
}

async function writeStore(data) {
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) return;
    const { blobs } = await list({ prefix: 'pm-profiles-store' });
    for (const b of blobs) {
      try { await del(b.url); } catch {}
    }
    const body = JSON.stringify({ ...data, savedAt: new Date().toISOString() });
    await put(BLOB_KEY, body, { access: 'public', contentType: 'application/json', addRandomSuffix: false });
  } catch (e) {
    console.error('writeStore error in auth/register', e);
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const account = req.body;
  if (!account || !account.email) {
    res.status(400).json({ error: 'Email is required' });
    return;
  }

  const store = await readStore();
  const emailClean = String(account.email).trim().toLowerCase();
  const existingIdx = store.users.findIndex(u => u.email?.toLowerCase() === emailClean);

  const newUser = {
    id: account.id || (existingIdx >= 0 ? store.users[existingIdx].id : `user_${Date.now()}`),
    email: emailClean,
    fullName: account.fullName || (emailClean.includes('@') ? emailClean.split('@')[0] : emailClean),
    firstName: account.firstName || account.fullName?.split(' ')[0] || 'Member',
    password: account.password || 'password123',
    role: account.role || 'member',
  };

  if (existingIdx >= 0) {
    store.users[existingIdx] = { ...store.users[existingIdx], ...newUser };
  } else {
    store.users.push(newUser);
  }

  await writeStore(store);
  res.status(200).json(newUser);
}
