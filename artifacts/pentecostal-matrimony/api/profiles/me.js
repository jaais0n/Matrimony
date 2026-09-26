/**
 * Vercel Serverless Function: /api/profiles/me
 * Get/Save the current user's own profile backed by Neon PostgreSQL.
 * Cross-device synchronization without Vercel Blob limits.
 */

import { readStore, writeStore, dedup } from '../_lib/db-store.js';

function getUserIdFromRequest(req) {
  // Try Authorization header: "Bearer <userId>"
  const auth = req.headers['authorization'] || '';
  if (auth.startsWith('Bearer ')) {
    const token = auth.slice(7);
    if (token && token !== 'demo_token' && token !== 'null') return token;
  }
  // Try query param
  if (req.query && req.query.userId) return req.query.userId;
  return null;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const store = await readStore();
  const userId = getUserIdFromRequest(req);

  if (req.method === 'GET') {
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const cleanId = String(userId).trim().toLowerCase();
    const profile = store.profiles.find(p =>
      (p.userId && p.userId.toLowerCase() === cleanId) ||
      (p.id && (p.id.toLowerCase() === cleanId || p.id.toLowerCase() === `prof_${cleanId}`)) ||
      (p.displayName && p.displayName.trim().toLowerCase() === cleanId) ||
      (p.email && p.email.toLowerCase() === cleanId)
    );
    if (!profile) {
      res.status(404).json({ error: 'Profile not found' });
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

    const targetUserId = profileData.userId || userId || `user_${Date.now()}`;
    const merged = {
      ...profileData,
      id: profileData.id || `prof_${targetUserId}`,
      userId: targetUserId,
      updatedAt: new Date().toISOString(),
      published: profileData.published !== undefined ? profileData.published : true,
    };

    store.profiles = dedup([...store.profiles, merged]);
    await writeStore(store);
    res.status(200).json(merged);
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
