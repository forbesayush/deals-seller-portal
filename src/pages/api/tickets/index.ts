// pages/api/tickets/index.ts — GET tickets, POST new ticket
import type { NextApiRequest, NextApiResponse } from 'next';
import { connectDB } from '@/lib/mongodb';
import { seedDatabase } from '@/lib/seed';
import { getCurrentUserFromRequest, genId, nowISO } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const db = await connectDB();
    await seedDatabase(db);
    const session = getCurrentUserFromRequest(req);
    if (!session) return res.status(401).json({ detail: 'Authentication required' });

    const tickets = db.collection('tickets');

    if (req.method === 'GET') {
      const query = session.role === 'buyer' ? { userId: session.userId } : {};
      const list = await tickets.find(query).sort({ createdAt: -1 }).toArray();
      return res.status(200).json(list.map(({ _id, ...t }) => t));
    }

    if (req.method === 'POST') {
      const { title, description, category, orderNo, priority } = req.body;
      const users = db.collection('users');
      const user = await users.findOne({ id: session.userId });
      const newTicket = {
        id: genId('TCK'), userId: session.userId, userName: user?.name || 'Buyer', userEmail: user?.email || session.email,
        title: title || 'Support Query', description: description || '', category: category || 'General',
        orderNo: orderNo || null, status: 'open', priority: priority || 'medium',
        reply: null, repliedAt: null, createdAt: nowISO(),
      };
      await tickets.insertOne(newTicket);
      const { _id, ...clean } = newTicket as any;
      return res.status(200).json(clean);
    }

    return res.status(405).json({ detail: 'Method not allowed' });
  } catch (err: any) {
    return res.status(500).json({ detail: err.message });
  }
}
