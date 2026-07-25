// pages/api/claims/my.ts — GET current user's deal claims
import type { NextApiRequest, NextApiResponse } from 'next';
import { connectDB } from '@/lib/mongodb';
import { getCurrentUserFromRequest } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const db = await connectDB();
    const session = getCurrentUserFromRequest(req);
    if (!session) return res.status(200).json([]);

    const claims = db.collection('claims');
    const list = await claims.find({ userId: session.userId }).sort({ claimedAt: -1 }).toArray();
    return res.status(200).json(list.map(({ _id, ...c }) => c));
  } catch (err: any) {
    return res.status(500).json({ detail: err.message });
  }
}
