/**
 * Vercel Serverless Function: /api/auth/users
 * Returns registered accounts for cross-device authentication.
 */

import { list } from '@vercel/blob';

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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const store = await readStore();
  res.status(200).json(store.users || []);
}
