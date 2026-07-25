// pages/api/refunds/[id].ts — GET, PATCH single refund
import type { NextApiRequest, NextApiResponse } from 'next';
import { connectDB } from '@/lib/mongodb';
import { getCurrentUserFromRequest } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const db = await connectDB();
    const session = getCurrentUserFromRequest(req);
    if (!session) return res.status(401).json({ detail: 'Authentication required' });

    const refundId = req.query.id as string;
    const refunds = db.collection('refunds');
    const refund = await refunds.findOne({ id: refundId });
    if (!refund) return res.status(404).json({ detail: 'Refund not found' });

    if (req.method === 'GET') {
      const { _id, ...clean } = refund as any;
      return res.status(200).json(clean);
    }

    if (req.method === 'PATCH' || req.method === 'PUT') {
      await refunds.updateOne({ id: refundId }, { $set: req.body });
      const updated = await refunds.findOne({ id: refundId });
      const { _id, ...clean } = updated as any;
      return res.status(200).json(clean);
    }

    return res.status(405).json({ detail: 'Method not allowed' });
  } catch (err: any) {
    return res.status(500).json({ detail: err.message });
  }
}
