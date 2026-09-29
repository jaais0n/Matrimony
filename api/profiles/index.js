/**
 * Vercel Serverless Function: /api/profiles
 * High-performance, quota-free storage backed by Neon PostgreSQL.
 * Cross-device synchronization for desktop and mobile without Vercel Blob limits.
 */

import { readStore, writeStore, dedup, isSeedProfile } from '../_lib/db-store.js';
import { rateLimit, getClientKey } from '../_lib/rate-limit.js';

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
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
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

  // DELETE /api/profiles — requires admin authorization
  if (req.method === 'DELETE') {
    const adminKey = process.env.ADMIN_SECRET;
    const providedKey = req.headers['x-admin-key'];
    if (!adminKey || !providedKey || providedKey !== adminKey) {
      res.status(401).json({ error: 'Unauthorized: valid X-Admin-Key required for delete operations.' });
      return;
    }
    const { id, all } = req.query || {};
    const body = req.body || {};
    if (all === 'true' || all === true || body.all === true) {
      store.profiles = [];
      store.conversations = [];
      // Wipe all non-admin users from database so deleted users cannot log in
      store.users = (store.users || []).filter(u => u.id === 'user_admin' || u.role === 'admin' || u.email === 'admin@pentecostalmatrimony.org');
      await writeStore(store);
      res.status(200).json({ success: true, count: 0, items: [], remainingUsers: store.users.length });
      return;
    }

    const targetId = id || body.id;
    if (targetId) {
      const cleanTarget = String(targetId).trim().toLowerCase();
      store.profiles = (store.profiles || []).filter(p => 
        String(p.id).toLowerCase() !== cleanTarget &&
        String(p.userId).toLowerCase() !== cleanTarget
      );
      store.users = (store.users || []).filter(u =>
        u.id !== 'user_admin' ? (
          String(u.id).toLowerCase() !== cleanTarget &&
          String(u.email || '').toLowerCase() !== cleanTarget
        ) : true
      );
      if (Array.isArray(store.conversations)) {
        store.conversations = store.conversations.filter(c =>
          String(c.creatorId || '').toLowerCase() !== cleanTarget &&
          String(c.participantId || '').toLowerCase() !== cleanTarget
        );
      }
      await writeStore(store);
      res.status(200).json({ success: true, deletedId: targetId, remaining: store.profiles.length });
      return;
    }

    res.status(400).json({ error: 'Missing profile id or all flag' });
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
