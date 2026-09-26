/**
 * Vercel Serverless Function: /api/auth/users
 * Returns registered accounts backed by Neon PostgreSQL.
 */

import { readStore } from '../_lib/db-store.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const store = await readStore();
  res.status(200).json(store.users || []);
}
