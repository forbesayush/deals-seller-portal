/**
 * auth.js — Secure Session Auth Module (Flask Backend Edition)
 * All data operations now hit the Flask REST API at /api/
 * Session state is still tracked in sessionStorage for fast client-side guards
 * Roles: 'admin' | 'buyer'
 */

const AUTH_KEY = 'jm_session';

/* ─────────────────────────────────────────────
   API BASE — auto-detects local Flask vs GitHub Pages
   ───────────────────────────────────────────── */
const IS_LOCAL = (
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1'
);
const API_BASE = IS_LOCAL ? '' : ''; // relative paths work on both

/* ─────────────────────────────────────────────
   HASHING UTILITY (kept for backward compat)
   ───────────────────────────────────────────── */
async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/* ─────────────────────────────────────────────
   SESSION MANAGEMENT (client-side cache)
   ───────────────────────────────────────────── */
function getSession() {
  try {
    const raw = sessionStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (Date.now() > session.expiresAt) {
      sessionStorage.removeItem(AUTH_KEY);
      return null;
    }
    return session;
  } catch { return null; }
}

function setSession(user) {
  const session = {
    userId:    user.id,
    name:      user.name,
    email:     user.email,
    role:      user.role,
    token:     Math.random().toString(36).slice(2) + Date.now().toString(36),
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
  const depth = window.location.pathname.split('/').filter(Boolean).length - 1;
  return '../'.repeat(Math.max(0, depth));
}

/* ─────────────────────────────────────────────
   LOGIN — calls POST /api/login
   Falls back to localStorage mock if server is unreachable
   ───────────────────────────────────────────── */
async function loginUser(identifier, password) {
  if (IS_LOCAL) {
    // ── Flask backend login ──
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ identifier, password })
      });
      const data = await res.json();

      if (res.ok) {
        // Flask accepted — normal path
        const session = setSession(data.user);
        return { success: true, role: data.user.role, session };
      }

      if (res.status === 401) {
        // Flask rejected credentials — try client-side admin fallback
        // (covers case where DB hasn't been seeded yet with the admin account)
        const localResult = await loginUserLocal(identifier, password);
        if (localResult.success) {
          console.info('[auth] Flask 401 but client-side admin matched — using local session.');
          return localResult;
        }
      }

      // Neither Flask nor local matched
      return { success: false, error: data.error || 'Login failed.' };

    } catch (err) {
      // Network error — full local fallback
      console.warn('API unreachable, falling back to local auth:', err);
      return loginUserLocal(identifier, password);
    }
  } else {
    // ── Static / GitHub Pages fallback ──
    return loginUserLocal(identifier, password);
  }
}

/* ─────────────────────────────────────────────
   LOCAL FALLBACK LOGIN (static deployment)
   ───────────────────────────────────────────── */
const ADMIN_CREDENTIALS = [
  { id: 'ADM001', username: 'admin', email: 'admin@deals.seller.com', passwordHash: 'b3e73ec26847ae28e19d7b0cfec7d76aab61f5d6eb59c00e32bc02e3d2bd2e83', role: 'admin', name: 'Admin — deals.seller' },
  { id: 'ADM002', username: 'owner', email: 'owner@deals.seller.com', passwordHash: '4c91e0e9e1c23ade81b6a30d9cc9ce3f1e2eaa08a1a4dd9c0e1c6ad65d61e4c9', role: 'admin', name: 'Owner — deals.seller' },
  { id: 'ADM003', username: 'ekta',  email: 'ekta@deals.seller.com',  passwordHash: 'da96ff4204b8f80e718e8a3461ae2a1279a063a08d5c3b6ab514c5acb2b77eb0', role: 'admin', name: 'Ekta — Admin' },
];

const USERS_KEY  = 'jm_users';
const ORDERS_KEY = 'jm_orders';
const REFUNDS_KEY= 'jm_refunds';

const DEFAULT_BUYERS = [
  { id: 'USR001', name: 'Ayush Chatterjee', email: 'alwaysayushsourav162@gmail.com', mobile: '9123337436', passwordHash: 'e3d8ba6ba5bbb61b30a1a29d3ad78b8af4d9ee16f08f1a1462e03b0e6e2d9c2e', role: 'buyer', status: 'active',    joined: '2026-01-15', verified: true,  referral: '' },
  { id: 'USR002', name: 'Shivam Raj',       email: 'shivamraj@example.com',          mobile: '7050798925', passwordHash: '17b6fb861392b3472596b41e100e62a0d8fe6171da538a16f1d1a296f7294fb4', role: 'buyer', status: 'active',    joined: '2026-02-10', verified: true,  referral: '' },
  { id: 'USR003', name: 'Priya Sharma',     email: 'priya@example.com',              mobile: '9988776655', passwordHash: 'e3d8ba6ba5bbb61b30a1a29d3ad78b8af4d9ee16f08f1a1462e03b0e6e2d9c2e', role: 'buyer', status: 'active',    joined: '2026-03-05', verified: true,  referral: 'REF001' },
  { id: 'USR004', name: 'Rahul Mehta',      email: 'rahul@example.com',              mobile: '9812345678', passwordHash: 'e3d8ba6ba5bbb61b30a1a29d3ad78b8af4d9ee16f08f1a1462e03b0e6e2d9c2e', role: 'buyer', status: 'suspended', joined: '2026-04-01', verified: false, referral: '' },
];

