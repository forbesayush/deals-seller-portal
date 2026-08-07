// pages/api/auth/login.ts — Full PRD-compliant Login Route
import type { NextApiRequest, NextApiResponse } from 'next';
import { connectDB } from '@/lib/mongodb';
import { seedDatabase } from '@/lib/seed';
import { signToken, verifyPassword, hashPassword, logAuthEvent, nowISO } from '@/lib/auth';

const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const LOCKOUT_MS = LOCKOUT_MINUTES * 60 * 1000;

function getIP(req: NextApiRequest): string {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ detail: 'Method not allowed' });

  const ip = getIP(req);
  const userAgent = req.headers['user-agent'] || null;

  try {
    const db = await connectDB();
    await seedDatabase(db);

    const { identifier, password, rememberMe = false } = req.body;
    const cleanId = (typeof identifier === 'string' ? identifier : '').trim().toLowerCase();
    const cleanPass = (typeof password === 'string' ? password : '').trim();

    if (!cleanId || !cleanPass) {
      return res.status(400).json({ success: false, detail: 'Please enter your credentials.' });
    }

    // ── 1. Check login attempt lockout ──────────────────────────────────────
    const loginAttempts = db.collection('login_attempts');
    const attemptKey = { identifier: cleanId, ip };
    const attemptDoc = await loginAttempts.findOne(attemptKey);

    if (attemptDoc?.lockedUntil && new Date(attemptDoc.lockedUntil) > new Date()) {
      const remainMs = new Date(attemptDoc.lockedUntil).getTime() - Date.now();
      const remainMin = Math.ceil(remainMs / 60000);
      await logAuthEvent(db, {
        action: 'ACCOUNT_LOCKED',
        userId: null,
        userEmail: cleanId,
        ip,
        userAgent,
        detail: `Attempted login while locked. ${remainMin} min remaining.`,
      });
      return res.status(429).json({
        success: false,
        locked: true,
        remainingMinutes: remainMin,
        detail: `Account is temporarily locked due to too many failed attempts. Try again in ${remainMin} minute${remainMin !== 1 ? 's' : ''}.`,
      });
    }

    // ── 2. Resolve user from DB ──────────────────────────────────────────────
    const users = db.collection('users');
    let user: any = null;

    // Single Admin Alias Match
    if (cleanId === 'admin' || cleanId === 'administrator' || cleanId === 'admin@deals.seller.com') {
      user = await users.findOne({ email: 'admin@deals.seller.com' });
    }

    // Exact Buyer Login Matches (email, mobile, id, referral)
    if (!user) {
      const digits = cleanId.replace(/\D/g, '');
      const exactRegex = new RegExp(`^${cleanId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
      user = await users.findOne({
        $or: [
          { email: exactRegex },
          { name: exactRegex },
          { id: cleanId.toUpperCase() },
          { referral: cleanId.toUpperCase() },
          ...(digits.length >= 7 ? [{ mobile: digits }] : []),
          ...(digits.length >= 7 ? [{ mobile: { $regex: digits.slice(-10) } }] : []),
        ],
      });
    }

    // ── 3. Verify password ───────────────────────────────────────────────────
    const { valid, needsUpgrade } = user
      ? await verifyPassword(cleanPass, user.password)
      : { valid: false, needsUpgrade: false };

    if (!user || !valid) {
      // Record failed attempt
      const now = new Date();
      const currentAttempts = (attemptDoc?.count || 0) + 1;
      const shouldLock = currentAttempts >= MAX_ATTEMPTS;
      const lockedUntil = shouldLock ? new Date(now.getTime() + LOCKOUT_MS).toISOString() : null;

      await loginAttempts.updateOne(
        attemptKey,
        {
          $set: {
            identifier: cleanId,
            ip,
            count: currentAttempts,
            lastAttemptAt: now.toISOString(),
            ...(lockedUntil ? { lockedUntil } : {}),
          },
        },
        { upsert: true }
      );

      await logAuthEvent(db, {
        action: shouldLock ? 'ACCOUNT_LOCKED' : 'LOGIN_FAILED',
        userId: user?.id || null,
        userEmail: cleanId,
        ip,
        userAgent,
        detail: shouldLock
          ? `Locked after ${MAX_ATTEMPTS} failed attempts.`
          : `Failed attempt ${currentAttempts}/${MAX_ATTEMPTS}.`,
      });

      if (shouldLock) {
        return res.status(429).json({
          success: false,
          locked: true,
          remainingMinutes: LOCKOUT_MINUTES,
          detail: `Too many failed attempts. Account locked for ${LOCKOUT_MINUTES} minutes.`,
        });
      }

      const attemptsLeft = MAX_ATTEMPTS - currentAttempts;
      return res.status(401).json({
        success: false,
        detail: `Invalid credentials. ${attemptsLeft} attempt${attemptsLeft !== 1 ? 's' : ''} remaining before lockout.`,
      });
    }

    // ── 4. Check account status ──────────────────────────────────────────────
    if (user.status === 'suspended') {
      await logAuthEvent(db, {
        action: 'LOGIN_FAILED',
        userId: user.id,
        userEmail: user.email,
        ip,
        userAgent,
        detail: 'Account suspended.',
      });
      return res.status(403).json({ success: false, detail: 'Account suspended. Contact support.' });
    }

    // ── 5. Successful login — clear attempts, auto-upgrade password ──────────
    await loginAttempts.deleteOne(attemptKey);

    if (needsUpgrade) {
      // Transparently upgrade plaintext → bcrypt on first successful login
      const hashed = await hashPassword(cleanPass);
      await users.updateOne({ id: user.id }, { $set: { password: hashed } });
    }

    const isRememberMe = !!rememberMe;
    const token = signToken({ userId: user.id, email: user.email, role: user.role }, isRememberMe);

    // Audit log the successful login
    await logAuthEvent(db, {
      action: 'LOGIN_SUCCESS',
      userId: user.id,
      userEmail: user.email,
      ip,
      userAgent,
      detail: isRememberMe ? 'Remember-me session (7d)' : 'Standard session (8h)',
    });

    const maxAge = isRememberMe ? 604800 : 28800; // 7d or 8h in seconds
    res.setHeader('Set-Cookie', `ds_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`);

    const { password: _pw, _id, ...safeUser } = user as any;
    return res.status(200).json({ success: true, token, user: safeUser, message: 'Login successful' });
  } catch (err: any) {
    return res.status(500).json({ success: false, detail: err.message });
  }
}
