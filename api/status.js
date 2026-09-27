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
    const connStr = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_lksoYRUjhS54@ep-morning-breeze-azc2ysa2-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
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
    dbError = err.message;
  }

  res.status(200).json({
    status: statusOk ? 'ok' : 'degraded',
    serverless: true,
    dbConnected: true,
    storageEngine: 'neon-postgresql',
    profilesCount: storeProfilesCount,
    usersCount: storeUsersCount,
    dbHost,
    dbRows,
    dbError,
    timestamp: new Date().toISOString(),
  });
}
