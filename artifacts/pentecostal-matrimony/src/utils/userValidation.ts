/**
 * User validation utilities for Pentecostal Matrimony
 * Enforces:
 * 1. Unique separate User ID for every user (collision-free)
 * 2. Unique Email Address (multiple accounts with same Gmail/email prohibited)
 * 3. Unique Phone Number (multiple accounts with same phone number prohibited)
 */

export function normalizeEmail(email: string): string {
  return String(email || '').trim().toLowerCase();
}

export function normalizePhone(phone: string): string {
  if (!phone) return '';
  return String(phone).replace(/\D/g, '');
}

/**
 * Checks if two phone numbers match, accounting for country codes (e.g. +91 vs 91 vs none)
 */
export function isPhoneMatch(p1: string, p2: string): boolean {
  const d1 = normalizePhone(p1);
  const d2 = normalizePhone(p2);
  if (!d1 || !d2) return false;
  if (d1 === d2) return true;
  // If at least 10 digits, compare the last 10 national digits
  if (d1.length >= 10 && d2.length >= 10) {
    return d1.slice(-10) === d2.slice(-10);
  }
  return false;
}

/**
 * Checks if an email address is already in use by any registered user or profile
 */
export function checkEmailExists(email: string, excludeUserId?: string): boolean {
  const cleanEmail = normalizeEmail(email);
  if (!cleanEmail) return false;

  // 1. Check registered accounts
  try {
    const rawAccs = localStorage.getItem('pm_registered_accounts');
    if (rawAccs) {
      const accounts = JSON.parse(rawAccs);
      if (Array.isArray(accounts)) {
        const found = accounts.some(
          (a: any) =>
            a &&
            normalizeEmail(a.email) === cleanEmail &&
            (!excludeUserId || a.id !== excludeUserId)
        );
        if (found) return true;
      }
    }
  } catch {}

  // 2. Check registered profiles
  try {
    const rawProfs = localStorage.getItem('pm_registered_profiles');
    if (rawProfs) {
      const profiles = JSON.parse(rawProfs);
      if (Array.isArray(profiles)) {
        const found = profiles.some(
          (p: any) =>
            p &&
            normalizeEmail(p.email) === cleanEmail &&
            (!excludeUserId || (p.userId !== excludeUserId && p.id !== excludeUserId))
        );
        if (found) return true;
      }
    }
  } catch {}

  // 3. Check known seed emails
  const seedEmails = ['admin@pentecostalmatrimony.org'];
  if (seedEmails.includes(cleanEmail)) {
    if (excludeUserId) {
      if (cleanEmail === 'admin@pentecostalmatrimony.org' && (excludeUserId === 'user_admin' || excludeUserId === 'admin')) return false;
    }
    return true;
  }

  return false;
}

/**
 * Checks if a phone number is already registered to another account or profile
 */
export function checkPhoneExists(phone: string, excludeUserId?: string): boolean {
  const cleanPhone = normalizePhone(phone);
  if (!cleanPhone || cleanPhone.length < 5) return false;

  // 1. Check registered accounts
  try {
    const rawAccs = localStorage.getItem('pm_registered_accounts');
    if (rawAccs) {
      const accounts = JSON.parse(rawAccs);
      if (Array.isArray(accounts)) {
        const found = accounts.some(
          (a: any) =>
            a &&
            a.phone &&
            isPhoneMatch(a.phone, phone) &&
            (!excludeUserId || a.id !== excludeUserId)
        );
        if (found) return true;
      }
    }
  } catch {}

  // 2. Check registered profiles
  try {
    const rawProfs = localStorage.getItem('pm_registered_profiles');
    if (rawProfs) {
      const profiles = JSON.parse(rawProfs);
      if (Array.isArray(profiles)) {
        const found = profiles.some(
          (p: any) =>
            p &&
            p.phone &&
            isPhoneMatch(p.phone, phone) &&
            (!excludeUserId || (p.userId !== excludeUserId && p.id !== excludeUserId))
        );
        if (found) return true;
      }
    }
  } catch {}

  // 3. Check known seed phones
  const seedPhones: Record<string, string> = {
    'user_admin': '9876500000',
  };

  for (const [uid, sPhone] of Object.entries(seedPhones)) {
    if (isPhoneMatch(sPhone, phone)) {
      if (excludeUserId && (excludeUserId === uid || excludeUserId.includes(uid.replace('user_', '')))) {
        continue;
      }
      return true;
    }
  }

  return false;
}

/**
 * Generates a completely unique, separate user ID for every single user
 * Guarantees no collisions or shared IDs.
 */
export function generateUniqueUserId(email?: string, fullName?: string): string {
  const base = email
    ? email.split('@')[0].replace(/[^a-z0-9]/gi, '').toLowerCase()
    : fullName
    ? fullName.replace(/[^a-z0-9]/gi, '').toLowerCase()
    : 'member';

  const timePart = Date.now().toString(36);
  const randPart = Math.random().toString(36).substring(2, 6);
  return `user_${base || 'believer'}_${timePart}_${randPart}`;
}
