/**
 * Vercel Serverless Function: /api/auth/register
 * Persists registered accounts across devices backed by Neon PostgreSQL.
 * Enforces:
 * 1. Unique separate User ID for every user
 * 2. Unique Email constraint (multiple accounts with same Gmail/email prohibited)
 * 3. Unique Phone Number constraint (multiple accounts with same phone number prohibited)
 */

import { readStore, writeStore } from '../_lib/db-store.js';
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

  // Rate limiting: max 10 registrations per IP per minute
  const rl = rateLimit(getClientKey(req, 'register'), 10, 60_000);
  if (!rl.allowed) {
    res.status(429).json({ error: 'Too many requests. Please wait before registering again.' });
    return;
  }

  const account = req.body;
  if (!account || !account.email) {
    res.status(400).json({ error: 'Email is required' });
    return;
  }

  const store = await readStore();
  const users = store.users || [];
  const emailClean = String(account.email).trim().toLowerCase();

  // 1. Enforce Unique Email Constraint
  const existingEmailIdx = users.findIndex(u => u.email?.toLowerCase() === emailClean);
  if (existingEmailIdx >= 0) {
    const existing = users[existingEmailIdx];
    // If different user ID or explicitly marked as new registration
    if (account.isNewRegistration || (account.id && existing.id !== account.id)) {
      res.status(409).json({
        error: `An account with the email "${emailClean}" already exists. Multiple accounts with the same Gmail/email are not allowed.`,
      });
      return;
    }
  }

  // 2. Enforce Unique Phone Number Constraint
  const rawPhone = account.phone ? String(account.phone).trim() : '';
  const phoneDigits = rawPhone.replace(/\D/g, '');
  if (phoneDigits.length >= 10) {
    const existingPhoneUser = users.find(u => {
      const uPhone = String(u.phone || '').replace(/\D/g, '');
      if (!uPhone || uPhone.length < 10) return false;
      const isMatch = uPhone.slice(-10) === phoneDigits.slice(-10);
      return isMatch && (!account.id || u.id !== account.id);
    });

    if (existingPhoneUser) {
      res.status(409).json({
        error: `The phone number "${rawPhone}" is already registered to another account. Multiple accounts with the same phone number are not allowed.`,
      });
      return;
    }
  }

  // 3. Guarantee separate unique user ID
  const uniqueId = account.id || `user_${emailClean.split('@')[0].replace(/[^a-z0-9]/g, '')}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;

  const newUser = {
    id: uniqueId,
    email: emailClean,
    phone: rawPhone || undefined,
    fullName: account.fullName || (emailClean.includes('@') ? emailClean.split('@')[0] : emailClean),
    firstName: account.firstName || account.fullName?.split(' ')[0] || 'Member',
    password: account.password || undefined, // never store plaintext default; missing means no auth
    role: account.role || 'member',
    createdAt: account.createdAt || new Date().toISOString(),
  };

  if (existingEmailIdx >= 0) {
    store.users[existingEmailIdx] = { ...store.users[existingEmailIdx], ...newUser };
  } else {
    store.users.push(newUser);
  }

  await writeStore(store);
  // Strip password from response — never return credentials to the client
  const { password: _pw, ...safeUser } = newUser;
  res.status(200).json(safeUser);
}
