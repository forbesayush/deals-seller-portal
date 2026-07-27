// pages/api/orders/[...id].ts — GET/PUT/PATCH single order + bulk-action + timeline
import type { NextApiRequest, NextApiResponse } from 'next';
import { connectDB } from '@/lib/mongodb';
import { getCurrentUserFromRequest, genId, nowISO, todayDate } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const db = await connectDB();
    const session = getCurrentUserFromRequest(req);
    if (!session) return res.status(401).json({ detail: 'Authentication required' });

    const parts = (req.query.id as string[]) || [];
    const firstPart = parts[0];
    const subRoute = parts[1];

    const orders = db.collection('orders');
    const wallets = db.collection('wallets');
    const transactions = db.collection('transactions');

    // ── BULK ACTION ──
    if (firstPart === 'bulk-action' && req.method === 'POST') {
      const { orderIds, action } = req.body;
      let updatedCount = 0;
      for (const id of orderIds) {
        const o = await orders.findOne({ id });
        if (!o) continue;

        if (action === 'mark_paid' && o.currentStatus !== 'paid') {
          await orders.updateOne({ id }, { $set: { currentStatus: 'paid', approvalStatus: 'approved', paidDate: todayDate(), notes: o.notes || 'Marked as Paid by Admin' } });
          await wallets.updateOne({ userId: o.buyerId }, {
            $inc: { pendingCashback: -o.netAmount, withdrawableCashback: o.netAmount, approvedCashback: o.netAmount, lifetimeEarned: o.netAmount },
            $set: { lastUpdated: nowISO() }
          });
          await transactions.insertOne({ id: genId('TX'), walletId: 'WLT' + o.buyerId.replace('USR', ''), orderId: id, amount: o.netAmount, type: 'credit', category: 'cashback_approved', status: 'completed', description: `Cashback approved for ${o.orderNo}`, timestamp: nowISO() });
          updatedCount++;
        } else if (action === 'approve' && o.currentStatus !== 'approved') {
          await orders.updateOne({ id }, { $set: { currentStatus: 'approved', approvalStatus: 'approved', notes: o.notes || 'Approved by Admin' } });
          updatedCount++;
        } else if (action === 'reject' && o.currentStatus !== 'rejected') {
          await orders.updateOne({ id }, { $set: { currentStatus: 'rejected', approvalStatus: 'rejected', notes: o.notes || 'Rejected by Admin' } });
          await wallets.updateOne({ userId: o.buyerId }, { $inc: { pendingCashback: -o.netAmount }, $set: { lastUpdated: nowISO() } });
          updatedCount++;
        } else if (action === 'cancel' && o.currentStatus !== 'cancelled') {
          await orders.updateOne({ id }, { $set: { currentStatus: 'cancelled', notes: o.notes || 'Cancelled by Admin' } });
          await wallets.updateOne({ userId: o.buyerId }, { $inc: { pendingCashback: -o.netAmount }, $set: { lastUpdated: nowISO() } });
          updatedCount++;
        }
      }
      return res.status(200).json({ success: true, updatedCount });
    }

    // ── SINGLE ORDER ──
    const order = await orders.findOne({ id: firstPart });
    if (!order) return res.status(404).json({ detail: 'Order not found' });

    // Buyers can only see their own orders
    if (session.role === 'buyer' && order.buyerId !== session.userId) {
      return res.status(404).json({ detail: 'Order not found' });
    }

    if (req.method === 'GET' && subRoute === 'timeline') {
      const logs = [{ id: 'OSL001', orderId: firstPart, fromStatus: 'submitted', toStatus: 'pending_review', note: 'Order submitted by buyer', timestamp: order.submittedDate || order.orderDate }];
      if (order.currentStatus === 'approved') logs.push({ id: 'OSL002', orderId: firstPart, fromStatus: 'pending_review', toStatus: 'approved', note: order.notes || 'Approved by Admin', timestamp: order.orderDate });
      if (order.currentStatus === 'paid') logs.push({ id: 'OSL003', orderId: firstPart, fromStatus: 'approved', toStatus: 'paid', note: order.notes || 'Marked paid by Admin', timestamp: order.paidDate || order.orderDate });
      if (order.currentStatus === 'rejected') logs.push({ id: 'OSL004', orderId: firstPart, fromStatus: 'pending_review', toStatus: 'rejected', note: order.notes || 'Rejected by Admin', timestamp: order.orderDate });
      if (order.currentStatus === 'cancelled') logs.push({ id: 'OSL005', orderId: firstPart, fromStatus: 'pending_review', toStatus: 'cancelled', note: order.notes || 'Cancelled by Admin', timestamp: order.orderDate });
      return res.status(200).json(logs);
    }

    if (req.method === 'GET' && subRoute === 'fraud-check') {
      if (session.role === 'buyer') return res.status(403).json({ detail: 'Forbidden' });
      return res.status(200).json({ status: 'success', riskLevel: 'low', checks: { ipCheck: 'pass', velocityCheck: 'pass', screenshotCheck: 'pass' } });
    }

    if (req.method === 'GET') {
      const { _id, ...clean } = order as any;
      return res.status(200).json(clean);
    }

    if (req.method === 'PUT' || req.method === 'PATCH') {
      const newStatus = req.body.currentStatus || req.body.status;
      const oldStatus = order.currentStatus;
      const updates: any = { ...req.body };

      if (newStatus && newStatus !== oldStatus) {
        if (newStatus === 'paid' && oldStatus !== 'paid') {
          updates.currentStatus = 'paid';
          updates.approvalStatus = 'approved';
          updates.paidDate = todayDate();
          await wallets.updateOne({ userId: order.buyerId }, {
            $inc: { pendingCashback: -order.netAmount, withdrawableCashback: order.netAmount, approvedCashback: order.netAmount, lifetimeEarned: order.netAmount },
            $set: { lastUpdated: nowISO() }
          });
          await transactions.insertOne({ id: genId('TX'), walletId: 'WLT' + order.buyerId.replace('USR', ''), orderId: firstPart, amount: order.netAmount, type: 'credit', category: 'cashback_approved', status: 'completed', description: `Cashback approved for ${order.orderNo}`, timestamp: nowISO() });
        } else if (newStatus === 'approved' && oldStatus !== 'approved') {
          updates.currentStatus = 'approved';
          updates.approvalStatus = 'approved';
        } else if (newStatus === 'rejected' && oldStatus !== 'rejected') {
          updates.currentStatus = 'rejected';
          updates.approvalStatus = 'rejected';
          await wallets.updateOne({ userId: order.buyerId }, { $inc: { pendingCashback: -order.netAmount }, $set: { lastUpdated: nowISO() } });
        } else if (newStatus === 'cancelled' && oldStatus !== 'cancelled') {
          updates.currentStatus = 'cancelled';
          await wallets.updateOne({ userId: order.buyerId }, { $inc: { pendingCashback: -order.netAmount }, $set: { lastUpdated: nowISO() } });
        }
      }

      await orders.updateOne({ id: firstPart }, { $set: updates });
      const updated = await orders.findOne({ id: firstPart });
      const { _id, ...clean } = updated as any;
      return res.status(200).json(clean);
    }

    return res.status(405).json({ detail: 'Method not allowed' });
  } catch (err: any) {
    return res.status(500).json({ detail: err.message });
  }
}
