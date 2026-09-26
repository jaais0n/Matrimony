/**
 * Vercel Serverless Function: /api/profiles
 * High-performance, quota-free storage backed by Neon PostgreSQL.
 * Cross-device synchronization for desktop and mobile without Vercel Blob limits.
 */

import { readStore, writeStore, dedup, isSeedProfile } from '../_lib/db-store.js';

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

  // GET /api/profiles — return all published profiles (never seed profiles)
  if (req.method === 'GET') {
    const published = store.profiles.filter(p => !isSeedProfile(p) && p.published !== false);
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
    if (isSeedProfile(profile)) {
      res.status(200).json({ ignored: true });
      return;
    }
    store.profiles = dedup([...store.profiles, profile]).filter(p => !isSeedProfile(p));
    await writeStore(store);
    res.status(200).json(profile);
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
