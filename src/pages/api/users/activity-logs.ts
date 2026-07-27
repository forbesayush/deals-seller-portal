import type { NextApiRequest, NextApiResponse } from 'next';
import { connectDB } from '@/lib/mongodb';
import { getCurrentUserFromRequest } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const db = await connectDB();
    const session = getCurrentUserFromRequest(req);
    if (!session) return res.status(200).json([]);

    const userActivity = db.collection('user_activity');
    const logs = await userActivity.find({ userId: session.userId }).sort({ timestamp: -1 }).limit(50).toArray();

    return res.status(200).json(logs.map(({ _id, ...l }) => l));
  } catch (err: any) {
    return res.status(500).json({ detail: err.message });
  }
}
