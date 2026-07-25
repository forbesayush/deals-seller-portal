// pages/api/tickets/[id].ts — GET, PATCH, DELETE single ticket
import type { NextApiRequest, NextApiResponse } from 'next';
import { connectDB } from '@/lib/mongodb';
import { getCurrentUserFromRequest, nowISO } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const db = await connectDB();
    const session = getCurrentUserFromRequest(req);
    if (!session) return res.status(401).json({ detail: 'Authentication required' });

    const ticketId = req.query.id as string;
    const tickets = db.collection('tickets');
    const ticket = await tickets.findOne({ id: ticketId });
    if (!ticket) return res.status(404).json({ detail: 'Ticket not found' });

    if (req.method === 'GET') {
      const { _id, ...clean } = ticket as any;
      return res.status(200).json(clean);
    }

    if (req.method === 'PATCH' || req.method === 'PUT') {
      const { reply, status } = req.body;
      const updates: any = { status: status || 'resolved', repliedAt: nowISO() };
      if (reply !== undefined) updates.reply = reply;
      await tickets.updateOne({ id: ticketId }, { $set: updates });
      const updated = await tickets.findOne({ id: ticketId });
      const { _id, ...clean } = updated as any;
      return res.status(200).json(clean);
    }

    if (req.method === 'DELETE') {
      if (!['admin', 'super_admin', 'manager'].includes(session.role)) {
        return res.status(403).json({ detail: 'Admin only' });
      }
      await tickets.deleteOne({ id: ticketId });
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ detail: 'Method not allowed' });
  } catch (err: any) {
    return res.status(500).json({ detail: err.message });
  }
}
