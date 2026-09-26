/**
 * Vercel Serverless Function: /api/profiles/sync
 * Bulk-sync profiles from any device to the shared Vercel Blob store.
 */

import { put, list, del } from '@vercel/blob';

const BLOB_KEY = 'pm-profiles-store.json';

async function readStore() {
  try {
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
    const { blobs } = await list({ prefix: 'pm-profiles-store' });
    for (const b of blobs) {
      try { await del(b.url); } catch {}
    }
    const body = JSON.stringify({ ...data, savedAt: new Date().toISOString() });
    await put(BLOB_KEY, body, { access: 'public', contentType: 'application/json', addRandomSuffix: false });
  } catch (e) {
    console.error('writeStore error', e);
  }
}

function dedup(list) {
  const result = [];
  for (const item of list) {
    if (!item) continue;
    const idx = result.findIndex(e =>
      (item.id && e.id && item.id === e.id) ||
      (item.userId && e.userId && item.userId === e.userId)
    );
    if (idx >= 0) {
      result[idx] = { ...result[idx], ...item };
    } else {
      result.push(item);
    }
  }
  return result;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const incoming = Array.isArray(req.body) ? req.body : (req.body?.profiles || []);
  if (!Array.isArray(incoming) || incoming.length === 0) {
    res.status(400).json({ error: 'No profiles provided' });
    return;
  }

  const store = await readStore();
  store.profiles = dedup([...store.profiles, ...incoming]);
  await writeStore(store);

  res.status(200).json({ success: true, count: store.profiles.length });
}
