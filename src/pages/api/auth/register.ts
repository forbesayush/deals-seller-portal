// pages/api/auth/register.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { connectDB } from '@/lib/mongodb';
import { seedDatabase } from '@/lib/seed';
import { signToken, genId, todayDate, nowISO } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ detail: 'Method not allowed' });

  try {
    const db = await connectDB();
    await seedDatabase(db);

    const { name, email, mobile, password, referralCode } = req.body;
    const cleanEmail = (typeof email === 'string' ? email : '').trim().toLowerCase();
    const cleanName = (typeof name === 'string' ? name : '').trim();
    const cleanPass = (typeof password === 'string' ? password : '').trim();
    const cleanMobile = (typeof mobile === 'string' ? mobile : '').trim();

    if (!cleanEmail || !cleanName || !cleanPass) {
      return res.status(400).json({ success: false, detail: 'Name, email and password are required.' });
    }

    const users = db.collection('users');
    const exists = await users.findOne({ email: cleanEmail });
    if (exists) {
      return res.status(400).json({ success: false, detail: 'An account with this email already exists.' });
    }

    const userId = genId('USR');
    const referral = (cleanName.slice(0, 4).toUpperCase().replace(/[^A-Z]/g, '') || 'USER') + Math.floor(Math.random() * 900 + 100);
    const newUser = {
      id: userId, name: cleanName, email: cleanEmail, mobile: cleanMobile || null,
      password: cleanPass, role: 'buyer', status: 'active',
      joined: todayDate(), verified: true, referral, referredBy: referralCode || null,
    };

    await users.insertOne(newUser);

    const wallets = db.collection('wallets');
    await wallets.insertOne({
      id: genId('WLT'), userId,
      pendingCashback: 0, approvedCashback: 0, lockedCashback: 0,
      withdrawableCashback: 0, refundBalance: 0, totalWithdrawn: 0, lifetimeEarned: 0,
      lastUpdated: nowISO(),
    });

    const token = signToken({ userId, email: cleanEmail, role: 'buyer' });
    res.setHeader('Set-Cookie', `ds_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`);

    const { password: _pw, _id, ...safeUser } = newUser as any;
    return res.status(200).json({ success: true, token, message: 'Account created!', user: safeUser });
  } catch (err: any) {
    return res.status(500).json({ success: false, detail: err.message });
  }
}
