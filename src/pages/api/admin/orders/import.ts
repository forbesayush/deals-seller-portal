// pages/api/admin/orders/import.ts — Bulk Import Orders Endpoint
import type { NextApiRequest, NextApiResponse } from 'next';
import { connectDB } from '@/lib/mongodb';
import { getCurrentUserFromRequest, genId, todayDate, nowISO } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ detail: 'Method not allowed' });

  try {
    const db = await connectDB();
    const session = getCurrentUserFromRequest(req);
    if (!session || !['admin', 'super_admin'].includes(session.role)) {
      return res.status(403).json({ detail: 'Admin access required' });
    }

    const { orders: importList } = req.body;
    if (!Array.isArray(importList) || importList.length === 0) {
      return res.status(400).json({ detail: 'Provide a valid non-empty array of orders to import.' });
    }

    const ordersCol = db.collection('orders');
    const walletsCol = db.collection('wallets');
    const auditLogs = db.collection('audit_logs');

    let insertedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < importList.length; i++) {
      const item = importList[i];
      const orderNo = (item.orderNo || '').toString().trim();
      const code = (item.orderCode || item.code || item.productCode || '1200').toString().trim();
      const amount = parseFloat(item.amount || item.productPrice || 0);
      const deduction = parseFloat(item.deduction || item.deductionAmount || 0);

      if (!orderNo || isNaN(amount) || amount <= 0) {
        skippedCount++;
        errors.push(`Row ${i + 1}: Missing order number or invalid amount.`);
        continue;
      }

      const existing = await ordersCol.findOne({ orderNo });
      if (existing) {
        skippedCount++;
        errors.push(`Row ${i + 1}: Order No ${orderNo} already exists.`);
        continue;
      }

      const netAmount = Math.max(0, amount - deduction);
      const buyerId = item.buyerId || session.userId;
      const id = genId('ORD');

      const newOrder = {
        id,
        orderNo,
        orderCode: code,
        code,
        productCode: code,
        productName: item.productName || item.orderName || 'Imported Order',
        productPrice: amount,
        platform: item.platform || 'Amazon',
        buyerId,
        cashbackPct: 100,
        cashbackAmount: amount,
        processingFee: deduction,
        deductionAmount: deduction,
        netAmount,
        refundStatus: 'not_eligible',
        approvalStatus: item.status === 'paid' || item.status === 'approved' ? 'approved' : 'pending_review',
        currentStatus: item.status || 'order_filled',
        orderDate: item.orderDate || todayDate(),
        submittedDate: todayDate(),
        paidDate: item.status === 'paid' ? todayDate() : null,
        notes: 'Bulk Imported by Admin',
      };

      await ordersCol.insertOne(newOrder);
      insertedCount++;

      // Update wallet pending cashback
      if (newOrder.currentStatus !== 'cancelled' && newOrder.currentStatus !== 'rejected') {
        await walletsCol.updateOne(
          { userId: buyerId },
          { $inc: { pendingCashback: netAmount }, $set: { lastUpdated: nowISO() } },
          { upsert: true }
        );
      }
    }

    // Audit Log
    await auditLogs.insertOne({
      id: genId('AUD'),
      userId: session.userId,
      userEmail: session.email,
      action: 'BULK_IMPORT_ORDERS',
      targetType: 'ORDERS',
      targetId: null,
      timestamp: nowISO(),
      ipAddress: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1',
      userAgent: req.headers['user-agent'] || '',
      oldData: null,
      newData: { insertedCount, skippedCount, errors }
    });

    return res.status(200).json({
      success: true,
      message: `Bulk import completed: ${insertedCount} inserted, ${skippedCount} skipped.`,
      insertedCount,
      skippedCount,
      errors
    });
  } catch (err: any) {
    return res.status(500).json({ detail: err.message });
  }
}
