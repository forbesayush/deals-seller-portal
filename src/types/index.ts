// ─────────────────────────────────────────────
//  Shared TypeScript interfaces for the portal
//  Import from here instead of redefining locally
// ─────────────────────────────────────────────

export interface Deal {
  id: string;
  productCode: string;
  productName: string;
  platform: string;
  price: number;
  cashback: number;
  slots: number;
  active: boolean;
  category?: string;
  expiresAt?: string;
  description?: string;
  imageUrl?: string;
  rating?: number;
  dealType?: string;
  minOrderValue?: number;
  maxPerUser?: number;
  claimedCount?: number;
  featured?: boolean;
  tags?: string[];
  createdAt?: string;
}

export interface Order {
  id: string;
  orderNo: string;
  productCode: string;
  productName: string;
  platform: string;
  dealType: string;
  userId: string;
  userName: string;
  userEmail: string;
  mediator?: string;
  orderDate?: string;
  deliveryDate?: string;
  returnDate?: string;
  amount: number;
  deduction?: number;
  finalPayout?: number;
  status: string;
  screenshotUrl?: string;
  trackingNumber?: string;
  notes?: string;
  createdAt?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  mobile?: string | null;
  role: string;
  status: string;
  joined: string;
  verified: boolean;
  referral?: string;
}

export interface Refund {
  id: string;
  orderId: string;
  orderNo?: string;
  userId: string;
  userName?: string;
  reason: string;
  status: string;
  stage: number;
  amount?: number;
  createdAt?: string;
  resolvedAt?: string;
}

export interface Withdrawal {
  id: string;
  userId: string;
  userName?: string;
  amount: number;
  method: string;
  accountDetails?: string;
  status: string;
  createdAt?: string;
  processedAt?: string;
  notes?: string;
}

export interface Ticket {
  id: string;
  userId: string;
  userName?: string;
  subject: string;
  body: string;
  status: string;
  priority?: string;
  response?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  type: string;
  active: boolean;
  pinned?: boolean;
  createdAt?: string;
  expiresAt?: string;
}
