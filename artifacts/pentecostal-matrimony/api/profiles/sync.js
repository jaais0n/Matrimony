/**
 * Vercel Serverless Function: /api/profiles/sync
 * Bulk-sync profiles from any device backed by Neon PostgreSQL.
 * Instant cross-device synchronization without Vercel Blob limits.
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

  // GET: return all real profiles
  if (req.method === 'GET') {
    const store = await readStore();
    const published = store.profiles.filter(p => !isSeedProfile(p));
    res.status(200).json({ profiles: published, count: published.length });
    return;
  }

  // POST: merge client profiles with server profiles
  if (req.method === 'POST') {
    let incoming = [];
    if (Array.isArray(req.body)) {
      incoming = req.body;
    } else if (req.body && Array.isArray(req.body.profiles)) {
      incoming = req.body.profiles;
    }

    const realIncoming = incoming.filter(p => !isSeedProfile(p));
    const store = await readStore();

    if (realIncoming.length === 0) {
      res.status(200).json({ success: true, count: store.profiles.length, profiles: store.profiles });
      return;
    }

    const merged = dedup([...store.profiles, ...realIncoming]).filter(p => !isSeedProfile(p));
    store.profiles = merged;
    await writeStore(store);

    res.status(200).json({ success: true, count: merged.length, profiles: merged });
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
