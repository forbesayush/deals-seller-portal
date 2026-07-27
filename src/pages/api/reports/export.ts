// pages/api/reports/export.ts — Orders Report Export (Supports Dynamic Order Code Filtering + Export All)
import type { NextApiRequest, NextApiResponse } from 'next';
import { connectDB } from '@/lib/mongodb';
import { getCurrentUserFromRequest, todayDate, nowISO } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ detail: 'Method not allowed' });
  }

  try {
    const db = await connectDB();
    const session = getCurrentUserFromRequest(req);

    if (!session || !['admin', 'super_admin', 'manager', 'auditor'].includes(session.role)) {
      return res.status(403).json({ detail: 'Admin access required' });
    }

    const { type, format, orderCode } = req.query;
    const cleanCode = typeof orderCode === 'string' ? orderCode.trim() : '';

    const ordersCollection = db.collection('orders');
    const usersCollection = db.collection('users');

    let rawOrders: any[] = [];

    if (cleanCode) {
      // Dynamic Order Code Query (Supports 1200, ORD-45891, INV20260727, ABC001, etc.)
      const escapedCode = cleanCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const exactRegex = new RegExp(`^${escapedCode}$`, 'i');
      const partialRegex = new RegExp(escapedCode, 'i');

      // 1. Try exact match
      rawOrders = await ordersCollection.find({
        $or: [
          { orderCode: exactRegex },
          { code: exactRegex },
          { productCode: exactRegex },
          { orderNo: exactRegex },
        ]
      }).sort({ submittedDate: -1, orderDate: -1 }).toArray();

      // 2. Fallback to partial match if no exact match found
      if (rawOrders.length === 0) {
        rawOrders = await ordersCollection.find({
          $or: [
            { orderCode: partialRegex },
            { code: partialRegex },
            { productCode: partialRegex },
            { orderNo: partialRegex },
          ]
        }).sort({ submittedDate: -1, orderDate: -1 }).toArray();
      }
    } else {
      // Export All Orders (Preserves existing functionality)
      rawOrders = await ordersCollection.find({}).sort({ submittedDate: -1, orderDate: -1 }).toArray();
    }

    if (cleanCode && rawOrders.length === 0) {
      return res.status(400).json({ detail: `No orders found for Order Code "${cleanCode}". Cannot generate empty export file.` });
    }

    // Populate customer details
    const buyerIds = Array.from(new Set(rawOrders.map(o => o.buyerId).filter(Boolean)));
    const buyers = await usersCollection.find({ id: { $in: buyerIds } }, { projection: { password: 0, _id: 0 } }).toArray();
    const buyerMap = new Map(buyers.map(b => [b.id, b]));

    // CSV Headers
    const headers = [
      'Order ID',
      'Order Code',
      'Customer Name',
      'Customer Phone',
      'Customer Email',
      'Product Name',
      'Platform',
      'Deal Type',
      'Quantity',
      'Price (INR)',
      'Cashback Amount',
      'Deduction Amount',
      'Net Amount',
      'Approval Status',
      'Current Status',
      'Order Date',
      'Submitted Date',
      'Paid Date',
      'Tracking Number',
    ];

    const rows = rawOrders.map(o => {
      const buyer = buyerMap.get(o.buyerId);
      const custName = buyer?.name || o.customerName || 'N/A';
      const custPhone = buyer?.mobile || o.customerPhone || 'N/A';
      const custEmail = buyer?.email || o.customerEmail || 'N/A';

      return [
        `"${(o.orderNo || o.id || '').replace(/"/g, '""')}"`,
        `"${(o.orderCode || o.code || '').replace(/"/g, '""')}"`,
        `"${custName.replace(/"/g, '""')}"`,
        `"${custPhone.replace(/"/g, '""')}"`,
        `"${custEmail.replace(/"/g, '""')}"`,
        `"${(o.productName || '').replace(/"/g, '""')}"`,
        `"${(o.platform || '').replace(/"/g, '""')}"`,
        `"${(o.dealType || 'Original').replace(/"/g, '""')}"`,
        o.quantity || 1,
        o.productPrice || o.amount || 0,
        o.cashbackAmount || 0,
        o.deductionAmount || o.processingFee || 0,
        o.netAmount || 0,
        `"${(o.approvalStatus || 'pending').replace(/"/g, '""')}"`,
        `"${(o.currentStatus || 'submitted').replace(/"/g, '""')}"`,
        `"${o.orderDate || ''}"`,
        `"${o.submittedDate || ''}"`,
        `"${o.paidDate || ''}"`,
        `"${(o.trackingNumber || '').replace(/"/g, '""')}"`,
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');

    // Audit log
    await db.collection('audit_logs').insertOne({
      id: 'LOG' + Math.floor(Math.random() * 900000 + 100000),
      userEmail: session.email,
      action: cleanCode ? 'Batch Order Export' : 'Export All Orders',
      targetType: 'orders',
      details: cleanCode
        ? `Exported ${rawOrders.length} orders for Order Code "${cleanCode}"`
        : `Exported all ${rawOrders.length} orders`,
      timestamp: nowISO()
    });

    const today = todayDate();
    const safeCode = cleanCode.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = cleanCode
      ? `Orders_${safeCode}_${today}.csv`
      : `Orders_Export_All_${today}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(csvContent);
  } catch (err: any) {
    return res.status(500).json({ detail: err.message || 'Error generating export file' });
  }
}
