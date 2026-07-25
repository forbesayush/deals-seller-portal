// pages/api/users/all.ts — GET all users (admin only)
import type { NextApiRequest, NextApiResponse } from 'next';
import { connectDB } from '@/lib/mongodb';
import { seedDatabase } from '@/lib/seed';
import { getCurrentUserFromRequest } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ detail: 'Method not allowed' });
  try {
    const db = await connectDB();
    await seedDatabase(db);
    const session = getCurrentUserFromRequest(req);
    if (!session || !['admin', 'super_admin', 'manager', 'auditor'].includes(session.role)) {
      return res.status(403).json({ detail: 'Admin access required' });
    }
    const users = db.collection('users');
    const q = (req.query.q as string || '').toLowerCase();
    const role = req.query.role as string;
    const statusFilter = req.query.status_filter as string;

    const query: any = {};
    if (role && role !== 'All') query.role = role;
    if (statusFilter && statusFilter !== 'All') query.status = statusFilter;
    if (q) {
      query.$or = [
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
        { id: { $regex: q, $options: 'i' } },
        { mobile: { $regex: q, $options: 'i' } },
      ];
    }

    const list = await users.find(query, { projection: { password: 0, _id: 0 } }).toArray();
    return res.status(200).json(list);
  } catch (err: any) {
    return res.status(500).json({ detail: err.message });
  }
}
