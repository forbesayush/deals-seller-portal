// pages/api/withdrawals/[id].ts — PUT/PATCH single withdrawal (admin approve/reject)
import type { NextApiRequest, NextApiResponse } from 'next';
import { connectDB } from '@/lib/mongodb';
import { getCurrentUserFromRequest, nowISO } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const db = await connectDB();
    const session = getCurrentUserFromRequest(req);
    if (!session) return res.status(401).json({ detail: 'Authentication required' });

    const wthId = req.query.id as string;
    const withdrawals = db.collection('withdrawals');
    const wallets = db.collection('wallets');

    const wth = await withdrawals.findOne({ id: wthId });
    if (!wth) return res.status(404).json({ detail: 'Withdrawal not found' });

    if (req.method === 'PUT' || req.method === 'PATCH') {
      const newStatus = req.body.status;
      const updates: any = { status: newStatus };

      if (newStatus === 'processed') {
        updates.processedAt = nowISO();
      } else if (newStatus === 'rejected') {
        // Refund the amount back to wallet
        await wallets.updateOne({ userId: wth.userId }, {
          $inc: { withdrawableCashback: wth.amount, totalWithdrawn: -wth.amount },
          $set: { lastUpdated: nowISO() }
        });
      }

      await withdrawals.updateOne({ id: wthId }, { $set: updates });
      const updated = await withdrawals.findOne({ id: wthId });
      const { _id, ...clean } = updated as any;
      return res.status(200).json(clean);
    }

    return res.status(405).json({ detail: 'Method not allowed' });
  } catch (err: any) {
    return res.status(500).json({ detail: err.message });
  }
}
