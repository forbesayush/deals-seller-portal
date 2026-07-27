import type { NextApiRequest, NextApiResponse } from 'next';
import { connectDB } from '@/lib/mongodb';
import { getCurrentUserFromRequest } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const db = await connectDB();
    const session = getCurrentUserFromRequest(req);
    if (!session) return res.status(200).json({ totalReferred: 0, totalEarned: 0, referralCode: '' });

    const users = db.collection('users');
    const currentUser = await users.findOne({ id: session.userId });
    const referralCode = currentUser?.referral || '';

    const referredUsers = await users.find({ referredBy: referralCode }).toArray();
    const totalReferred = referredUsers.length;
    const totalEarned = totalReferred * 50;

    return res.status(200).json({
      referralCode,
      totalReferred,
      totalEarned,
      referredUsers: referredUsers.map(({ password, _id, ...u }) => u),
    });
  } catch (err: any) {
    return res.status(500).json({ detail: err.message });
  }
}
