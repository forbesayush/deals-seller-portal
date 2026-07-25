// pages/api/auth/login.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getCollection } from '@/lib/mongodb';
import { connectDB } from '@/lib/mongodb';
import { seedDatabase } from '@/lib/seed';
import { signToken, genId, todayDate, nowISO } from '@/lib/auth';

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
    const user = await users.findOne({
      $or: [
        { email: cleanId },
        { mobile: { $regex: digits.slice(-7), $options: 'i' } },
      ],
    });

    if (!user || user.password.trim() !== cleanPass) {
      return res.status(401).json({ success: false, detail: 'Invalid credentials.' });
    }
    if (user.status === 'suspended') {
      return res.status(403).json({ success: false, detail: 'Account suspended.' });
    }

    const token = signToken({ userId: user.id, email: user.email, role: user.role });

    // Set cookie
    res.setHeader('Set-Cookie', `ds_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`);
    return res.status(200).json({ success: true, token, message: 'Login successful' });
  } catch (err: any) {
    return res.status(500).json({ success: false, detail: err.message });
  }
}
