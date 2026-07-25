// pages/api/wallet/index.ts — GET wallet balance for current user
import type { NextApiRequest, NextApiResponse } from 'next';
import { connectDB } from '@/lib/mongodb';
import { getCurrentUserFromRequest, genId, nowISO } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const db = await connectDB();
    const session = getCurrentUserFromRequest(req);
    if (!session) return res.status(401).json({ detail: 'Authentication required' });

    const wallets = db.collection('wallets');
    let wallet = await wallets.findOne({ userId: session.userId });

    if (!wallet) {
      // Auto-create wallet if missing
      const newWallet = { id: genId('WLT'), userId: session.userId, pendingCashback: 0, approvedCashback: 0, lockedCashback: 0, withdrawableCashback: 0, refundBalance: 0, totalWithdrawn: 0, lifetimeEarned: 0, lastUpdated: nowISO() };
      await wallets.insertOne(newWallet);
      wallet = newWallet as any;
    }

    const { _id, ...clean } = wallet as any;
    return res.status(200).json(clean);
  } catch (err: any) {
    return res.status(500).json({ detail: err.message });
  }
}
