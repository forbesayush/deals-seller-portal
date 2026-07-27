// pages/api/admin/wallet/adjust.ts — Manual Cashback Adjustment (Credit/Debit)
import type { NextApiRequest, NextApiResponse } from 'next';
import { connectDB } from '@/lib/mongodb';
import { getCurrentUserFromRequest, genId, nowISO } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ detail: 'Method not allowed' });

  try {
    const db = await connectDB();
    const session = getCurrentUserFromRequest(req);
    if (!session || !['admin', 'super_admin'].includes(session.role)) {
      return res.status(403).json({ detail: 'Admin permission required' });
    }

    const { userId, amount, type, reason } = req.body;
    const numAmt = parseFloat(amount);

    if (!userId || isNaN(numAmt) || numAmt <= 0) {
      return res.status(400).json({ detail: 'Valid User ID and positive amount required' });
    }
    if (!['credit', 'debit'].includes(type)) {
      return res.status(400).json({ detail: 'Adjustment type must be credit or debit' });
    }
    if (!reason || !reason.trim()) {
      return res.status(400).json({ detail: 'Mandatory adjustment reason required' });
    }

    const users = db.collection('users');
    const targetUser = await users.findOne({ id: userId });
    if (!targetUser) return res.status(404).json({ detail: 'User not found' });

    const wallets = db.collection('wallets');
    const transactions = db.collection('transactions');
    const auditLogs = db.collection('audit_logs');

    const changeAmt = type === 'credit' ? numAmt : -numAmt;

    // Update target wallet
    await wallets.updateOne(
      { userId },
      {
        $inc: {
          withdrawableCashback: changeAmt,
          approvedCashback: changeAmt,
          lifetimeEarned: type === 'credit' ? numAmt : 0,
        },
        $set: { lastUpdated: nowISO() }
      },
      { upsert: true }
    );

    // Insert wallet transaction history record
    const txId = genId('TX');
    await transactions.insertOne({
      id: txId,
      walletId: 'WLT' + userId.replace('USR', ''),
      userId,
      amount: numAmt,
      type,
      category: 'admin_manual_adjustment',
      status: 'completed',
      description: `Manual Adjustment (${type.toUpperCase()}): ${reason.trim()}`,
      adminEmail: session.email,
      timestamp: nowISO()
    });

    // Create Audit Log entry
    await auditLogs.insertOne({
      id: genId('AUD'),
      userId: session.userId,
      userEmail: session.email,
      action: `WALLET_MANUAL_ADJUSTMENT_${type.toUpperCase()}`,
      targetType: 'USER_WALLET',
      targetId: userId,
      timestamp: nowISO(),
      ipAddress: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1',
      userAgent: req.headers['user-agent'] || '',
      oldData: null,
      newData: { targetUser: targetUser.email, amount: numAmt, type, reason: reason.trim() }
    });

    const updatedWallet = await wallets.findOne({ userId });
    return res.status(200).json({
      success: true,
      message: `Successfully ${type}ed ${numAmt} to ${targetUser.name}'s wallet`,
      wallet: updatedWallet
    });
  } catch (err: any) {
    return res.status(500).json({ detail: err.message });
  }
}
