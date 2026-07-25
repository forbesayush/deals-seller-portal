// pages/api/users/[id].ts — GET, PATCH, DELETE single user
import type { NextApiRequest, NextApiResponse } from 'next';
import { connectDB } from '@/lib/mongodb';
import { getCurrentUserFromRequest } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const db = await connectDB();
    const session = getCurrentUserFromRequest(req);
    if (!session) return res.status(401).json({ detail: 'Authentication required' });

    const userId = req.query.id as string;
    const users = db.collection('users');
    const user = await users.findOne({ id: userId }, { projection: { password: 0, _id: 0 } });
    if (!user) return res.status(404).json({ detail: 'User not found' });

    if (req.method === 'GET') {
      return res.status(200).json(user);
    }

    if (req.method === 'PATCH' || req.method === 'PUT') {
      if (!['admin', 'super_admin'].includes(session.role) && session.userId !== userId) {
        return res.status(403).json({ detail: 'Forbidden' });
      }
      const { role, status, name, mobile } = req.body;
      const updates: any = {};
      if (role) updates.role = role;
      if (status) updates.status = status;
      if (name) updates.name = name;
      if (mobile !== undefined) updates.mobile = mobile;
      await users.updateOne({ id: userId }, { $set: updates });
      const updated = await users.findOne({ id: userId }, { projection: { password: 0, _id: 0 } });
      return res.status(200).json(updated);
    }

    if (req.method === 'DELETE') {
      if (!['admin', 'super_admin'].includes(session.role)) {
        return res.status(403).json({ detail: 'Admin only' });
      }
      await users.deleteOne({ id: userId });
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ detail: 'Method not allowed' });
  } catch (err: any) {
    return res.status(500).json({ detail: err.message });
  }
}
