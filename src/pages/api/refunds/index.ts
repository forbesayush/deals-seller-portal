// pages/api/refunds/index.ts — GET refunds, POST create refund
import type { NextApiRequest, NextApiResponse } from 'next';
import { connectDB } from '@/lib/mongodb';
import { getCurrentUserFromRequest, genId, nowISO } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const db = await connectDB();
    const session = getCurrentUserFromRequest(req);
    if (!session) return res.status(401).json({ detail: 'Authentication required' });

    const refunds = db.collection('refunds');

    if (req.method === 'GET') {
      const query = session.role === 'buyer' ? { buyerId: session.userId } : {};
      const list = await refunds.find(query).sort({ createdAt: -1 }).toArray();
      return res.status(200).json(list.map(({ _id, ...r }) => r));
    }

    if (req.method === 'POST') {
      const newRefund = { id: genId('REF'), buyerId: session.userId, status: 'pending', createdAt: nowISO(), ...req.body };
      await refunds.insertOne(newRefund);
      const { _id, ...clean } = newRefund as any;
      return res.status(200).json(clean);
    }

    return res.status(405).json({ detail: 'Method not allowed' });
  } catch (err: any) {
    return res.status(500).json({ detail: err.message });
  }
}
