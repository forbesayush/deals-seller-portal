// pages/api/withdrawals/index.ts — GET withdrawals, POST new withdrawal
import type { NextApiRequest, NextApiResponse } from 'next';
import { connectDB } from '@/lib/mongodb';
import { getCurrentUserFromRequest, genId, nowISO } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const db = await connectDB();
    const session = getCurrentUserFromRequest(req);
    if (!session) return res.status(401).json({ detail: 'Authentication required' });

    const withdrawals = db.collection('withdrawals');
    const wallets = db.collection('wallets');
    const transactions = db.collection('transactions');

    if (req.method === 'GET') {
      const query = session.role === 'buyer' ? { userId: session.userId } : {};
      const list = await withdrawals.find(query).sort({ createdAt: -1 }).toArray();
      return res.status(200).json(list.map(({ _id, ...w }) => w));
    }

    if (req.method === 'POST') {
      const { amount, method: wMethod, accountDetails } = req.body;
      const wallet = await wallets.findOne({ userId: session.userId });

      if (!wallet || wallet.withdrawableCashback < amount) {
        return res.status(400).json({ detail: 'Insufficient withdrawable balance' });
      }

      await wallets.updateOne({ userId: session.userId }, {
        $inc: { withdrawableCashback: -amount, totalWithdrawn: amount },
        $set: { lastUpdated: nowISO() }
      });

      const newWth = { id: genId('WTH'), userId: session.userId, userName: session.email, amount, method: wMethod, accountDetails, status: 'pending', createdAt: nowISO() };
      await withdrawals.insertOne(newWth);

      await transactions.insertOne({ id: genId('TX'), walletId: 'WLT' + session.userId.replace('USR', ''), orderId: null, amount, type: 'debit', category: 'withdrawal_pending', status: 'pending', description: `Withdrawal request (${wMethod})`, timestamp: nowISO() });

      const { _id, ...clean } = newWth as any;
      return res.status(200).json(clean);
    }

    return res.status(405).json({ detail: 'Method not allowed' });
  } catch (err: any) {
    return res.status(500).json({ detail: err.message });
  }
}
