/**
 * Vercel Serverless Function: /api/profiles
 * Provides cross-device persistent profile storage using Vercel Blob.
 * All devices (desktop, mobile) share the same data store.
 */

import { put, list, del } from '@vercel/blob';

const BLOB_KEY = 'pm-profiles-store.json';

async function readStore() {
  try {
    const { blobs } = await list({ prefix: 'pm-profiles-store' });
    if (blobs.length === 0) return { profiles: [], users: [] };
    // Get the most recent blob
    const blob = blobs.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())[0];
    const res = await fetch(blob.url);
    const data = await res.json();
    return { profiles: data.profiles || [], users: data.users || [] };
  } catch {
    return { profiles: [], users: [] };
  }
}

async function writeStore(data) {
  try {
    // Delete old blobs
    const { blobs } = await list({ prefix: 'pm-profiles-store' });
    for (const b of blobs) {
      try { await del(b.url); } catch {}
    }
    // Write new blob
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
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const store = await readStore();

  // GET /api/profiles — return all published profiles
  if (req.method === 'GET') {
    const published = store.profiles.filter(p => p.published !== false);
    res.status(200).json({
      items: published,
      total: published.length,
      page: 1,
      pageSize: published.length,
    });
    return;
  }

  // POST /api/profiles — upsert a profile
  if (req.method === 'POST') {
    const profile = req.body;
    if (!profile || !profile.id) {
      res.status(400).json({ error: 'Profile must have an id' });
      return;
    }
    store.profiles = dedup([...store.profiles, profile]);
    await writeStore(store);
    res.status(200).json(profile);
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
