/**
 * Vercel Serverless Function: /api/auth/subscribe
 * Activates Indian Rupee membership plans (Free, Premium, Elite) and persists
 * transaction audit & VIP quota upgrades in Neon PostgreSQL.
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

  // Rate limiting: 30 subscription requests per IP per minute
  const rl = rateLimit(getClientKey(req, 'subscribe'), 30, 60_000);
  if (!rl.allowed) {
    res.status(429).json({ error: 'Too many requests. Please wait a moment.' });
    return;
  }

  const { userId, userEmail, planId, planName, amount, paymentMethod, paymentId } = req.body || {};
  if (!planId) {
    res.status(400).json({ error: 'Plan ID is required' });
    return;
  }

  const store = await readStore();
  store.users = store.users || [];
  store.profiles = store.profiles || [];
  store.subscriptions = store.subscriptions || [];

  const cleanUser = String(userId || '').trim().toLowerCase();
  const cleanEmail = String(userEmail || '').trim().toLowerCase();

  const userIdx = store.users.findIndex((u) => {
    if (cleanUser && String(u.id).toLowerCase() === cleanUser) return true;
    if (cleanEmail && String(u.email || '').toLowerCase() === cleanEmail) return true;
    return false;
  });

  const now = new Date();
  const durationMonths =
    planId === 'elite' || planId === 'year1'
      ? 12
      : planId === 'premium' || planId === 'month3'
      ? 3
      : planId === 'starter' || planId === 'month1'
      ? 1
      : 0;
  const expiresAt = new Date(now.getTime() + (durationMonths || 120) * 30 * 24 * 60 * 60 * 1000).toISOString();
  const resolvedPlanName =
    planName ||
    (planId === 'elite' || planId === 'year1'
      ? '1 Year VIP Steward'
      : planId === 'premium' || planId === 'month3'
      ? '3 Months Pro'
      : planId === 'starter' || planId === 'month1'
      ? '1 Month Starter'
      : 'Basic Fellowship');

  let updatedUser = null;
  if (userIdx >= 0) {
    store.users[userIdx].plan = resolvedPlanName;
    store.users[userIdx].planTier = planId;
    store.users[userIdx].isVip = planId === 'starter' || planId === 'premium' || planId === 'elite';
    store.users[userIdx].interestsRemaining = planId === 'free' ? 10 : 9999;
    store.users[userIdx].planSubscribedAt = now.toISOString();
    store.users[userIdx].planExpiresAt = expiresAt;
    updatedUser = store.users[userIdx];
  }

  // Update profile if exists
  const profIdx = store.profiles.findIndex((p) => {
    if (cleanUser && (String(p.userId).toLowerCase() === cleanUser || String(p.id).toLowerCase() === cleanUser)) return true;
    if (cleanEmail && String(p.email || '').toLowerCase() === cleanEmail) return true;
    return false;
  });

  if (profIdx >= 0) {
    store.profiles[profIdx].plan = planId;
    store.profiles[profIdx].isVip = planId === 'starter' || planId === 'premium' || planId === 'elite';
    store.profiles[profIdx].vipBadge =
      planId === 'elite' ? 'VIP Steward' : planId === 'premium' ? 'Premium' : planId === 'starter' ? 'Starter' : undefined;
  }

  // Record transaction audit
  const defaultAmount =
    planId === 'elite' || planId === 'year1'
      ? 9999
      : planId === 'premium' || planId === 'month3'
      ? 3999
      : planId === 'starter' || planId === 'month1'
      ? 799
      : 0;

  const transaction = {
    id: `txn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    userId: cleanUser || cleanEmail || 'guest',
    userEmail: cleanEmail || (updatedUser ? updatedUser.email : ''),
    planId,
    planName: resolvedPlanName,
    amount: amount ?? defaultAmount,
    currency: 'INR',
    paymentMethod: paymentMethod || 'UPI',
    paymentId: paymentId || `pay_${Date.now()}`,
    status: 'success',
    timestamp: now.toISOString(),
    expiresAt,
  };

  store.subscriptions.push(transaction);

  await writeStore(store);

  const safeUser = updatedUser ? (({ password: _pw, ...u }) => u)(updatedUser) : null;
  res.status(200).json({
    success: true,
    user: safeUser,
    transaction,
  });
}
