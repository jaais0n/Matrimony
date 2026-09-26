import { defaultStore } from './default-store.js';

const FALLBACK_CONN = 'postgresql://neondb_owner:npg_DTj86nVbSHRq@ep-old-queen-b3qfwz1n-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

// In-memory cache for ultra-fast serverless response
let memoryStore = {
  users: Array.isArray(defaultStore.users) ? [...defaultStore.users] : [],
  profiles: Array.isArray(defaultStore.profiles) ? [...defaultStore.profiles] : [],
};

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
  'prof_user_1790356597878',
  'user_1790356597878',
  'fssdf',
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
  'fssdf',
];

export function isSeedProfile(p) {
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

export function dedup(list) {
  const result = [];
  for (const item of list) {
    if (!item) continue;
    if (item.id === 'prof_sync_test' || item.userId === 'user_sync_test') continue;
    const name = String(item.displayName || '').trim().toLowerCase();
    const id = item.id || (item.userId ? `prof_${item.userId}` : (name ? `prof_${name}` : `prof_${Date.now()}`));
    const userId = item.userId || id.replace(/^prof_/, '');
    const normalizedItem = { ...item, id, userId };

    const idx = result.findIndex((e) =>
      (e.id && e.id === normalizedItem.id) ||
      (e.userId && e.userId === normalizedItem.userId) ||
      (name && e.displayName && String(e.displayName).trim().toLowerCase() === name)
    );
    if (idx >= 0) {
      result[idx] = { ...result[idx], ...normalizedItem };
    } else {
      result.push(normalizedItem);
    }
  }
  return result;
}

async function queryNeon(sql, params = []) {
  const connStr = process.env.DATABASE_URL || FALLBACK_CONN;
  if (!connStr) return null;
  try {
    const url = new URL(connStr);
    const neonEndpoint = `https://${url.hostname}/sql`;
    const res = await fetch(neonEndpoint, {
      method: 'POST',
      headers: {
        'Neon-Connection-String': connStr,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql, params }),
    });
    if (!res.ok) {
      const errText = await res.text();
      console.warn('Neon query HTTP warning:', res.status, errText);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.warn('Neon query error (non-fatal, falling back to memory):', err.message);
    return null;
  }
}

export async function readStore() {
  try {
    // 1. Try fetching from Neon Postgres
    const result = await queryNeon(`SELECT data FROM pm_store WHERE key = $1`, ['store_main']);
    if (result && Array.isArray(result.rows) && result.rows.length > 0 && result.rows[0].data) {
      const data = result.rows[0].data;
      const rawProfiles = Array.isArray(data.profiles) ? data.profiles : [];
      const cleaned = rawProfiles.filter((p) => !isSeedProfile(p));
      const users = Array.isArray(data.users) ? data.users : [];
      memoryStore = { profiles: cleaned, users };
      return { profiles: cleaned, users };
    }
  } catch (err) {
    console.warn('readStore Neon error:', err);
  }

  // 2. Return memory store or clean default fallback
  return {
    profiles: (memoryStore.profiles || []).filter((p) => !isSeedProfile(p)),
    users: memoryStore.users || [],
  };
}

export async function writeStore(data) {
  const profiles = (Array.isArray(data?.profiles) ? data.profiles : []).filter((p) => !isSeedProfile(p));
  const users = Array.isArray(data?.users) ? data.users : [];
  const cleanData = { profiles, users, savedAt: new Date().toISOString() };

  // Always update in-memory cache immediately
  memoryStore = cleanData;

  // Persist to Neon Postgres asynchronously
  try {
    const jsonStr = JSON.stringify(cleanData);
    await queryNeon(
      `INSERT INTO pm_store (key, data) VALUES ($1, $2::jsonb) ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW() RETURNING key`,
      ['store_main', jsonStr]
    );
  } catch (err) {
    console.warn('writeStore Neon error (non-fatal):', err);
  }

  return cleanData;
}
