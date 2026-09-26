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
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    res.setHeader('CDN-Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    res.setHeader('Vercel-CDN-Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
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

  // DELETE /api/profiles — delete single profile by id or wipe all with ?all=true
  if (req.method === 'DELETE') {
    const { id, all } = req.query || {};
    const body = req.body || {};
    if (all === 'true' || all === true || body.all === true) {
      store.profiles = [];
      await writeStore(store);
      res.status(200).json({ success: true, count: 0, items: [] });
      return;
    }

    const targetId = id || body.id;
    if (targetId) {
      const cleanTarget = String(targetId).trim().toLowerCase();
      store.profiles = store.profiles.filter(p => 
        String(p.id).toLowerCase() !== cleanTarget &&
        String(p.userId).toLowerCase() !== cleanTarget
      );
      await writeStore(store);
      res.status(200).json({ success: true, deletedId: targetId, remaining: store.profiles.length });
      return;
    }

    res.status(400).json({ error: 'Missing profile id or all flag' });
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
