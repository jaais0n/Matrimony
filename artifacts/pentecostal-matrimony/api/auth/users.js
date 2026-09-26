/**
 * Vercel Serverless Function: /api/auth/users
 * Returns registered accounts for cross-device authentication.
 */

import { get, list } from '@vercel/blob';

import fs from 'fs';
import path from 'path';

function getFallbackUsers() {
  try {
    const candidatePaths = [
      path.join(process.cwd(), 'api', 'default-store.json'),
      path.join(process.cwd(), 'artifacts', 'pentecostal-matrimony', 'api', 'default-store.json'),
      path.join(process.cwd(), 'artifacts', 'api-server', 'data', 'store.json'),
    ];
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.users) && parsed.users.length > 0) {
          return parsed.users;
        }
      }
    }
  } catch {}
  return [];
}

async function readStore() {
  try {
    const { blobs } = await list({ prefix: 'pm-profiles-store' });
    if (!blobs || blobs.length === 0) return { profiles: [], users: getFallbackUsers() };
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

    const users = Array.isArray(data?.users) && data.users.length > 0 ? data.users : getFallbackUsers();
    return { profiles: Array.isArray(data?.profiles) ? data.profiles : [], users };
  } catch (err) {
    console.error('readStore error in auth/users', err);
    return { profiles: [], users: getFallbackUsers() };
  }
}


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
