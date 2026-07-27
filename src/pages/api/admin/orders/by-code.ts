// pages/api/admin/orders/by-code.ts — Batch search orders by Order Code for Admin Panel
import type { NextApiRequest, NextApiResponse } from 'next';
import { connectDB } from '@/lib/mongodb';
import { getCurrentUserFromRequest, nowISO } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, detail: 'Method not allowed' });
  }

  try {
    const db = await connectDB();
    const session = getCurrentUserFromRequest(req);

    if (!session || !['admin', 'super_admin', 'manager', 'auditor'].includes(session.role)) {
      return res.status(403).json({ success: false, detail: 'Admin access required' });
    }

    const { orderCode } = req.body || {};
    const cleanCode = typeof orderCode === 'string' ? orderCode.trim() : '';

    // Validation
    if (!cleanCode) {
      return res.status(400).json({ success: false, detail: 'Please enter an Order Code.' });
    }

    const ordersCollection = db.collection('orders');
    const usersCollection = db.collection('users');

    // Case-insensitive flexible query matching orderCode, code, or productCode
    const escapedCode = cleanCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const codeRegex = new RegExp(`^${escapedCode}$`, 'i');

    const matchingOrders = await ordersCollection.find({
      $or: [
        { orderCode: codeRegex },
        { code: codeRegex },
        { productCode: codeRegex },
        { orderNo: codeRegex },
      ]
    }).sort({ submittedDate: -1, orderDate: -1 }).toArray();

    if (matchingOrders.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        orders: [],
        message: `No orders found for Order Code "${cleanCode}".`
      });
    }

    // Populate customer details for each matching order
    const buyerIds = Array.from(new Set(matchingOrders.map(o => o.buyerId).filter(Boolean)));
    const buyers = await usersCollection.find({ id: { $in: buyerIds } }, { projection: { password: 0, _id: 0 } }).toArray();
    const buyerMap = new Map(buyers.map(b => [b.id, b]));

    const enrichedOrders = matchingOrders.map(({ _id, ...o }) => {
      const buyer = buyerMap.get(o.buyerId);
      return {
        ...o,
        customerName: buyer?.name || o.customerName || 'N/A',
        customerEmail: buyer?.email || o.customerEmail || 'N/A',
        customerPhone: buyer?.mobile || o.customerPhone || 'N/A',
      };
    });

    // Log export activity
    await db.collection('audit_logs').insertOne({
      id: 'LOG' + Math.floor(Math.random() * 900000 + 100000),
      userEmail: session.email,
      action: 'Batch Order Lookup',
      targetType: 'orders',
      details: `Loaded ${enrichedOrders.length} orders for Order Code "${cleanCode}"`,
      timestamp: nowISO()
    });

    return res.status(200).json({
      success: true,
      orderCode: cleanCode,
      count: enrichedOrders.length,
      orders: enrichedOrders
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, detail: err.message || 'Internal server error' });
  }
}
