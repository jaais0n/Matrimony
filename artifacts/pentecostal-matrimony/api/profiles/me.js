/**
 * Vercel Serverless Function: /api/profiles/me
 * Get/Save the current user's own profile backed by Neon PostgreSQL.
 * Strict user_id scoping for multi-account isolation.
 */

import { readStore, writeStore, dedup } from '../_lib/db-store.js';

function getUserIdFromRequest(req) {
  const auth = req.headers['authorization'] || '';
  if (auth.startsWith('Bearer ')) {
    const token = auth.slice(7).trim();
    if (token && token !== 'demo_token' && token !== 'null' && token !== 'undefined') return token;
  }
  if (req.query && req.query.userId) return String(req.query.userId).trim();
  if (req.query && req.query.email) return String(req.query.email).trim();
  return null;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const store = await readStore();
  const userId = getUserIdFromRequest(req);

  if (req.method === 'GET') {
    if (!userId) {
      res.status(200).json({
        id: 'prof_guest',
        userId: 'guest',
        displayName: '',
        published: true,
        notFound: true,
      });
      return;
    }

    const cleanId = String(userId).trim().toLowerCase();
    const profile = store.profiles.find((p) =>
      (p.userId && String(p.userId).toLowerCase() === cleanId) ||
      (p.id && (String(p.id).toLowerCase() === cleanId || String(p.id).toLowerCase() === `prof_${cleanId}`)) ||
      (p.displayName && p.displayName.trim().toLowerCase() === cleanId) ||
      (p.email && p.email.toLowerCase() === cleanId)
    );

    if (!profile) {
      res.status(200).json({
        id: `prof_${cleanId}`,
        userId: cleanId,
        displayName: '',
        published: true,
        notFound: true,
      });
      return;
    }

    res.status(200).json(profile);
    return;
  }

  if (req.method === 'POST' || req.method === 'PUT') {
    const profileData = req.body;
    if (!profileData) {
      res.status(400).json({ error: 'No profile data provided' });
      return;
    }

    const targetUserId = String(profileData.userId || userId || `user_${Date.now()}`).trim();
    const merged = {
      ...profileData,
      id: profileData.id || `prof_${targetUserId}`,
      userId: targetUserId,
      updatedAt: new Date().toISOString(),
      published: profileData.published !== undefined ? profileData.published : true,
    };

    delete merged.notFound;

    store.profiles = dedup([...store.profiles, merged]);
    await writeStore(store);
    res.status(200).json(merged);
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
