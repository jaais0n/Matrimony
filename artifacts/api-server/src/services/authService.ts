/**
 * Authentication Service
 * Supports Email/Password, OTP-ready phone authentication, secure password hashing, and JWT tokens.
 */

import crypto from 'crypto';

export interface UserPayload {
  id: string;
  email?: string;
  phone?: string;
  role: 'user' | 'admin' | 'moderator';
}

export class AuthService {
  private secretKey: string;

  constructor() {
    this.secretKey = process.env.JWT_SECRET || 'pentecostal_matrimony_secret_jwt_key_2026';
  }

  hashPassword(password: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
  }

  verifyPassword(password: string, storedHash: string): boolean {
    const [salt, originalHash] = storedHash.split(':');
    if (!salt || !originalHash) return false;
    const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(originalHash, 'hex'), Buffer.from(verifyHash, 'hex'));
  }

  generateToken(user: UserPayload): string {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const exp = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60); // 30 days
    const payload = Buffer.from(JSON.stringify({ ...user, exp })).toString('base64url');
    const signature = crypto
      .createHmac('sha256', this.secretKey)
      .update(`${header}.${payload}`)
      .digest('base64url');
    return `${header}.${payload}.${signature}`;
  }

  verifyToken(token: string): UserPayload | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const [header, payload, signature] = parts;
      const expectedSignature = crypto
        .createHmac('sha256', this.secretKey)
        .update(`${header}.${payload}`)
        .digest('base64url');
      if (signature !== expectedSignature) return null;

      const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
      if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
        return null; // Expired
      }
      return {
        id: decoded.id,
        email: decoded.email,
        phone: decoded.phone,
        role: decoded.role || 'user',
      };
    } catch {
      return null;
    }
  }

  generateOtp(): { code: string; expiresAt: Date } {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    return { code, expiresAt };
  }
}

export const authService = new AuthService();
