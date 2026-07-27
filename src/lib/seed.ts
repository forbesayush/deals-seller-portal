// lib/seed.ts — Seeds the MongoDB database with default admin/owner accounts on first run
import { Db } from 'mongodb';
import { genId, todayDate } from './auth';

export async function seedDatabase(db: Db) {
  const settings = db.collection('settings');
  const alreadySeeded = await settings.findOne({ _key: 'seeded_v1' });
  if (alreadySeeded) return;

  const today = todayDate();
  const users = db.collection('users');

  // Check if admin already exists before seeding
  const existingAdmin = await users.findOne({ email: 'admin@deals.seller.com' });
  if (!existingAdmin) {
    await users.insertMany([
      { id: 'ADM001', name: 'Admin — deals.seller', email: 'admin@deals.seller.com', mobile: null, password: 'admin@123', role: 'admin', status: 'active', joined: today, verified: true, referral: 'ADMIN1' },
      { id: 'ADM002', name: 'Owner — deals.seller', email: 'owner@deals.seller.com', mobile: null, password: 'owner@123', role: 'admin', status: 'active', joined: today, verified: true, referral: 'ADMIN2' },
      { id: 'ADM003', name: 'Ekta — Admin', email: 'ekta@deals.seller.com', mobile: null, password: 'ayushu08', role: 'admin', status: 'active', joined: today, verified: true, referral: 'EKTA08' },
      { id: 'USR001', name: 'Ayush Chatterjee', email: 'alwaysayushsourav162@gmail.com', mobile: '9123337436', password: 'ekta@123', role: 'buyer', status: 'active', joined: today, verified: true, referral: 'AYUSH123' },
    ]);
  }

  // Seed wallet for default buyer
  const wallets = db.collection('wallets');
  const existingWallet = await wallets.findOne({ userId: 'USR001' });
  if (!existingWallet) {
    await wallets.insertOne({
      id: 'WLT001', userId: 'USR001',
      pendingCashback: 0, approvedCashback: 0, lockedCashback: 0,
      withdrawableCashback: 0, refundBalance: 0, totalWithdrawn: 0, lifetimeEarned: 0,
      lastUpdated: new Date().toISOString(),
    });
  }

  // Seed announcements
  const announcements = db.collection('announcements');
  const annCount = await announcements.countDocuments();
  if (annCount === 0) {
    await announcements.insertMany([
      { id: 'ANN001', title: 'Welcome to the New Deal Portal!', body: 'Check out high-yield cashback deals on Amazon, Flipkart, Meesho & Myntra.', type: 'info', active: true, pinned: true, createdAt: '2026-07-01T00:00:00Z' },
      { id: 'ANN002', title: 'Withdrawal Processing Time Cut to Instant UPI!', body: 'All UPI withdrawals are now instant.', type: 'success', active: true, pinned: false, createdAt: '2026-07-10T12:00:00Z' },
      { id: 'ANN003', title: '🔥 Flash Sale: 10% Extra Cashback on Apple & Samsung!', body: 'Limited deal slots unlocked for Galaxy S24 Ultra & AirPods Pro 2.', type: 'warning', active: true, pinned: true, createdAt: '2026-07-20T09:00:00Z' },
    ]);
  }

  // Seed settings
  const sysSettings = db.collection('system_settings');
  const settingsCount = await sysSettings.countDocuments();
  if (settingsCount === 0) {
    await sysSettings.insertMany([
      { key: 'registration_enabled', value: true },
      { key: 'portal_active', value: true },
      { key: 'auto_approve_orders', value: false },
    ]);
  }

  // Seed feature flags
  const featureFlags = db.collection('feature_flags');
  const flagCount = await featureFlags.countDocuments();
  if (flagCount === 0) {
    await featureFlags.insertMany([
      { key: 'referral_system', name: 'Referral System', description: 'Enable referral code generation and tracking', enabled: true },
      { key: 'kyc_verification', name: 'KYC Checks', description: 'Require user verification for withdrawals', enabled: false },
    ]);
  }

  // Mark as seeded
  await settings.insertOne({ _key: 'seeded_v1', seededAt: new Date().toISOString() });
}
