// pages/api/users/create.ts — POST create new user (admin only)
import type { NextApiRequest, NextApiResponse } from 'next';
import { connectDB } from '@/lib/mongodb';
import { getCurrentUserFromRequest, genId, todayDate, nowISO } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ detail: 'Method not allowed' });
  try {
    const db = await connectDB();
    const session = getCurrentUserFromRequest(req);
    if (!session || !['admin', 'super_admin'].includes(session.role)) {
      return res.status(403).json({ detail: 'Admin access required' });
    }
    const { name, email, mobile, password, role } = req.body;
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanName = (name || '').trim();
    const cleanPass = (password || '').trim();

    if (!cleanEmail || !cleanName || !cleanPass) {
      return res.status(400).json({ success: false, detail: 'Name, email and password are required.' });
    }

    const users = db.collection('users');
    const exists = await users.findOne({ email: cleanEmail });
    if (exists) return res.status(400).json({ success: false, detail: 'User already exists.' });

    const userId = genId(role === 'admin' || role === 'super_admin' ? 'ADM' : 'USR');
    const newUser = {
      id: userId, name: cleanName, email: cleanEmail, mobile: mobile?.trim() || null,
      password: cleanPass, role: role || 'buyer', status: 'active',
      joined: todayDate(), verified: true,
      referral: (cleanName.slice(0, 4).toUpperCase().replace(/[^A-Z]/g, '') || 'USER') + Math.floor(Math.random() * 900 + 100),
    };
    await users.insertOne(newUser);

    if (role === 'buyer' || !role) {
      const wallets = db.collection('wallets');
      await wallets.insertOne({ id: genId('WLT'), userId, pendingCashback: 0, approvedCashback: 0, lockedCashback: 0, withdrawableCashback: 0, refundBalance: 0, totalWithdrawn: 0, lifetimeEarned: 0, lastUpdated: nowISO() });
    }

    const { password: _pw, _id, ...safe } = newUser as any;
    return res.status(200).json({ success: true, user: safe });
  } catch (err: any) {
    return res.status(500).json({ detail: err.message });
  }
}
