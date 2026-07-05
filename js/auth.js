/**
 * auth.js — Secure Session Auth Module
 * Uses SHA-256 hashing via Web Crypto API
 * Stores session token in sessionStorage (auto-expires on tab close)
 * Roles: 'admin' | 'buyer'
 */

const AUTH_KEY   = 'jm_session';
const USERS_KEY  = 'jm_users';

/* ─────────────────────────────────────────────
   CREDENTIAL STORE (SHA-256 hashed passwords)
   Admin pw:  admin@123
   Buyer demo: user@123
   ───────────────────────────────────────────── */
const ADMIN_CREDENTIALS = [
  {
    username: 'admin',
    email: 'admin@deals.seller.com',
    // SHA-256 of "admin@123"
    passwordHash: 'b3e73ec26847ae28e19d7b0cfec7d76aab61f5d6eb59c00e32bc02e3d2bd2e83',
    role: 'admin',
    name: 'Admin — deals.seller'
  },
  {
    username: 'owner',
    email: 'owner@deals.seller.com',
    // SHA-256 of "owner@123"
    passwordHash: '4c91e0e9e1c23ade81b6a30d9cc9ce3f1e2eaa08a1a4dd9c0e1c6ad65d61e4c9',
    role: 'admin',
    name: 'Owner — deals.seller'
  }
];

/* ─────────────────────────────────────────────
   MOCK BUYER USERS (stored in localStorage)
   In production, replace with real API calls
   ───────────────────────────────────────────── */
const DEFAULT_BUYERS = [
  { id: 'USR001', name: 'Ayush Chatterjee', email: 'alwaysayushsourav162@gmail.com', mobile: '9123337436', passwordHash: 'e3d8ba6ba5bbb61b30a1a29d3ad78b8af4d9ee16f08f1a1462e03b0e6e2d9c2e', role: 'buyer', status: 'active', joined: '2026-01-15', verified: true, referral: '' },
  { id: 'USR002', name: 'Shivam Raj',       email: 'shivamraj@example.com',          mobile: '9876543210', passwordHash: 'e3d8ba6ba5bbb61b30a1a29d3ad78b8af4d9ee16f08f1a1462e03b0e6e2d9c2e', role: 'buyer', status: 'active', joined: '2026-02-10', verified: true, referral: '' },
  { id: 'USR003', name: 'Priya Sharma',     email: 'priya@example.com',              mobile: '9988776655', passwordHash: 'e3d8ba6ba5bbb61b30a1a29d3ad78b8af4d9ee16f08f1a1462e03b0e6e2d9c2e', role: 'buyer', status: 'active', joined: '2026-03-05', verified: true, referral: 'REF001' },
  { id: 'USR004', name: 'Rahul Mehta',      email: 'rahul@example.com',              mobile: '9812345678', passwordHash: 'e3d8ba6ba5bbb61b30a1a29d3ad78b8af4d9ee16f08f1a1462e03b0e6e2d9c2e', role: 'buyer', status: 'suspended', joined: '2026-04-01', verified: false, referral: '' },
];

/* ─────────────────────────────────────────────
   MOCK ORDERS DATABASE
   ───────────────────────────────────────────── */
