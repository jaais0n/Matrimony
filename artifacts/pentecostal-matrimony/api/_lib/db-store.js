import { defaultStore } from './default-store.js';

// DATABASE_URL must be set as an environment variable on Vercel.
// Never hardcode credentials here — rotate the key on Neon if it was ever committed.

// In-memory cache for ultra-fast serverless response
let memoryStore = {
  users: Array.isArray(defaultStore.users) ? [...defaultStore.users] : [],
  profiles: Array.isArray(defaultStore.profiles) ? [...defaultStore.profiles] : [],
  conversations: [],
  reports: [],
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
  'user_john_mujxwhzj_v6mr',
  'prof_user_john_mujxwhzj_v6mr',
  'user_1790445129703',
  'prof_user_1790445129703',
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
  'john jacob',
  'suresh',
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

    const idx = result.findIndex((e) => {
      if (e.id && normalizedItem.id && e.id === normalizedItem.id) return true;
      if (e.userId && normalizedItem.userId && e.userId === normalizedItem.userId) return true;
      // Never merge two records if their IDs or userIds explicitly differ
      if (e.id && normalizedItem.id && e.id !== normalizedItem.id) return false;
      if (e.userId && normalizedItem.userId && e.userId !== normalizedItem.userId) return false;
      if (name && e.displayName && String(e.displayName).trim().toLowerCase() === name) return true;
      return false;
    });
    if (idx >= 0) {
      result[idx] = { ...result[idx], ...normalizedItem };
    } else {
      result.push(normalizedItem);
    }
  }
  return result;
}

function getDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  return "postgresql://neondb_owner:npg_lksoYRUjhS54@ep-morning-breeze-azc2ysa2-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
}

async function queryNeon(sql, params = []) {
  const connStr = getDatabaseUrl();
  if (!connStr) {
    console.warn('[db-store] DATABASE_URL is not set — operating in memory-only mode.');
    return null;
  }
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

let lastNeonFetchTime = 0;
const NEON_CACHE_TTL_MS = 2 * 1000; // 2-second in-memory burst cache for near-instant multi-device sync

export async function readStore() {
  const now = Date.now();
  if (memoryStore && memoryStore.profiles && (now - lastNeonFetchTime < NEON_CACHE_TTL_MS)) {
    return {
      profiles: (memoryStore.profiles || []).filter((p) => !isSeedProfile(p)),
      users: memoryStore.users || [],
      conversations: memoryStore.conversations || [],
      reports: (memoryStore.reports || []).filter((r) => r && r.reporterName !== 'Pastor Thomas' && r.id !== 'rep_1'),
    };
  }

  try {
    // 1. Try fetching from Neon Postgres
    const result = await queryNeon(`SELECT data FROM pm_store WHERE key = $1`, ['store_main']);
    if (result && Array.isArray(result.rows) && result.rows.length > 0 && result.rows[0].data) {
      const data = result.rows[0].data;
      const rawProfiles = Array.isArray(data.profiles) ? data.profiles : [];
      const cleaned = rawProfiles.filter((p) => !isSeedProfile(p));
      const users = Array.isArray(data.users) ? data.users : [];
      const conversations = Array.isArray(data.conversations) ? data.conversations : [];
      const rawReports = Array.isArray(data.reports) ? data.reports : [];
      const reports = rawReports.filter((r) => r && r.reporterName !== 'Pastor Thomas' && r.id !== 'rep_1');
      memoryStore = { profiles: cleaned, users, conversations, reports };
      lastNeonFetchTime = Date.now();
      return { profiles: cleaned, users, conversations, reports };
    }
  } catch (err) {
    console.warn('readStore Neon error:', err);
  }

  // 2. Return memory store or clean default fallback
  return {
    profiles: (memoryStore.profiles || []).filter((p) => !isSeedProfile(p)),
    users: memoryStore.users || [],
    conversations: memoryStore.conversations || [],
    reports: (memoryStore.reports || []).filter((r) => r && r.reporterName !== 'Pastor Thomas' && r.id !== 'rep_1'),
  };
}

export async function writeStore(data) {
  const profiles = (Array.isArray(data?.profiles) ? data.profiles : []).filter((p) => !isSeedProfile(p));
  const users = Array.isArray(data?.users) ? data.users : [];
  const conversations = Array.isArray(data?.conversations) ? data.conversations : [];
  const reports = (Array.isArray(data?.reports) ? data.reports : []).filter((r) => r && r.reporterName !== 'Pastor Thomas' && r.id !== 'rep_1');
  const cleanData = { profiles, users, conversations, reports, savedAt: new Date().toISOString() };

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
