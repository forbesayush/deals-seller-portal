// lib/auth.ts — JWT helpers for API route authentication
import jwt from 'jsonwebtoken';
import type { NextApiRequest, NextApiResponse } from 'next';

const JWT_SECRET = process.env.JWT_SECRET || 'deals-seller-default-secret-change-me';
const JWT_EXPIRES = '7d';

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}

export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
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

// Simple ID generators
export function genId(prefix: string): string {
  return prefix + Math.floor(Math.random() * 900000 + 100000);
}

export function nowISO(): string {
  return new Date().toISOString();
}

export function todayDate(): string {
  return new Date().toISOString().split('T')[0];
}