const MOCK_ORDERS = [
  { id: 'ORD001', orderNo: '402-0025862-2109921', productCode: 'ANT_COSMOS_3MODE_GAMING_CONTROLLER', platform: 'Amazon',   userId: 'USR002', mediator: 'Aman Pandey', dealType: 'Image Review', orderDate: '2026-06-26', submittedDate: '2026-06-26', amount: 1441.05, deduction: 300.00, finalPayout: 1141.05, status: 'order_filled',   refundStatus: null,     paidDate: null,        screenshot: true  },
  { id: 'ORD002', orderNo: '406-1422779-1212359', productCode: 'PNC_GREYSHOEWASHINGBAG_AZ',         platform: 'Amazon',   userId: 'USR001', mediator: 'Aman Pandey', dealType: 'Review',       orderDate: '2026-06-16', submittedDate: '2026-06-17', amount: 249.00, deduction: 20.00,  finalPayout: 229.00,   status: 'order_filled',   refundStatus: null,     paidDate: null,        screenshot: true  },
  { id: 'ORD003', orderNo: '402-0437892-3137934', productCode: 'PNC_BLACKHEADREMOVER_AZ',           platform: 'Amazon',   userId: 'USR001', mediator: 'Aman Pandey', dealType: 'Review',       orderDate: '2026-05-18', submittedDate: '2026-05-18', amount: 299.00, deduction: 23.00,  finalPayout: 276.00,   status: 'paid',           refundStatus: 'cleared', paidDate: '2026-06-01', screenshot: true  },
  { id: 'ORD004', orderNo: '402-5031051-7769965', productCode: 'PNC_BLACKHEADREMOVER_AZ',           platform: 'Amazon',   userId: 'USR001', mediator: 'Aman Pandey', dealType: 'Review',       orderDate: '2026-05-18', submittedDate: '2026-05-18', amount: 299.00, deduction: 23.00,  finalPayout: 276.00,   status: 'cancelled',      refundStatus: 'not_eligible', paidDate: null, screenshot: true },
  { id: 'ORD005', orderNo: '403-1863178-4809140', productCode: 'PNC_KAPOOREXCH_AZ',                platform: 'Amazon',   userId: 'USR001', mediator: 'Aman Pandey', dealType: 'Review',       orderDate: '2026-05-07', submittedDate: '2026-05-07', amount: 215.00, deduction: 18.00,  finalPayout: 197.00,   status: 'paid',           refundStatus: 'cleared', paidDate: '2026-05-23', screenshot: true  },
  { id: 'ORD006', orderNo: '408-1123456-9087654', productCode: 'PHI_USB_CABLE_AZ',                  platform: 'Amazon',   userId: 'USR002', mediator: 'Aman Pandey', dealType: 'Review',       orderDate: '2026-06-20', submittedDate: '2026-06-21', amount: 450.00, deduction: 35.00,  finalPayout: 415.00,   status: 'under_review',   refundStatus: 'pending', paidDate: null,        screenshot: true  },
  { id: 'ORD007', orderNo: 'FLK-9876543210',      productCode: 'FLK_REDMI13C_128GB',               platform: 'Flipkart', userId: 'USR003', mediator: 'Aman Pandey', dealType: 'Rating',       orderDate: '2026-06-25', submittedDate: '2026-06-25', amount: 8999.00, deduction: 200.00, finalPayout: 8799.00, status: 'order_filled',   refundStatus: null,     paidDate: null,        screenshot: false },
  { id: 'ORD008', orderNo: 'BLK-1122334455',      productCode: 'BLK_AMUL_BUTTER_500G',             platform: 'Blinkit',  userId: 'USR003', mediator: 'Direct',       dealType: 'Review',       orderDate: '2026-07-01', submittedDate: '2026-07-01', amount: 290.00, deduction: 25.00,  finalPayout: 265.00,   status: 'pending_review', refundStatus: null,     paidDate: null,        screenshot: true  },
];

/* ─────────────────────────────────────────────
   MOCK REFUND REQUESTS
   ───────────────────────────────────────────── */
const MOCK_REFUNDS = [
  { id: 'REF001', orderId: 'ORD003', orderNo: '402-0437892-3137934', userId: 'USR001', userName: 'Ayush Chatterjee', reason: 'Cashback not credited', submittedAt: '2026-05-20T10:30:00', reviewedAt: '2026-05-21T14:45:00', resolvedAt: '2026-05-22T09:00:00', amount: 276.00, upi: 'ayush@upi', status: 'resolved' },
  { id: 'REF002', orderId: 'ORD006', orderNo: '408-1123456-9087654', userId: 'USR002', userName: 'Shivam Raj',       reason: 'Wrong product delivered', submittedAt: '2026-06-22T08:00:00', reviewedAt: null, resolvedAt: null, amount: 415.00, upi: 'shivam@upi', status: 'pending' },
  { id: 'REF003', orderId: 'ORD007', orderNo: 'FLK-9876543210',      userId: 'USR003', userName: 'Priya Sharma',     reason: 'Order not delivered',    submittedAt: '2026-06-27T16:20:00', reviewedAt: '2026-06-27T18:00:00', resolvedAt: null, amount: 8799.00, upi: 'priya@upi', status: 'under_review' },
];

/* ─────────────────────────────────────────────
   HASHING UTILITY
   ───────────────────────────────────────────── */
