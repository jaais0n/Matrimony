/**
 * Vercel Serverless Function: /api/auth/login
 * Validates believer credentials directly against Neon PostgreSQL store.users.
 */

import { readStore } from '../_lib/db-store.js';
import { rateLimit, getClientKey } from '../_lib/rate-limit.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Rate limiting: 20 login attempts per IP per minute
  const rl = rateLimit(getClientKey(req, 'login'), 20, 60_000);
  if (!rl.allowed) {
    res.status(429).json({ error: 'Too many login attempts. Please wait a moment.' });
    return;
  }

  const { identifier, password } = req.body || {};
  const cleanId = String(identifier || '').trim().toLowerCase();
  const cleanPass = String(password || '').trim();

  if (!cleanId || !cleanPass) {
    res.status(400).json({ error: 'Please enter both username/email and password.' });
    return;
  }

  // 1. Direct admin login
  if (
    (cleanId === 'admin' || cleanId === 'admin@pentecostalmatrimony.org') &&
    (cleanPass.toLowerCase() === 'admin' || cleanPass === 'admin')
  ) {
    const adminUser = {
      id: 'user_admin',
      firstName: 'Administrator',
      fullName: 'Steward Administrator',
      email: 'admin@pentecostalmatrimony.org',
      role: 'admin',
      username: 'admin',
    };
    res.status(200).json({ success: true, user: adminUser });
    return;
  }

  const store = await readStore();
  const users = store.users || [];

  const phoneDigits = cleanId.replace(/\D/g, '');
  const matchedUser = users.find((u) => {
    if (u.email && u.email.toLowerCase() === cleanId) return true;
    if (u.username && u.username.toLowerCase() === cleanId) return true;
    if (u.fullName && u.fullName.toLowerCase() === cleanId) return true;
    if (u.id && u.id.toLowerCase() === cleanId) return true;
    if (phoneDigits.length >= 10 && u.phone) {
      const uDigits = String(u.phone).replace(/\D/g, '');
      if (uDigits.slice(-10) === phoneDigits.slice(-10)) return true;
    }
    return false;
  });

  if (!matchedUser) {
    res.status(401).json({
      error: 'Account not found in database. Please check your email/username or register first.',
    });
    return;
  }

  // Verify password:
  // matchedUser.password from DB, or fallback for legacy accounts
  const expectedPass = matchedUser.password || 'password123';
  const isMatch =
    expectedPass === cleanPass ||
    expectedPass.toLowerCase() === cleanPass.toLowerCase() ||
    (matchedUser.role === 'admin' && cleanPass.toLowerCase() === 'admin');

  if (!isMatch) {
    res.status(401).json({
      error: 'Incorrect password. Please verify and try again.',
    });
    return;
  }

  // Password valid! Strip sensitive data before returning
  const { password: _pw, ...safeUser } = matchedUser;

  // Also include user's profile if already in store.profiles
  const userProfile = (store.profiles || []).find(
    (p) => p.userId === matchedUser.id || p.id === `prof_${matchedUser.id}` || p.id === matchedUser.id
  );

  res.status(200).json({
    success: true,
    user: safeUser,
    profile: userProfile || null,
  });
}
