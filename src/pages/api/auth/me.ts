// pages/api/auth/me.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { connectDB } from '@/lib/mongodb';
import { getCurrentUserFromRequest } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ detail: 'Method not allowed' });

  const session = getCurrentUserFromRequest(req);
  if (!session) return res.status(200).json({ success: false, user: null });

  try {
    const db = await connectDB();
    const users = db.collection('users');
    const user = await users.findOne({ id: session.userId }, { projection: { password: 0, _id: 0 } });
    if (!user) return res.status(200).json({ success: false, user: null });
    return res.status(200).json({ success: true, user });
  } catch (err: any) {
    return res.status(500).json({ success: false, detail: err.message });
  }
}