async function loginUserLocal(identifier, password) {
  const hash = await sha256(password);

  // Check admin credentials
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
   LOGOUT
   ───────────────────────────────────────────── */
async function logoutUser() {
  clearSession();
  if (IS_LOCAL) {
    try {
      await fetch('/api/logout', { method: 'POST', credentials: 'include' });
    } catch (_) {}
  }
  window.location.href = getBasePath() + 'login.html';
}

/* ─────────────────────────────────────────────
   USER STORAGE (local fallback)
   ───────────────────────────────────────────── */
function getBuyersFromStorage() {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) { localStorage.setItem(USERS_KEY, JSON.stringify(DEFAULT_BUYERS)); return DEFAULT_BUYERS; }
    return JSON.parse(raw);
  } catch { return DEFAULT_BUYERS; }
}

/* ─────────────────────────────────────────────
   REGISTER — calls POST /api/register
   ───────────────────────────────────────────── */
async function registerBuyer(data) {
  if (IS_LOCAL) {
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      });
      const json = await res.json();
      if (!res.ok) return { success: false, error: json.error || 'Registration failed.' };
      setSession(json.user);
      return { success: true, buyer: json.user };
    } catch (err) {
      console.warn('API unreachable, using local registration:', err);
      return registerBuyerLocal(data);
    }
  } else {
    return registerBuyerLocal(data);
  }
}

async function registerBuyerLocal(data) {
  const buyers = getBuyersFromStorage();
  const exists = buyers.find(b => b.email === data.email || b.mobile === data.mobile);
  if (exists) return { success: false, error: 'An account with this email/mobile already exists.' };

  const hash = await sha256(data.password);
  const newBuyer = {
    id: 'USR' + String(buyers.length + 1).padStart(3, '0'),
    name: data.name, email: data.email, mobile: data.mobile,
    passwordHash: hash, role: 'buyer', status: 'active',
    joined: new Date().toISOString().split('T')[0],
    verified: false, referral: data.referral || ''
  };
  buyers.push(newBuyer);
  localStorage.setItem(USERS_KEY, JSON.stringify(buyers));
  return { success: true, buyer: newBuyer };
}

/* ─────────────────────────────────────────────
   ORDERS — GET /api/orders or localStorage
   ───────────────────────────────────────────── */
