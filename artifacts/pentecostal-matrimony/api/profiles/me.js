/**
 * Vercel Serverless Function: /api/profiles/me
 * Get/Save the current user's own profile using Vercel Blob shared store.
 */

import { put, list, del } from '@vercel/blob';

const BLOB_KEY = 'pm-profiles-store.json';

const SEED_PROFILE_IDS = new Set([
  'prof_user_grace',
  'prof_user_joshua',
  'prof_user_rebecca',
  'prof_user_samuel',
  'prof_user_sneha',
  'prof_user_daniel',
  'user_grace',
  'user_joshua',
  'user_rebecca',
  'user_samuel',
  'user_sneha',
  'user_daniel',
]);

function isSeed(p) {
  if (!p) return false;
  const id = String(p.id || '').toLowerCase();
  const userId = String(p.userId || '').toLowerCase();
  const name = String(p.displayName || '').toLowerCase();
  if (SEED_PROFILE_IDS.has(id) || SEED_PROFILE_IDS.has(userId)) return true;
  if (name.includes('grace philip') || name.includes('joshua varghese') || name.includes('rebecca e') || name.includes('samuel k') || name.includes('sneha philip') || name.includes('daniel k')) return true;
  return false;
}

import { defaultStore } from '../_lib/default-store.js';

function getFallbackStore() {
  try {
    if (defaultStore && Array.isArray(defaultStore.profiles)) {
      return {
        profiles: defaultStore.profiles.filter(pr => !isSeed(pr)),
        users: Array.isArray(defaultStore.users) ? defaultStore.users : [],
      };
    }
  } catch {}
  return { profiles: [], users: [] };
}

async function readStore() {
  try {
    const { blobs } = await list({ prefix: 'pm-profiles-store' });
    if (blobs.length === 0) return getFallbackStore();
    const blob = blobs.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())[0];
    const res = await fetch(blob.url);
    const data = await res.json();
    const raw = Array.isArray(data.profiles) ? data.profiles : [];
    const cleaned = raw.filter(p => !isSeed(p));
    if (cleaned.length === 0) return getFallbackStore();
    return { profiles: cleaned, users: Array.isArray(data.users) ? data.users : [] };
  } catch {
    return getFallbackStore();
  }
}


async function writeStore(data) {
  try {
    const { blobs } = await list({ prefix: 'pm-profiles-store' });
    for (const b of blobs) {
      try { await del(b.url); } catch {}
    }
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
