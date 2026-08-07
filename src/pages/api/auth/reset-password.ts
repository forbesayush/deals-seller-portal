// pages/api/auth/reset-password.ts — FR-05: Validate reset token and set new password
import type { NextApiRequest, NextApiResponse } from 'next';
import { connectDB } from '@/lib/mongodb';
import { hashToken, hashPassword, logAuthEvent, nowISO } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ detail: 'Method not allowed' });

  const ip =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    'unknown';
  const userAgent = req.headers['user-agent'] || null;

  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ success: false, detail: 'Token and new password are required.' });
    }

    const cleanPassword = (typeof newPassword === 'string' ? newPassword : '').trim();
    if (cleanPassword.length < 8) {
      return res.status(400).json({ success: false, detail: 'Password must be at least 8 characters.' });
    }

    const db = await connectDB();
    const tokenHash = hashToken(token);

    // Find the reset record
    const resetDoc = await db.collection('password_resets').findOne({ tokenHash });

    if (!resetDoc) {
      return res.status(400).json({ success: false, detail: 'Invalid or expired reset link.' });
    }

    // Check expiry
    if (new Date(resetDoc.expiresAt) < new Date()) {
      await db.collection('password_resets').deleteOne({ tokenHash });
      return res.status(400).json({ success: false, detail: 'This reset link has expired. Please request a new one.' });
    }

    // Hash the new password and update the user
    const hashed = await hashPassword(cleanPassword);
    const updateResult = await db.collection('users').updateOne(
      { id: resetDoc.userId },
      { $set: { password: hashed } }
    );

    if (updateResult.matchedCount === 0) {
      return res.status(404).json({ success: false, detail: 'User not found.' });
    }

    // Invalidate the used reset token
    await db.collection('password_resets').deleteOne({ tokenHash });

    // Audit log
    await logAuthEvent(db, {
      action: 'PASSWORD_RESET_COMPLETE',
      userId: resetDoc.userId,
      userEmail: resetDoc.email,
      ip,
      userAgent,
      detail: 'Password successfully reset via email link.',
    });

    return res.status(200).json({ success: true, message: 'Password updated successfully. Please sign in with your new password.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, detail: 'Could not reset password. Please try again.' });
  }
}