const MOCK_ORDERS = [
  { id: 'ORD001', orderNo: '402-0025862-2109921', productCode: 'ANT_COSMOS_3MODE_GAMING_CONTROLLER', platform: 'Amazon',   userId: 'USR002', mediator: 'Aman Pandey', dealType: 'Image Review', orderDate: '2026-06-26', submittedDate: '2026-06-26', amount: 1441.05, deduction: 300.00, finalPayout: 1141.05, status: 'order_filled',   refundStatus: null,           paidDate: null,        screenshot: true  },
  { id: 'ORD002', orderNo: '406-1422779-1212359', productCode: 'PNC_GREYSHOEWASHINGBAG_AZ',         platform: 'Amazon',   userId: 'USR001', mediator: 'Aman Pandey', dealType: 'Review',       orderDate: '2026-06-16', submittedDate: '2026-06-17', amount: 249.00,  deduction: 20.00,  finalPayout: 229.00,   status: 'order_filled',   refundStatus: null,           paidDate: null,        screenshot: true  },
  { id: 'ORD003', orderNo: '402-0437892-3137934', productCode: 'PNC_BLACKHEADREMOVER_AZ',           platform: 'Amazon',   userId: 'USR001', mediator: 'Aman Pandey', dealType: 'Review',       orderDate: '2026-05-18', submittedDate: '2026-05-18', amount: 299.00,  deduction: 23.00,  finalPayout: 276.00,   status: 'paid',           refundStatus: 'cleared',      paidDate: '2026-06-01', screenshot: true  },
  { id: 'ORD004', orderNo: '402-5031051-7769965', productCode: 'PNC_BLACKHEADREMOVER_AZ',           platform: 'Amazon',   userId: 'USR001', mediator: 'Aman Pandey', dealType: 'Review',       orderDate: '2026-05-18', submittedDate: '2026-05-18', amount: 299.00,  deduction: 23.00,  finalPayout: 276.00,   status: 'cancelled',      refundStatus: 'not_eligible', paidDate: null,        screenshot: true  },
  { id: 'ORD005', orderNo: '403-1863178-4809140', productCode: 'PNC_KAPOOREXCH_AZ',                platform: 'Amazon',   userId: 'USR001', mediator: 'Aman Pandey', dealType: 'Review',       orderDate: '2026-05-07', submittedDate: '2026-05-07', amount: 215.00,  deduction: 18.00,  finalPayout: 197.00,   status: 'paid',           refundStatus: 'cleared',      paidDate: '2026-05-23', screenshot: true  },
  { id: 'ORD006', orderNo: '408-1123456-9087654', productCode: 'PHI_USB_CABLE_AZ',                  platform: 'Amazon',   userId: 'USR002', mediator: 'Aman Pandey', dealType: 'Review',       orderDate: '2026-06-20', submittedDate: '2026-06-21', amount: 450.00,  deduction: 35.00,  finalPayout: 415.00,   status: 'under_review',   refundStatus: 'pending',      paidDate: null,        screenshot: true  },
  { id: 'ORD007', orderNo: 'FLK-9876543210',      productCode: 'FLK_REDMI13C_128GB',               platform: 'Flipkart', userId: 'USR003', mediator: 'Aman Pandey', dealType: 'Rating',       orderDate: '2026-06-25', submittedDate: '2026-06-25', amount: 8999.00, deduction: 200.00, finalPayout: 8799.00,  status: 'order_filled',   refundStatus: null,           paidDate: null,        screenshot: false },
  { id: 'ORD008', orderNo: 'BLK-1122334455',      productCode: 'BLK_AMUL_BUTTER_500G',             platform: 'Blinkit',  userId: 'USR003', mediator: 'Direct',       dealType: 'Review',       orderDate: '2026-07-01', submittedDate: '2026-07-01', amount: 290.00,  deduction: 25.00,  finalPayout: 265.00,   status: 'pending_review', refundStatus: null,           paidDate: null,        screenshot: true  },
];

const MOCK_REFUNDS = [
  { id: 'REF001', orderId: 'ORD003', orderNo: '402-0437892-3137934', userId: 'USR001', userName: 'Ayush Chatterjee', reason: 'Cashback not credited',   submittedAt: '2026-05-20T10:30:00', reviewedAt: '2026-05-21T14:45:00', resolvedAt: '2026-05-22T09:00:00', amount: 276.00,  upi: 'ayush@upi',  status: 'resolved' },
  { id: 'REF002', orderId: 'ORD006', orderNo: '408-1123456-9087654', userId: 'USR002', userName: 'Shivam Raj',       reason: 'Wrong product delivered', submittedAt: '2026-06-22T08:00:00', reviewedAt: null, resolvedAt: null,                  amount: 415.00,  upi: 'shivam@upi', status: 'pending' },
  { id: 'REF003', orderId: 'ORD007', orderNo: 'FLK-9876543210',      userId: 'USR003', userName: 'Priya Sharma',     reason: 'Order not delivered',     submittedAt: '2026-06-27T16:20:00', reviewedAt: '2026-06-27T18:00:00', resolvedAt: null, amount: 8799.00, upi: 'priya@upi',  status: 'under_review' },
];

async function getOrders(userId = null) {
  if (IS_LOCAL) {
    try {
      const url = userId ? `/api/orders?user_id=${userId}` : '/api/orders';
      const res = await fetch(url, { credentials: 'include' });
      const data = await res.json();
      if (data.success) return data.orders;
    } catch (err) { console.warn('API unreachable, using mock orders:', err); }
  }
  // Fallback
  const stored = localStorage.getItem(ORDERS_KEY);
  const orders = stored ? JSON.parse(stored) : MOCK_ORDERS;
  return userId ? orders.filter(o => o.userId === userId) : orders;
}

async function getRefunds(userId = null) {
  if (IS_LOCAL) {
    try {
      const res = await fetch('/api/refunds', { credentials: 'include' });
      const data = await res.json();
      if (data.success) return data.refunds;
    } catch (err) { console.warn('API unreachable, using mock refunds:', err); }
  }
  const stored = localStorage.getItem(REFUNDS_KEY);
  const refunds = stored ? JSON.parse(stored) : MOCK_REFUNDS;
  return userId ? refunds.filter(r => r.userId === userId) : refunds;
}