async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/* ─────────────────────────────────────────────
   SESSION MANAGEMENT
   ───────────────────────────────────────────── */
function getSession() {
  try {
    const raw = sessionStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    // Check expiry (8 hours)
    if (Date.now() > session.expiresAt) {
      sessionStorage.removeItem(AUTH_KEY);
      return null;
    }
    return session;
  } catch { return null; }
}

function setSession(user) {
  const session = {
    userId: user.id || user.username,
    name: user.name,
    email: user.email,
    role: user.role,
    token: Math.random().toString(36).slice(2) + Date.now().toString(36),
    expiresAt: Date.now() + 8 * 60 * 60 * 1000 // 8 hours
  };
  sessionStorage.setItem(AUTH_KEY, JSON.stringify(session));
  return session;
}

function clearSession() {
  sessionStorage.removeItem(AUTH_KEY);
}

/* ─────────────────────────────────────────────
   AUTH GUARD — call at top of protected pages
   ───────────────────────────────────────────── */
function requireAuth(requiredRole = null) {
  const session = getSession();
  if (!session) {
    window.location.href = getBasePath() + 'login.html';
    return null;
  }
  if (requiredRole && session.role !== requiredRole) {
    if (session.role === 'admin') {
      window.location.href = getBasePath() + 'admin/panel.html';
    } else {
      window.location.href = getBasePath() + 'customer/dashboard.html';
    }
    return null;
  }
  return session;
}

function getBasePath() {
  // Calculate relative path back to root based on current page depth
  const depth = window.location.pathname.split('/').filter(Boolean).length - 1;
  return '../'.repeat(Math.max(0, depth));
}

/* ─────────────────────────────────────────────
   LOGIN
   ───────────────────────────────────────────── */
async function loginUser(identifier, password) {
  const hash = await sha256(password);

  // Check admin credentials first
  const admin = ADMIN_CREDENTIALS.find(a =>
    (a.username === identifier || a.email === identifier) && a.passwordHash === hash
  );
  if (admin) {
    const session = setSession(admin);
    return { success: true, role: 'admin', session };
  }

  // Check buyer credentials
  const buyers = getBuyersFromStorage();
  const buyer = buyers.find(b =>
    (b.email === identifier || b.mobile === identifier) && b.passwordHash === hash
  );
  if (buyer) {
    if (buyer.status === 'suspended') {
      return { success: false, error: 'Your account has been suspended. Contact support.' };
    }
    const session = setSession(buyer);
    return { success: true, role: 'buyer', session };
  }

  return { success: false, error: 'Invalid credentials. Please try again.' };
}

/* ─────────────────────────────────────────────
   USER STORAGE
   ───────────────────────────────────────────── */
function getBuyersFromStorage() {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) {
      localStorage.setItem(USERS_KEY, JSON.stringify(DEFAULT_BUYERS));
      return DEFAULT_BUYERS;
    }
    return JSON.parse(raw);
  } catch { return DEFAULT_BUYERS; }
}

async function registerBuyer(data) {
  const buyers = getBuyersFromStorage();
  const exists = buyers.find(b => b.email === data.email || b.mobile === data.mobile);
  if (exists) return { success: false, error: 'An account with this email/mobile already exists.' };

  const hash = await sha256(data.password);
  const newBuyer = {
    id: 'USR' + String(buyers.length + 1).padStart(3, '0'),
    name: data.name,
    email: data.email,
    mobile: data.mobile,
    passwordHash: hash,
    role: 'buyer',
    status: 'active',
    joined: new Date().toISOString().split('T')[0],
    verified: false,
    referral: data.referral || ''
  };
  buyers.push(newBuyer);
  localStorage.setItem(USERS_KEY, JSON.stringify(buyers));
  return { success: true, buyer: newBuyer };
}

/* ─────────────────────────────────────────────
   ORDER STORAGE
   ───────────────────────────────────────────── */
const ORDERS_KEY = 'jm_orders';
const REFUNDS_KEY = 'jm_refunds';

function getOrders() {
  try {
    const raw = localStorage.getItem(ORDERS_KEY);
    if (!raw) { localStorage.setItem(ORDERS_KEY, JSON.stringify(MOCK_ORDERS)); return MOCK_ORDERS; }
    return JSON.parse(raw);
  } catch { return MOCK_ORDERS; }
}

