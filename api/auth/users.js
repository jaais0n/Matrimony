/**
 * Vercel Serverless Function: /api/auth/users
 * Returns registered accounts backed by Neon PostgreSQL.
 */

import { readStore, writeStore } from '../_lib/db-store.js';
import { rateLimit, getClientKey } from '../_lib/rate-limit.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const store = await readStore();

  // ---------- AUTHORIZATION ----------
  // All mutating / destructive operations require the X-Admin-Key header.
  // The key is set as the ADMIN_SECRET environment variable on Vercel.
  const isDestructive =
    req.method === 'DELETE' ||
    (req.method === 'POST' && (req.query?.action === 'delete' || req.body?.action === 'delete'));

  if (isDestructive) {
    const adminKey = process.env.ADMIN_SECRET;
    const providedKey = req.headers['x-admin-key'];
    if (!adminKey || !providedKey || providedKey !== adminKey) {
      res.status(401).json({ error: 'Unauthorized: valid X-Admin-Key required for this operation.' });
      return;
    }
  }

  // DELETE /api/auth/users — wipe all non-admin users with ?all=true or delete specific user with ?id=...
  if (req.method === 'DELETE' || (req.method === 'POST' && (req.query?.action === 'delete' || req.body?.action === 'delete'))) {
    const { id, all, email } = req.query || {};
    const body = req.body || {};

    if (all === 'true' || all === true || body.all === true) {
      // Keep only administrator accounts
      store.users = (store.users || []).filter(
        (u) => u.id === 'user_admin' || u.role === 'admin' || u.email === 'admin@pentecostalmatrimony.org'
      );
      store.profiles = [];
      store.conversations = [];
      await writeStore(store);
      res.status(200).json({ success: true, count: store.users.length, remainingUsers: store.users });
      return;
    }

    const target = id || body.id || email || body.email;
    if (target) {
      const cleanTarget = String(target).trim().toLowerCase();
      // Remove user from store.users
      store.users = (store.users || []).filter(
        (u) =>
          u.id !== 'user_admin' &&
          String(u.id).toLowerCase() !== cleanTarget &&
          String(u.email || '').toLowerCase() !== cleanTarget
      );
      // Remove user's profile from store.profiles
      store.profiles = (store.profiles || []).filter(
        (p) =>
          String(p.id).toLowerCase() !== cleanTarget &&
          String(p.userId).toLowerCase() !== cleanTarget
      );
      // Remove conversations involving this user
      if (Array.isArray(store.conversations)) {
        store.conversations = store.conversations.filter(
          (c) =>
            String(c.creatorId || '').toLowerCase() !== cleanTarget &&
            String(c.participantId || '').toLowerCase() !== cleanTarget
        );
      }
      await writeStore(store);
      res.status(200).json({ success: true, deletedTarget: target, remaining: store.users.length });
      return;
    }

    res.status(400).json({ error: 'Missing target id or all=true flag' });
    return;
  }

  // GET /api/auth/users — strip passwords before returning
  const safeUsers = (store.users || []).map(({ password: _pw, ...u }) => u);
  res.status(200).json(safeUsers);
}
