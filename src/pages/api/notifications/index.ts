// pages/api/notifications/index.ts — GET notifications for current user
import type { NextApiRequest, NextApiResponse } from 'next';
import { connectDB } from '@/lib/mongodb';
import { getCurrentUserFromRequest } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const db = await connectDB();
    const session = getCurrentUserFromRequest(req);

    if (req.method === 'GET') {
      if (!session) return res.status(200).json([]);
      const unreadOnly = req.query.unread_only === 'true';
      const notifications = db.collection('notifications');
      const query: any = { userId: session.userId };
      if (unreadOnly) query.read = false;
      const list = await notifications.find(query).sort({ createdAt: -1 }).limit(20).toArray();
      return res.status(200).json(list.map(({ _id, ...n }) => n));
    }

    return res.status(405).json({ detail: 'Method not allowed' });
  } catch (err: any) {
    return res.status(500).json({ detail: err.message });
  }
}
