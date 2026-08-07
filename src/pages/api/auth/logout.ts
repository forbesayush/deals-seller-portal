// pages/api/auth/logout.ts — Server-side token invalidation + audit log
import type { NextApiRequest, NextApiResponse } from 'next';
import { connectDB } from '@/lib/mongodb';
import { getTokenFromRequest, verifyToken, logAuthEvent, nowISO } from '@/lib/auth';

function getIP(req: NextApiRequest): string {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ detail: 'Method not allowed' });
  }

  const ip = getIP(req);
  const userAgent = req.headers['user-agent'] || null;
  const token = getTokenFromRequest(req);

  try {
    const db = await connectDB();

    // Blacklist the token server-side so it's invalidated even if cookie persists
    if (token) {
      const session = verifyToken(token);

      // Compute token expiry: read exp from JWT payload
      let expiry: Date;
      try {
        const decoded: any = require('jsonwebtoken').decode(token);
        expiry = decoded?.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 7 * 24 * 3600 * 1000);
      } catch {
        expiry = new Date(Date.now() + 7 * 24 * 3600 * 1000);
      }

      // Insert token into blacklist (MongoDB TTL index auto-removes expired entries)
      try {
        await db.collection('token_blacklist').insertOne({
          token,
          userId: session?.userId || null,
          invalidatedAt: nowISO(),
          expiry,
        });
      } catch {
        // If duplicate key (token already blacklisted), ignore
      }

      // Write audit log
      await logAuthEvent(db, {
        action: 'LOGOUT',
        userId: session?.userId || null,
        userEmail: session?.email || null,
        ip,
        userAgent,
        detail: 'User-initiated logout. Session token invalidated server-side.',
      });
    }
  } catch {
    // Logging/blacklisting errors must never prevent the client from logging out
  }

  // Always clear cookie regardless of DB outcome
  res.setHeader('Set-Cookie', 'ds_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
  return res.status(200).json({ success: true, message: 'You have been logged out.' });
}
