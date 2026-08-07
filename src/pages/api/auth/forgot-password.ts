// pages/api/auth/forgot-password.ts — FR-05: Email-based password reset
import type { NextApiRequest, NextApiResponse } from 'next';
import { connectDB } from '@/lib/mongodb';
import { genSecureToken, hashToken, logAuthEvent, nowISO } from '@/lib/auth';

const RESET_EXPIRY_MINUTES = 30;

async function sendResetEmail(to: string, resetUrl: string): Promise<void> {
  // Configure via environment variables. Supports any SMTP provider.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const nodemailer = require('nodemailer');
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: `"deals.seller Security" <${process.env.SMTP_USER || 'noreply@deals.seller.com'}>`,
    to,
    subject: 'Password Reset Request — deals.seller Portal',
    html: `
      <div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#0f1117;color:#e2e8f0;border-radius:16px;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;">
          <div style="width:40px;height:40px;background:linear-gradient(135deg,#7c3aed,#3b82f6);border-radius:10px;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:14px;color:white;">DS</div>
          <div>
            <p style="font-weight:800;font-size:16px;margin:0;color:white;">deals.seller</p>
            <p style="font-size:11px;color:#64748b;margin:0;text-transform:uppercase;letter-spacing:0.1em;">Security Notice</p>
          </div>
        </div>
        <h1 style="font-size:22px;font-weight:800;color:white;margin-bottom:8px;">Reset your password</h1>
        <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin-bottom:24px;">
          We received a request to reset the password for your deals.seller account. Click the button below to create a new password. This link expires in <strong style="color:white;">${RESET_EXPIRY_MINUTES} minutes</strong>.
        </p>
        <a href="${resetUrl}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#3b82f6);color:white;font-weight:700;padding:14px 28px;border-radius:10px;text-decoration:none;font-size:14px;margin-bottom:24px;">
          Reset Password →
        </a>
        <p style="color:#475569;font-size:12px;line-height:1.6;border-top:1px solid #1e293b;padding-top:16px;margin-top:16px;">
          If you didn't request this, you can safely ignore this email. Your password won't change unless you click the link above.<br/><br/>
          For security, this link will expire at <strong style="color:#94a3b8;">${new Date(Date.now() + RESET_EXPIRY_MINUTES * 60 * 1000).toUTCString()}</strong>.
        </p>
      </div>
    `,
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ detail: 'Method not allowed' });

  const ip =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    'unknown';
  const userAgent = req.headers['user-agent'] || null;

  // Always respond with the same message regardless of whether email exists (security best practice)
  const SUCCESS_MSG = 'If that email address is registered, a reset link has been sent.';

  try {
    const { email } = req.body;
    const cleanEmail = (typeof email === 'string' ? email : '').trim().toLowerCase();
    if (!cleanEmail) {
      return res.status(400).json({ success: false, detail: 'Email address is required.' });
    }

    const db = await connectDB();
    const users = db.collection('users');
    const user = await users.findOne({ email: cleanEmail });

    if (!user) {
      // Do not reveal whether the email exists
      return res.status(200).json({ success: true, message: SUCCESS_MSG });
    }

    // Generate a secure reset token; store only the hash
    const rawToken = genSecureToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + RESET_EXPIRY_MINUTES * 60 * 1000);

    // Remove any existing reset tokens for this user
    await db.collection('password_resets').deleteMany({ userId: user.id });

    // Store hashed token
    await db.collection('password_resets').insertOne({
      tokenHash,
      userId: user.id,
      email: user.email,
      createdAt: nowISO(),
      expiresAt,
    });

    // Build reset URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `http://localhost:3000`;
    const resetUrl = `${baseUrl}/reset-password?token=${rawToken}`;

    // Send email (if SMTP is not configured, log the URL to server console in dev)
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      await sendResetEmail(user.email, resetUrl);
    } else {
      console.log(`[DEV] Password reset URL for ${user.email}: ${resetUrl}`);
    }

    // Audit log
    await logAuthEvent(db, {
      action: 'PASSWORD_RESET_REQUEST',
      userId: user.id,
      userEmail: user.email,
      ip,
      userAgent,
    });

    return res.status(200).json({ success: true, message: SUCCESS_MSG });
  } catch (err: any) {
    return res.status(500).json({ success: false, detail: 'Could not process request. Please try again.' });
  }
}
