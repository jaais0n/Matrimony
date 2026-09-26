/**
 * Vercel Serverless Function: /api/auth/register
 * Persists registered accounts across devices backed by Neon PostgreSQL.
 */

import { readStore, writeStore } from '../_lib/db-store.js';

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