function getRefunds() {
  try {
    const raw = localStorage.getItem(REFUNDS_KEY);
    if (!raw) { localStorage.setItem(REFUNDS_KEY, JSON.stringify(MOCK_REFUNDS)); return MOCK_REFUNDS; }
    return JSON.parse(raw);
  } catch { return MOCK_REFUNDS; }
}

function saveOrders(orders) { localStorage.setItem(ORDERS_KEY, JSON.stringify(orders)); }
function saveRefunds(refunds) { localStorage.setItem(REFUNDS_KEY, JSON.stringify(refunds)); }

function getOrdersByUser(userId) { return getOrders().filter(o => o.userId === userId); }

function addOrder(order) {
  const orders = getOrders();
  order.id = 'ORD' + String(orders.length + 1).padStart(3, '0');
  orders.push(order);
  saveOrders(orders);
  return order;
}

function updateOrderStatus(orderId, status, extra = {}) {
  const orders = getOrders();
  const idx = orders.findIndex(o => o.id === orderId);
  if (idx === -1) return false;
  orders[idx] = { ...orders[idx], status, ...extra };
  saveOrders(orders);
  return true;
}

/* ─────────────────────────────────────────────
   REFUND TIMELINE HELPER
   Returns elapsed hours since submission, and stage
   ───────────────────────────────────────────── */
function getRefundTimeline(refund) {
  const submitted = new Date(refund.submittedAt);
  const now = new Date();
  const hoursElapsed = (now - submitted) / (1000 * 60 * 60);

  let stage = 'submitted'; // 0–6hr
  let nextStageIn = '';
  let progress = 0;

  if (hoursElapsed < 6) {
    stage = 'submitted'; progress = (hoursElapsed / 6) * 25; nextStageIn = `~${Math.ceil(6 - hoursElapsed)}hr`;
  } else if (hoursElapsed < 24) {
    stage = 'under_review'; progress = 25 + ((hoursElapsed - 6) / 18) * 25; nextStageIn = `~${Math.ceil(24 - hoursElapsed)}hr`;
  } else if (hoursElapsed < 36) {
    stage = 'processing'; progress = 50 + ((hoursElapsed - 24) / 12) * 25; nextStageIn = `~${Math.ceil(36 - hoursElapsed)}hr`;
  } else if (hoursElapsed < 48) {
    stage = 'approval'; progress = 75 + ((hoursElapsed - 36) / 12) * 25; nextStageIn = `~${Math.ceil(48 - hoursElapsed)}hr`;
  } else {
    stage = 'resolved'; progress = 100;
  }

  return { stage, progress: Math.min(100, Math.round(progress)), hoursElapsed: Math.round(hoursElapsed), nextStageIn };
}

/* ─────────────────────────────────────────────
   CSV EXPORT
   ───────────────────────────────────────────── */
function exportToCSV(data, filename) {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const csv = [
    headers.join(','),
    ...data.map(row => headers.map(h => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(','))
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

/* ─────────────────────────────────────────────
   STATUS LABELS & COLORS
   ───────────────────────────────────────────── */
const STATUS_META = {
  'order_filled':   { label: 'Order Filled',    color: '#1d4ed8', bg: '#dbeafe' },
  'under_review':   { label: 'Under Review',    color: '#92400e', bg: '#fef9c3' },
  'pending_review': { label: 'Pending Review',  color: '#6b21a8', bg: '#ede9fe' },
  'paid':           { label: 'Paid ✓',          color: '#15803d', bg: '#dcfce7' },
  'cancelled':      { label: 'Cancelled',       color: '#dc2626', bg: '#fef2f2' },
  'contact_mediator':{ label: 'Contact Mediator',color: '#ea580c', bg: '#fff7ed' },
  'pending':        { label: 'Pending',         color: '#92400e', bg: '#fef9c3' },
};

function statusPill(status) {
  const meta = STATUS_META[status] || { label: status, color: '#6b7280', bg: '#f3f4f6' };
  return `<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:99px;font-size:0.72rem;font-weight:700;background:${meta.bg};color:${meta.color};">● ${meta.label}</span>`;
}
