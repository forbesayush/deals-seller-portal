// pages/api/wallet/transactions.ts — GET transaction history
import type { NextApiRequest, NextApiResponse } from 'next';
import { connectDB } from '@/lib/mongodb';
import { getCurrentUserFromRequest } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const db = await connectDB();
    const session = getCurrentUserFromRequest(req);
    if (!session) return res.status(401).json({ detail: 'Authentication required' });

    const transactions = db.collection('transactions');
    const walletId = 'WLT' + session.userId.replace('USR', '');
    const list = await transactions.find({ walletId }).sort({ timestamp: -1 }).toArray();
    return res.status(200).json(list.map(({ _id, ...t }) => t));
  } catch (err: any) {
    return res.status(500).json({ detail: err.message });
  }
}