async function addOrder(orderData) {
  if (IS_LOCAL) {
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(orderData)
      });
      const data = await res.json();
      if (data.success) return data.order;
    } catch (err) { console.warn('API unreachable, saving locally:', err); }
  }
  // Local fallback
  const stored = localStorage.getItem(ORDERS_KEY);
  const orders = stored ? JSON.parse(stored) : [...MOCK_ORDERS];
  orderData.id = 'ORD' + String(orders.length + 1).padStart(3, '0');
  orders.push(orderData);
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  return orderData;
}

async function addRefund(refundData) {
  if (IS_LOCAL) {
    try {
      const res = await fetch('/api/refunds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(refundData)
      });
      const data = await res.json();
      if (data.success) return data.refund;
    } catch (err) { console.warn('API unreachable, saving locally:', err); }
  }
  const stored = localStorage.getItem(REFUNDS_KEY);
  const refunds = stored ? JSON.parse(stored) : [...MOCK_REFUNDS];
  refundData.id = 'REF' + String(refunds.length + 1).padStart(3, '0');
  refunds.push(refundData);
  localStorage.setItem(REFUNDS_KEY, JSON.stringify(refunds));
  return refundData;
}

async function updateOrderStatus(orderId, status, extra = {}) {
  if (IS_LOCAL) {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status, ...extra })
      });
      const data = await res.json();
      return data.success;
    } catch (err) { console.warn('API unreachable:', err); }
  }
  // Local fallback
  const stored = localStorage.getItem(ORDERS_KEY);
  const orders = stored ? JSON.parse(stored) : [...MOCK_ORDERS];
  const idx = orders.findIndex(o => o.id === orderId);
  if (idx === -1) return false;
  orders[idx] = { ...orders[idx], status, ...extra };
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  return true;
}

async function getUsers() {
  if (IS_LOCAL) {
    try {
      const res = await fetch('/api/users', { credentials: 'include' });
      const data = await res.json();
      if (data.success) return data.users;
    } catch (err) { console.warn('API unreachable, using local users:', err); }
  }
  return getBuyersFromStorage();
}

async function getStats() {
  if (IS_LOCAL) {
    try {
      const res = await fetch('/api/stats', { credentials: 'include' });
      const data = await res.json();
      if (data.success) return data.stats;
    } catch (err) { console.warn('API unreachable, computing stats locally:', err); }
  }
  // Compute locally
  const orders = await getOrders();
  const users = getBuyersFromStorage();
  const refunds = await getRefunds();
  return {
    totalOrders:   orders.length,
    totalBuyers:   users.length,
    totalRefunds:  refunds.length,
    pendingRefunds: refunds.filter(r => r.status === 'pending').length,
    paidOrders:    orders.filter(o => o.status === 'paid').length,
    totalPayout:   orders.filter(o => o.status === 'paid').reduce((s, o) => s + (o.finalPayout || 0), 0),
  };
}

/* ─────────────────────────────────────────────
   REFUND TIMELINE HELPER
   ───────────────────────────────────────────── */
function getRefundTimeline(refund) {
  const submitted = new Date(refund.submittedAt);
  const now = new Date();
  const hoursElapsed = (now - submitted) / (1000 * 60 * 60);

  let stage = 'submitted';
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
  'order_filled':    { label: 'Order Filled',     color: '#1d4ed8', bg: '#dbeafe' },
  'under_review':    { label: 'Under Review',     color: '#92400e', bg: '#fef9c3' },
  'pending_review':  { label: 'Pending Review',   color: '#6b21a8', bg: '#ede9fe' },
  'paid':            { label: 'Paid ✓',           color: '#15803d', bg: '#dcfce7' },
  'cancelled':       { label: 'Cancelled',        color: '#dc2626', bg: '#fef2f2' },
  'contact_mediator':{ label: 'Contact Mediator', color: '#ea580c', bg: '#fff7ed' },
  'pending':         { label: 'Pending',          color: '#92400e', bg: '#fef9c3' },
};

function statusPill(status) {
  const meta = STATUS_META[status] || { label: status, color: '#6b7280', bg: '#f3f4f6' };
  return `<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:99px;font-size:0.72rem;font-weight:700;background:${meta.bg};color:${meta.color};">● ${meta.label}</span>`;
}

/* ─────────────────────────────────────────────
   LEGACY SYNC WRAPPERS (for pages not yet async)
   These preserved for backward compat with any
   non-async callers
   ───────────────────────────────────────────── */
function getOrdersByUser(userId) {
  const stored = localStorage.getItem(ORDERS_KEY);
  const orders = stored ? JSON.parse(stored) : MOCK_ORDERS;
  return orders.filter(o => o.userId === userId);
}

function saveOrders(orders) { localStorage.setItem(ORDERS_KEY, JSON.stringify(orders)); }
function saveRefunds(refunds) { localStorage.setItem(REFUNDS_KEY, JSON.stringify(refunds)); }
