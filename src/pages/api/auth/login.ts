// pages/api/auth/login.ts — Enhanced Authentication Route (Supports email, mobile, username, and admin alias)
import type { NextApiRequest, NextApiResponse } from 'next';
import { connectDB } from '@/lib/mongodb';
import { seedDatabase } from '@/lib/seed';
import { signToken } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ detail: 'Method not allowed' });

  try {
    const db = await connectDB();
    await seedDatabase(db);

    const { identifier, password } = req.body;
    const cleanId = (typeof identifier === 'string' ? identifier : '').trim().toLowerCase();
    const cleanPass = (typeof password === 'string' ? password : '').trim();
    const digits = cleanId.replace(/\D/g, '');

    const users = db.collection('users');
    const idEscaped = cleanId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const idRegex = new RegExp(`^${idEscaped}`, 'i');

    let user = await users.findOne({
      $or: [
        { email: cleanId },
        { email: idRegex },
        { referral: { $regex: cleanId, $options: 'i' } },
        ...(digits.length >= 7 ? [{ mobile: { $regex: digits.slice(-7), $options: 'i' } }] : []),
      ],
    });

    // Fallback: Support typing 'admin' or 'owner' as username
    if (!user && (cleanId === 'admin' || cleanId === 'administrator')) {
      user = await users.findOne({ email: 'admin@deals.seller.com' });
    } else if (!user && cleanId === 'owner') {
      user = await users.findOne({ email: 'owner@deals.seller.com' });
    } else if (!user && cleanId === 'ekta') {
      user = await users.findOne({ email: 'ekta@deals.seller.com' });
    }

    if (!user || user.password.trim() !== cleanPass) {
      return res.status(401).json({ success: false, detail: 'Invalid credentials. Please check email/username & password.' });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({ success: false, detail: 'Account suspended.' });
    }

    const token = signToken({ userId: user.id, email: user.email, role: user.role });

    // Set cookie & return token
    res.setHeader('Set-Cookie', `ds_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`);
    return res.status(200).json({ success: true, token, user, message: 'Login successful' });
  } catch (err: any) {
    return res.status(500).json({ success: false, detail: err.message });
  }
}
