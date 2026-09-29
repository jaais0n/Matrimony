import { readStore } from './_lib/db-store.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  let storeProfilesCount = 0;
  let storeUsersCount = 0;
  let statusOk = true;

  try {
    const store = await readStore();
    storeProfilesCount = store.profiles ? store.profiles.length : 0;
    storeUsersCount = store.users ? store.users.length : 0;
  } catch (e) {
    statusOk = false;
  }

  let dbError = null;
  let dbRows = null;
  let dbHost = null;

  try {
    const connStr = process.env.DATABASE_URL;
    if (!connStr) throw new Error('DATABASE_URL not configured');
    const url = new URL(connStr);
    dbHost = url.hostname;
    const neonEndpoint = `https://${url.hostname}/sql`;
    const response = await fetch(neonEndpoint, {
      method: 'POST',
      headers: {
        'Neon-Connection-String': connStr,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: 'SELECT data FROM pm_store WHERE key = $1', params: ['store_main'] }),
    });
    if (!response.ok) {
      dbError = `HTTP ${response.status}: ${await response.text()}`;
    } else {
      const data = await response.json();
      dbRows = data?.rows?.length || 0;
    }
  } catch (err) {
    // Log internally, never expose raw message to clients
    console.error('[status] DB probe error:', err.message);
    dbError = true;
  }

  res.status(200).json({
    status: statusOk ? 'ok' : 'degraded',
    serverless: true,
    dbConnected: !dbError,
    storageEngine: 'neon-postgresql',
    profilesCount: storeProfilesCount,
    usersCount: storeUsersCount,
    dbRows,
    // dbError intentionally omitted from client response to prevent information disclosure
    timestamp: new Date().toISOString(),
  });
}
