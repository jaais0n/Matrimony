/**
 * Vercel Serverless Function: /api/profiles
 * Provides cross-device persistent profile storage using Vercel Blob.
 * All devices (desktop, mobile) share the same data store.
 */

import { get, put, list, del } from '@vercel/blob';

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
  'ph_grace_1',
  'ph_joshua_1',
  'ph_rebecca_1',
  'ph_samuel_1',
  'ph_sneha_1',
  'ph_daniel_1',
]);

const SEED_PROFILE_NAMES = [
  'grace philip',
  'dr. joshua varghese',
  'rebecca e. george',
  'samuel k. george',
  'sneha philip',
  'daniel k. varghese',
  'dr. joshua thomas',
  'rebecca sarah varghese',
  'samuel k. cherian',
  'sneha elizabeth mathew',
  'daniel m. varghese',
];

function isSeedProfile(p) {
  if (!p) return false;
  if (p.isSeed === true || p._seed === true) return true;
  const id = String(p.id || '').trim().toLowerCase();
  const userId = String(p.userId || '').trim().toLowerCase();
  const name = String(p.displayName || '').trim().toLowerCase();

  if (SEED_PROFILE_IDS.has(id) || SEED_PROFILE_IDS.has(userId)) return true;
  if (
    id.startsWith('prof_user_grace') ||
    id.startsWith('prof_user_joshua') ||
    id.startsWith('prof_user_rebecca') ||
    id.startsWith('prof_user_samuel') ||
    id.startsWith('prof_user_sneha') ||
    id.startsWith('prof_user_daniel')
  ) {
    return true;
  }
  if (SEED_PROFILE_NAMES.some((n) => name.includes(n))) return true;

  if (Array.isArray(p.photos)) {
    for (const ph of p.photos) {
      const u = String(ph?.url || '');
      if (
        u.includes('1573496359142') ||
        u.includes('1507003211169') ||
        u.includes('1544005313') ||
        u.includes('1500648767791') ||
        u.includes('1534528741775') ||
        u.includes('1506794778202')
      ) {
        return true;
      }
    }
  }
  const primaryUrl = String(p.primaryPhotoUrl || '');
  if (
    primaryUrl.includes('1573496359142') ||
    primaryUrl.includes('1507003211169') ||
    primaryUrl.includes('1544005313') ||
    primaryUrl.includes('1500648767791') ||
    primaryUrl.includes('1534528741775') ||
    primaryUrl.includes('1506794778202')
  ) {
    return true;
  }

  return false;
}

async function readStore() {
  try {
    const { blobs } = await list({ prefix: 'pm-profiles-store' });
    if (!blobs || blobs.length === 0) return { profiles: [], users: [] };
    const blob = blobs.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())[0];
    
    let data = null;
    try {
      const result = await get(blob.url);
      if (result && result.body) {
        const text = await new Response(result.body).text();
        data = JSON.parse(text);
      }
    } catch {}

    if (!data) {
      const res = await fetch(blob.url);
      data = await res.json();
    }

    const rawProfiles = Array.isArray(data?.profiles) ? data.profiles : [];
    const cleanedProfiles = rawProfiles.filter(p => !isSeedProfile(p));
    return { profiles: cleanedProfiles, users: Array.isArray(data?.users) ? data.users : [] };
  } catch (err) {
    console.error('readStore error', err);
    return { profiles: [], users: [] };
  }
}

async function writeStore(data) {
  try {
    const { blobs } = await list({ prefix: 'pm-profiles-store' });
    for (const b of blobs) {
      try { await del(b.url); } catch {}
    }
    const body = JSON.stringify({ ...data, savedAt: new Date().toISOString() });
    try {
      await put(BLOB_KEY, body, { access: 'private', contentType: 'application/json', addRandomSuffix: false });
    } catch {
      await put(BLOB_KEY, body, { access: 'public', contentType: 'application/json', addRandomSuffix: false });
    }
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
