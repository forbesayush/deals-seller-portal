// pages/api/admin/auth-logs.ts — Paginated auth event log for Admin panel
import type { NextApiRequest, NextApiResponse } from 'next';
import { connectDB } from '@/lib/mongodb';
import { requireAdmin } from '@/lib/auth';

export default requireAdmin(async function handler(req, res, _adminUser) {
  if (req.method !== 'GET') return res.status(405).json({ detail: 'Method not allowed' });

  try {
    const db = await connectDB();
    const { action, page = '1', limit = '100' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(500, parseInt(limit as string, 10) || 100);
    const skip = (pageNum - 1) * limitNum;

    const filter: Record<string, any> = {};
    if (action && action !== 'ALL') {
      filter.action = action;
    }

    const logs = await db
      .collection('auth_events')
      .find(filter)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limitNum)
      .toArray();

    const total = await db.collection('auth_events').countDocuments(filter);

    return res.status(200).json({
      logs: logs.map(({ _id, ...l }) => l),
      total,
      page: pageNum,
      limit: limitNum,
    });
  } catch (err: any) {
    return res.status(500).json({ detail: err.message });
  }
});
