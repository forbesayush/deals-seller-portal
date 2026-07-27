// lib/seed.ts — Seeds the MongoDB database with single default admin account and cleans legacy admin accounts
import { Db } from 'mongodb';
import { todayDate } from './auth';

export async function seedDatabase(db: Db) {
  const today = todayDate();
  const users = db.collection('users');

  // 1. Delete all other admin accounts except main admin (admin@deals.seller.com / ADM001)
  await users.deleteMany({
    role: 'admin',
    email: { $ne: 'admin@deals.seller.com' },
    id: { $ne: 'ADM001' }
  });

  // 2. Ensure single main admin exists
  const existingAdmin = await users.findOne({ email: 'admin@deals.seller.com' });
  if (!existingAdmin) {
    await users.insertOne({
      id: 'ADM001',
      name: 'Admin — deals.seller',
      email: 'admin@deals.seller.com',
      mobile: null,
      password: 'admin@123',
      role: 'admin',
      status: 'active',
      joined: today,
      verified: true,
      referral: 'ADMIN1'
    });
  }

  // 3. Seed default buyer if missing
  const existingBuyer = await users.findOne({ email: 'alwaysayushsourav162@gmail.com' });
  if (!existingBuyer) {
    await users.insertOne({
      id: 'USR001',
      name: 'Ayush Chatterjee',
      email: 'alwaysayushsourav162@gmail.com',
      mobile: '9123337436',
      password: 'ekta@123',
      role: 'buyer',
      status: 'active',
      joined: today,
      verified: true,
      referral: 'AYUSH123'
    });
  }

  // Seed wallet for default buyer
  const wallets = db.collection('wallets');
  const existingWallet = await wallets.findOne({ userId: 'USR001' });
  if (!existingWallet) {
    await wallets.insertOne({
      id: 'WLT001', userId: 'USR001',
      pendingCashback: 0, approvedCashback: 0, lockedCashback: 0,
      withdrawableCashback: 0, refundBalance: 0, totalWithdrawn: 0,
      lifetimeEarned: 0, lastUpdated: new Date().toISOString()
    });
  }

  // 4. Seed Shivam buyer account
  const existingShivam = await users.findOne({ $or: [{ email: 'shivam@deals.seller.com' }, { mobile: '7050798925' }, { name: /^shivam$/i }] });
  if (!existingShivam) {
    await users.insertOne({
      id: 'USR002',
      name: 'Shivam',
      email: 'shivam@deals.seller.com',
      mobile: '7050798925',
      password: 'shivam@123',
      role: 'buyer',
      status: 'active',
      joined: today,
      verified: true,
      referral: 'SHIVAM123'
    });
    await wallets.insertOne({
      id: 'WLT002', userId: 'USR002',
      pendingCashback: 0, approvedCashback: 0, lockedCashback: 0,
      withdrawableCashback: 0, refundBalance: 0, totalWithdrawn: 0,
      lifetimeEarned: 0, lastUpdated: new Date().toISOString()
    });
  } else {
    await users.updateOne(
      { id: existingShivam.id },
      { $set: { password: 'shivam@123', mobile: '7050798925', status: 'active' } }
    );
  }

  const settings = db.collection('settings');
  await settings.updateOne(
    { _key: 'single_admin_v1' },
    { $set: { _key: 'single_admin_v1', updatedAt: new Date().toISOString() } },
    { upsert: true }
  );
}
