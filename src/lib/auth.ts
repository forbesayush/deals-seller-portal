// lib/auth.ts — JWT helpers, bcrypt password security, and auth audit logging
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import type { NextApiRequest, NextApiResponse } from 'next';
import type { Db } from 'mongodb';

const JWT_SECRET = process.env.JWT_SECRET || 'deals-seller-default-secret-change-me';
const BCRYPT_ROUNDS = 12;

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}

// ── JWT helpers ──────────────────────────────────────────────────────────────

/** Returns JWT expiry string: 7 days for remember-me sessions, 8 hours standard. */
export function getJWTExpiry(rememberMe = false): string {
  return rememberMe ? '7d' : '8h';
}

export function signToken(payload: JWTPayload, rememberMe = false): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: getJWTExpiry(rememberMe) as jwt.SignOptions['expiresIn'],
  });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

export function getTokenFromRequest(req: NextApiRequest): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  // Also check cookies
  const cookieToken = req.cookies?.ds_token;
  if (cookieToken) return cookieToken;
  return null;
}

export function getCurrentUserFromRequest(req: NextApiRequest): JWTPayload | null {
  const token = getTokenFromRequest(req);
  if (!token) return null;
  return verifyToken(token);
}

export function requireAuth(
  handler: (req: NextApiRequest, res: NextApiResponse, user: JWTPayload) => Promise<void>
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const user = getCurrentUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ success: false, detail: 'Authentication required' });
    }
    return handler(req, res, user);
  };
}

export function requireAdmin(
  handler: (req: NextApiRequest, res: NextApiResponse, user: JWTPayload) => Promise<void>
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const user = getCurrentUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ success: false, detail: 'Authentication required' });
    }
    if (!['admin', 'super_admin', 'manager', 'auditor'].includes(user.role)) {
      return res.status(403).json({ success: false, detail: 'Admin access required' });
    }
    return handler(req, res, user);
  };
}

// ── Password security (bcrypt) ────────────────────────────────────────────────

/** Returns true if the string looks like a bcrypt hash (starts with $2a$ / $2b$). */
export function isBcryptHash(value: string): boolean {
  return /^\$2[ab]\$\d{2}\$/.test(value);
}

/** Hash a plaintext password with bcrypt. */
export async function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, BCRYPT_ROUNDS);
}

/**
 * Verify a password against the stored value.
 * Supports both bcrypt hashes and legacy plaintext (for auto-upgrade flow).
 * Returns { valid, needsUpgrade } where needsUpgrade=true means the DB record
 * should be replaced with a fresh bcrypt hash.
 */
export async function verifyPassword(
  plaintext: string,
  stored: string
): Promise<{ valid: boolean; needsUpgrade: boolean }> {
  if (isBcryptHash(stored)) {
    const valid = await bcrypt.compare(plaintext, stored);
    return { valid, needsUpgrade: false };
  }
  // Legacy plaintext comparison
  const valid = plaintext === stored.trim();
  return { valid, needsUpgrade: valid }; // upgrade only on successful match
}

// ── Secure token generation (password reset) ─────────────────────────────────

/** Generates a URL-safe 32-byte hex token for password reset links. */
export function genSecureToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/** Returns a SHA-256 hash of the token for safe DB storage. */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// ── Auth Event Audit Logger ──────────────────────────────────────────────────

export type AuthAction =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'ACCOUNT_LOCKED'
  | 'LOGOUT'
  | 'IDLE_LOGOUT'
  | 'PASSWORD_RESET_REQUEST'
  | 'PASSWORD_RESET_COMPLETE';

export interface AuthEventPayload {
  action: AuthAction;
  userId?: string | null;
  userEmail?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  detail?: string | null;
}

/**
 * Writes a structured auth event to the `auth_events` collection.
 * Never throws — failures are silently swallowed so they never break the login flow.
 */
export async function logAuthEvent(db: Db, payload: AuthEventPayload): Promise<void> {
  try {
    await db.collection('auth_events').insertOne({
      id: genId('AEV'),
      timestamp: nowISO(),
      ...payload,
    });
  } catch {
    // Never block auth flow due to logging failure
  }
}

// ── Simple ID / date generators ───────────────────────────────────────────────

export function genId(prefix: string): string {
  return prefix + Math.floor(Math.random() * 900000 + 100000);
}

export function nowISO(): string {
  return new Date().toISOString();
}

export function todayDate(): string {
  return new Date().toISOString().split('T')[0];
}

