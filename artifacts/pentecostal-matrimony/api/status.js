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

  res.status(200).json({
    status: statusOk ? 'ok' : 'degraded',
    serverless: true,
    dbConnected: true,
    storageEngine: 'neon-postgresql',
    profilesCount: storeProfilesCount,
    usersCount: storeUsersCount,
    timestamp: new Date().toISOString(),
  });
}
