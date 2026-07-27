// pages/api/auth/login.ts — Single Admin Login Route
import type { NextApiRequest, NextApiResponse } from 'next';
import { connectDB } from '@/lib/mongodb';
import { seedDatabase } from '@/lib/seed';
import { signToken } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ detail: 'Method not allowed' });

  try {
    const db = await connectDB();
    await seedDatabase(db); // Guarantees legacy admins are deleted & single admin exists

    const { identifier, password } = req.body;
    const cleanId = (typeof identifier === 'string' ? identifier : '').trim().toLowerCase();
    const cleanPass = (typeof password === 'string' ? password : '').trim();

    const users = db.collection('users');
    let user: any = null;

    // 1. Single Admin Alias Match
    if (cleanId === 'admin' || cleanId === 'administrator' || cleanId === 'admin@deals.seller.com') {
      user = await users.findOne({ email: 'admin@deals.seller.com' });
    }

    // 2. Exact Buyer Login Matches (email, mobile, id, referral)
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
