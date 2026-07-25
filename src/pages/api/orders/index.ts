// pages/api/orders/index.ts — GET orders (buyer: own, admin: all), POST new order, DELETE all
import type { NextApiRequest, NextApiResponse } from 'next';
import { connectDB } from '@/lib/mongodb';
import { seedDatabase } from '@/lib/seed';
import { getCurrentUserFromRequest, genId, nowISO, todayDate } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const db = await connectDB();
    await seedDatabase(db);
    const session = getCurrentUserFromRequest(req);

    if (!session) return res.status(401).json({ detail: 'Authentication required' });

    const orders = db.collection('orders');
    const wallets = db.collection('wallets');
    const transactions = db.collection('transactions');

    // ── GET ──
    if (req.method === 'GET') {
      const q = (req.query.q as string || '').toLowerCase();
      const query: any = session.role === 'buyer' ? { buyerId: session.userId } : {};
      if (q) {
        query.$or = [
          { orderNo: { $regex: q, $options: 'i' } },
          { productName: { $regex: q, $options: 'i' } },
          { id: { $regex: q, $options: 'i' } },
        ];
      }
      const list = await orders.find(query).sort({ submittedDate: -1 }).toArray();
      return res.status(200).json(list.map(({ _id, ...o }) => o));
    }

    // ── DELETE (admin: clear all) ──
    if (req.method === 'DELETE') {
      if (!['admin', 'super_admin'].includes(session.role)) {
        return res.status(403).json({ detail: 'Admin only' });
      }
      await orders.deleteMany({});
      await transactions.deleteMany({});
      await wallets.updateMany({}, { $set: { pendingCashback: 0, approvedCashback: 0, lockedCashback: 0, withdrawableCashback: 0, refundBalance: 0, totalWithdrawn: 0, lifetimeEarned: 0 } });
      return res.status(200).json({ success: true, message: 'All orders cleared.' });
    }

    // ── POST ──
    if (req.method === 'POST') {
      const { orderNo, productCode, orderName, platform, mediator, dealType, orderDate, amount, deduction, code } = req.body;

      const existing = await orders.findOne({ orderNo });
      if (existing) return res.status(400).json({ detail: `Order ID ${orderNo} already exists` });

      const deals = db.collection('deals');
      const deal = await deals.findOne({ $or: [{ productCode }, { id: productCode }] });

      const productName = orderName?.trim() || deal?.productName || 'Order Submission';
      const plat = platform || deal?.platform || 'Amazon';
      const cashbackAmount = deal?.cashback || amount;
      const cashbackPct = Math.round((cashbackAmount / (amount || 1)) * 10000) / 100;
      const finalDeduction = parseFloat(deduction) || 0;
      const netAmount = Math.max(0, Math.round((cashbackAmount - finalDeduction) * 100) / 100);

      const id = genId('ORD');
      const newOrder = {
        id, orderNo,
        orderCode: 'ORD-' + Math.floor(Math.random() * 900000 + 100000),
        trackingNumber: 'TRK-' + Math.floor(Math.random() * 900000 + 100000),
        productName, productCode: productCode || '',
        productPrice: amount, quantity: 1,
        buyerId: session.userId,
        cashbackPct, cashbackAmount,
        processingFee: finalDeduction, deductionAmount: finalDeduction, netAmount,
        refundStatus: 'not_eligible', approvalStatus: 'pending_review', currentStatus: 'order_filled',
        orderDate, submittedDate: todayDate(), paidDate: null,
        platform: plat, priority: 'normal', screenshot: true,
        mediator: mediator || null, dealType: dealType || null,
        code: code || null,
      };

      await orders.insertOne(newOrder);

      // Update wallet (add pending cashback)
      await wallets.updateOne(
        { userId: session.userId },
        { $inc: { pendingCashback: netAmount }, $set: { lastUpdated: nowISO() } },
        { upsert: false }
      );

      // Add transaction
      await transactions.insertOne({
        id: genId('TX'), walletId: 'WLT' + session.userId.replace('USR', ''),
        orderId: id, amount: netAmount, type: 'credit', category: 'cashback_pending',
        status: 'pending', description: `Cashback pending for order ${orderNo}`, timestamp: nowISO(),
      });

      const { _id, ...clean } = newOrder as any;
      return res.status(200).json({ success: true, order: clean });
    }

    return res.status(405).json({ detail: 'Method not allowed' });
  } catch (err: any) {
    return res.status(500).json({ detail: err.message });
  }
}
