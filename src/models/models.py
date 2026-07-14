import json
from sqlalchemy import Column, String, Float, Integer, Boolean, ForeignKey, Text
from sqlalchemy.orm import relationship
from src.database.db import Base

class User(Base):
    __tablename__ = 'users'

    id            = Column(String(16), primary_key=True)   # USR001, ADM001, etc.
    name          = Column(String(100), nullable=False)
    email         = Column(String(120), unique=True, nullable=False)
    mobile        = Column(String(15), unique=True, nullable=True)
    password_hash = Column(String(64), nullable=False)
    role          = Column(String(20), nullable=False, default='buyer') # super_admin, admin, buyer, manager, auditor
    status        = Column(String(20), nullable=False, default='active') # active, suspended, deactivated
    joined        = Column(String(10), nullable=False) # YYYY-MM-DD
    verified      = Column(Boolean, default=False)
    referral       = Column(String(20), default='')
    upi            = Column(String(100), nullable=True)
    referrer_id    = Column(String(16), nullable=True)
    last_login     = Column(String(30), nullable=True)      # ISO timestamp
    login_count    = Column(Integer, default=0)
    two_fa_enabled = Column(Boolean, default=False)
    avatar_color   = Column(String(20), nullable=True, default='violet')   # NEW: profile avatar accent
    vip_tier       = Column(String(20), nullable=True, default='standard') # NEW: standard, silver, gold, platinum
    bio            = Column(String(300), nullable=True)                    # NEW: user bio/about
    kyc_status     = Column(String(20), nullable=True, default='pending')  # NEW: pending, verified, rejected
    total_earnings = Column(Float, default=0.0)                            # NEW: cumulative cashback earned
    suspended_reason = Column(String(200), nullable=True)                  # NEW: reason for suspension

    orders        = relationship('Order', back_populates='user', foreign_keys='Order.buyer_id')
    refunds       = relationship('Refund', back_populates='user')
    wallet        = relationship('Wallet', back_populates='user', uselist=False, cascade="all, delete-orphan")
    audit_logs    = relationship('AuditLog', back_populates='user')

    def to_dict(self, safe=True):
        d = {
            'id':       self.id,
            'name':     self.name,
            'email':    self.email,
            'mobile':   self.mobile,
            'role':     self.role,
            'status':   self.status,
            'joined':   self.joined,
            'verified': self.verified,
            'referral': self.referral,
            'upi':      self.upi,
            'referrerId': self.referrer_id,
            'avatarColor': self.avatar_color,
            'vipTier':  self.vip_tier,
            'bio':      self.bio,
            'kycStatus': self.kyc_status,
            'totalEarnings': self.total_earnings,
            'lastLogin': self.last_login,
            'loginCount': self.login_count,
        }
        if not safe:
            d['passwordHash'] = self.password_hash
        return d


class Order(Base):
    __tablename__ = 'orders'

    id              = Column(String(16), primary_key=True) # ORD001
    order_no        = Column(String(60), nullable=False, index=True)
    order_code      = Column(String(60), nullable=False, index=True) # generated Unique order code
    tracking_number = Column(String(60), nullable=True) # generated Tracking ID
    product_name    = Column(String(200), nullable=False)
    product_price   = Column(Float, default=0.0)
    quantity        = Column(Integer, default=1)
    buyer_id        = Column(String(16), ForeignKey('users.id'), nullable=False)
    cashback_pct    = Column(Float, default=0.0)
    cashback_amount = Column(Float, default=0.0)
    processing_fee  = Column(Float, default=0.0)
    deduction_amount= Column(Float, default=0.0)
    net_amount      = Column(Float, default=0.0)
    refund_status   = Column(String(30), default='not_eligible') # not_eligible, pending, approved, rejected, cleared
    approval_status = Column(String(30), default='pending_review') # pending_review, approved, rejected
    current_status  = Column(String(30), default='pending_review') # pending_review, order_filled, under_review, paid, cancelled
    order_date      = Column(String(10), nullable=False)
    submitted_date  = Column(String(10), nullable=True)
    paid_date       = Column(String(10), nullable=True)
    created_by_id   = Column(String(16), ForeignKey('users.id'), nullable=True)
    updated_by_id   = Column(String(16), ForeignKey('users.id'), nullable=True)
    screenshot      = Column(Boolean, default=False)
    screenshot_verified = Column(Boolean, default=False)
    notes           = Column(Text, nullable=True)
    deal_id         = Column(String(16), ForeignKey('deals.id'), nullable=True) # NEW: linked deal
    platform        = Column(String(60), nullable=True)                          # NEW: Amazon / Flipkart etc.
    priority        = Column(String(20), nullable=True, default='normal')        # NEW: normal, high, urgent

    user = relationship('User', back_populates='orders', foreign_keys=[buyer_id])
    refunds = relationship('Refund', back_populates='order', cascade="all, delete-orphan")

    def to_dict(self):
        return {
            'id':            self.id,
            'orderNo':       self.order_no,
            'orderCode':     self.order_code,
            'trackingNumber':self.tracking_number,
            'productName':   self.product_name,
            'productPrice':  self.product_price,
            'quantity':      self.quantity,
            'buyerId':       self.buyer_id,
            'cashbackPct':   self.cashback_pct,
            'cashbackAmount':self.cashback_amount,
            'processingFee': self.processing_fee,
            'deductionAmount':self.deduction_amount,
            'netAmount':     self.net_amount,
            'refundStatus':  self.refund_status,
            'approvalStatus':self.approval_status,
            'currentStatus': self.current_status,
            'orderDate':     self.order_date,
            'submittedDate': self.submitted_date,
            'paidDate':      self.paid_date,
            'createdBy':     self.created_by_id,
            'updatedBy':     self.updated_by_id,
            'screenshot':    self.screenshot,
            'screenshotVerified': self.screenshot_verified,
            'notes':         self.notes,
            'dealId':        self.deal_id,
            'platform':      self.platform,
            'priority':      self.priority,
        }


class Refund(Base):
    __tablename__ = 'refunds'

    id           = Column(String(16), primary_key=True) # REF001
    order_id     = Column(String(16), ForeignKey('orders.id'), nullable=True)
    order_no     = Column(String(60), nullable=False)
    user_id      = Column(String(16), ForeignKey('users.id'), nullable=False)
    user_name    = Column(String(100), nullable=False)
    reason       = Column(String(200), nullable=False)
    description  = Column(Text, nullable=True)
    upi          = Column(String(50), nullable=True)
    amount       = Column(Float, default=0.0)
    status       = Column(String(20), default='pending') # pending, under_review, resolved, rejected
    submitted_at = Column(String(30), nullable=False) # ISO timestamp
    reviewed_at  = Column(String(30), nullable=True)
    resolved_at  = Column(String(30), nullable=True)
    admin_note   = Column(String(300), nullable=True)  # NEW: admin note on refund decision

    user = relationship('User', back_populates='refunds')
    order = relationship('Order', back_populates='refunds')

    def to_dict(self):
        return {
            'id':          self.id,
            'orderId':     self.order_id,
            'orderNo':     self.order_no,
            'userId':      self.user_id,
            'userName':    self.user_name,
            'reason':      self.reason,
            'description': self.description,
            'upi':         self.upi,
            'amount':      self.amount,
            'status':      self.status,
            'submittedAt': self.submitted_at,
            'reviewedAt':  self.reviewed_at,
            'resolvedAt':  self.resolved_at,
            'adminNote':   self.admin_note,
        }


class Wallet(Base):
    __tablename__ = 'wallets'

    id                    = Column(String(16), primary_key=True) # WLT001
    user_id               = Column(String(16), ForeignKey('users.id'), nullable=False, unique=True)
    pending_cashback      = Column(Float, default=0.0)
    approved_cashback     = Column(Float, default=0.0)
    locked_cashback       = Column(Float, default=0.0)
    withdrawable_cashback = Column(Float, default=0.0)
    refund_balance        = Column(Float, default=0.0)
    last_updated          = Column(String(30), nullable=False)
    total_withdrawn       = Column(Float, default=0.0)   # NEW: cumulative withdrawal amount
    lifetime_earned       = Column(Float, default=0.0)   # NEW: lifetime cashback earned

    user = relationship('User', back_populates='wallet')
    transactions = relationship('Transaction', back_populates='wallet', cascade="all, delete-orphan")

    def to_dict(self):
        return {
            'id':                   self.id,
            'userId':               self.user_id,
            'pendingCashback':      self.pending_cashback,
            'approvedCashback':     self.approved_cashback,
            'lockedCashback':       self.locked_cashback,
            'withdrawableCashback': self.withdrawable_cashback,
            'refundBalance':        self.refund_balance,
            'lastUpdated':          self.last_updated,
            'totalWithdrawn':       self.total_withdrawn,
            'lifetimeEarned':       self.lifetime_earned,
        }


class Transaction(Base):
    __tablename__ = 'transactions'

    id          = Column(String(16), primary_key=True) # TXN001
    wallet_id   = Column(String(16), ForeignKey('wallets.id'), nullable=False)
    order_id    = Column(String(16), ForeignKey('orders.id'), nullable=True)
    amount      = Column(Float, default=0.0)
    type        = Column(String(10), nullable=False) # credit | debit
    category    = Column(String(30), nullable=False) # cashback_pending, cashback_approved, withdrawal, refund_credit, etc.
    status      = Column(String(20), default='pending') # pending | completed | failed
    description = Column(String(255), nullable=True)
    timestamp   = Column(String(30), nullable=False) # ISO timestamp

    wallet = relationship('Wallet', back_populates='transactions')

    def to_dict(self):
        return {
            'id':          self.id,
            'walletId':    self.wallet_id,
            'orderId':     self.order_id,
            'amount':      self.amount,
            'type':        self.type,
            'category':    self.category,
            'status':      self.status,
            'description': self.description,
            'timestamp':   self.timestamp
        }


class AuditLog(Base):
    __tablename__ = 'audit_logs'

    id          = Column(String(16), primary_key=True) # LOG001
    user_id     = Column(String(16), ForeignKey('users.id'), nullable=True)
    user_email  = Column(String(120), nullable=False)
    action      = Column(String(100), nullable=False)
    target_type = Column(String(50), nullable=False)
    target_id   = Column(String(50), nullable=True)
    timestamp   = Column(String(30), nullable=False)
    ip_address  = Column(String(45), nullable=True)
    user_agent  = Column(String(255), nullable=True)
    old_data    = Column(Text, nullable=True) # JSON dump
    new_data    = Column(Text, nullable=True) # JSON dump
    severity    = Column(String(20), nullable=True, default='info')  # NEW: info, warning, critical

    user = relationship('User', back_populates='audit_logs')

    def to_dict(self):
        return {
            'id':         self.id,
            'userId':     self.user_id,
            'userEmail':  self.user_email,
            'action':     self.action,
            'targetType': self.target_type,
            'targetId':   self.target_id,
            'timestamp':  self.timestamp,
            'ipAddress':  self.ip_address,
            'userAgent':  self.user_agent,
            'oldData':    json.loads(self.old_data) if self.old_data else None,
            'newData':    json.loads(self.new_data) if self.new_data else None,
            'severity':   self.severity,
        }


class Deal(Base):
    __tablename__ = 'deals'

    id           = Column(String(16), primary_key=True)   # DEA001
    product_code = Column(String(60), unique=True, nullable=False, index=True)
    product_name = Column(String(200), nullable=False)
    platform     = Column(String(60), nullable=False)
    price        = Column(Float, default=0.0)
    cashback     = Column(Float, default=0.0)
    slots        = Column(Integer, default=5)
    active       = Column(Boolean, default=True)
    category     = Column(String(60), nullable=True, default='General')
    expires_at   = Column(String(20), nullable=True)
    # NEW fields
    description  = Column(Text, nullable=True)             # Deal description
    image_url    = Column(String(500), nullable=True)      # Product image URL
    rating       = Column(Float, default=4.0)              # Seller rating (1-5)
    deal_type    = Column(String(30), nullable=True, default='cashback')  # cashback, discount, bonus
    min_order_value = Column(Float, default=0.0)           # Minimum order value
    max_per_user = Column(Integer, default=1)              # Max orders per user for this deal
    claimed_count = Column(Integer, default=0)             # How many times claimed
    featured     = Column(Boolean, default=False)          # Show in featured section
    tags         = Column(String(300), nullable=True)      # Comma-separated tags
    created_at   = Column(String(30), nullable=True)       # ISO timestamp

    def to_dict(self):
        return {
            'id':          self.id,
            'productCode': self.product_code,
            'productName': self.product_name,
            'platform':    self.platform,
            'price':       self.price,
            'cashback':    self.cashback,
            'slots':       self.slots,
            'active':      self.active,
            'category':    self.category,
            'expiresAt':   self.expires_at,
            'description': self.description,
            'imageUrl':    self.image_url,
            'rating':      self.rating,
            'dealType':    self.deal_type,
            'minOrderValue': self.min_order_value,
            'maxPerUser':  self.max_per_user,
            'claimedCount': self.claimed_count,
            'featured':    self.featured,
            'tags':        self.tags.split(',') if self.tags else [],
            'createdAt':   self.created_at,
        }


class Withdrawal(Base):
    __tablename__ = 'withdrawals'

    id           = Column(String(16), primary_key=True)   # WTH001
    user_id      = Column(String(16), ForeignKey('users.id'), nullable=False)
    upi          = Column(String(100), nullable=False)
    amount       = Column(Float, nullable=False)
    status       = Column(String(30), default='pending')  # pending, approved, rejected
    created_at   = Column(String(30), nullable=False)     # ISO timestamp
    processed_at = Column(String(30), nullable=True)
    admin_note   = Column(String(200), nullable=True)     # NEW: admin note
    txn_ref      = Column(String(80), nullable=True)      # NEW: payment reference

    user = relationship('User', foreign_keys=[user_id])

    def to_dict(self):
        return {
            'id':          self.id,
            'userId':      self.user_id,
            'upi':         self.upi,
            'amount':      self.amount,
            'status':      self.status,
            'createdAt':   self.created_at,
            'processedAt': self.processed_at,
            'adminNote':   self.admin_note,
            'txnRef':      self.txn_ref,
        }


class Ticket(Base):
    __tablename__ = 'tickets'

    id          = Column(String(16), primary_key=True)   # TKT001
    user_id     = Column(String(16), ForeignKey('users.id'), nullable=False)
    title       = Column(String(150), nullable=False)
    description = Column(Text, nullable=False)
    category    = Column(String(50), nullable=False)     # e.g., payout, cashback, general
    status      = Column(String(30), default='open')     # open, in_progress, resolved, closed
    priority    = Column(String(20), default='normal')   # NEW: low, normal, high, urgent
    reply       = Column(Text, nullable=True)
    created_at  = Column(String(30), nullable=False)     # ISO timestamp
    updated_at  = Column(String(30), nullable=True)      # NEW: last update timestamp
    resolved_at = Column(String(30), nullable=True)      # NEW: resolution timestamp

    user = relationship('User', foreign_keys=[user_id])

    def to_dict(self):
        return {
            'id':          self.id,
            'userId':      self.user_id,
            'title':       self.title,
            'description': self.description,
            'category':    self.category,
            'status':      self.status,
            'priority':    self.priority,
            'reply':       self.reply,
            'createdAt':   self.created_at,
            'updatedAt':   self.updated_at,
            'resolvedAt':  self.resolved_at,
        }


# ─────────────────────────────────────────────
#  SYSTEM CONFIGURATION
# ─────────────────────────────────────────────
class SystemSetting(Base):
    __tablename__ = 'system_settings'

    key         = Column(String(80), primary_key=True)   # e.g. platform_fee_pct
    value       = Column(String(200), nullable=False)
    description = Column(String(300), nullable=True)
    updated_at  = Column(String(30), nullable=True)

    def to_dict(self):
        return {'key': self.key, 'value': self.value, 'description': self.description, 'updatedAt': self.updated_at}


# ─────────────────────────────────────────────
#  ANNOUNCEMENTS (Admin → All Buyers)
# ─────────────────────────────────────────────
class Announcement(Base):
    __tablename__ = 'announcements'

    id         = Column(String(16), primary_key=True)   # ANN001
    author_id  = Column(String(16), ForeignKey('users.id'), nullable=False)
    title      = Column(String(200), nullable=False)
    body       = Column(Text, nullable=False)
    priority   = Column(String(20), default='normal')   # normal, urgent, info
    active     = Column(Boolean, default=True)
    created_at = Column(String(30), nullable=False)
    expires_at = Column(String(30), nullable=True)       # NEW: optional expiry
    target_role = Column(String(20), nullable=True)      # NEW: target specific role or all

    author = relationship('User', foreign_keys=[author_id])

    def to_dict(self):
        return {
            'id': self.id, 'authorId': self.author_id, 'title': self.title,
            'body': self.body, 'priority': self.priority,
            'active': self.active, 'createdAt': self.created_at,
            'expiresAt': self.expires_at, 'targetRole': self.target_role,
        }


# ─────────────────────────────────────────────
#  LOGIN SESSIONS
# ─────────────────────────────────────────────
class LoginSession(Base):
    __tablename__ = 'login_sessions'

    id         = Column(String(16), primary_key=True)   # SES001
    user_id    = Column(String(16), ForeignKey('users.id'), nullable=False)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(300), nullable=True)
    token_hash = Column(String(64), nullable=True)       # sha256 of JWT
    active     = Column(Boolean, default=True)
    created_at = Column(String(30), nullable=False)
    ended_at   = Column(String(30), nullable=True)

    user = relationship('User', foreign_keys=[user_id])

    def to_dict(self):
        return {
            'id': self.id, 'userId': self.user_id, 'ipAddress': self.ip_address,
            'userAgent': self.user_agent, 'active': self.active,
            'createdAt': self.created_at, 'endedAt': self.ended_at
        }


# ─────────────────────────────────────────────
#  ORDER STATUS CHANGE LOG
# ─────────────────────────────────────────────
class OrderStatusLog(Base):
    __tablename__ = 'order_status_logs'

    id          = Column(String(16), primary_key=True)   # OSL001
    order_id    = Column(String(16), ForeignKey('orders.id'), nullable=False)
    actor_id    = Column(String(16), ForeignKey('users.id'), nullable=False)
    from_status = Column(String(50), nullable=True)
    to_status   = Column(String(50), nullable=False)
    note        = Column(String(300), nullable=True)
    timestamp   = Column(String(30), nullable=False)

    order = relationship('Order', foreign_keys=[order_id])
    actor = relationship('User', foreign_keys=[actor_id])

    def to_dict(self):
        return {
            'id': self.id, 'orderId': self.order_id, 'actorId': self.actor_id,
            'fromStatus': self.from_status, 'toStatus': self.to_status,
            'note': self.note, 'timestamp': self.timestamp
        }


# ─────────────────────────────────────────────
#  DEAL SLOT HISTORY
# ─────────────────────────────────────────────
class DealSlotHistory(Base):
    __tablename__ = 'deal_slot_history'

    id        = Column(String(16), primary_key=True)   # DSH001
    deal_id   = Column(String(16), ForeignKey('deals.id'), nullable=False)
    actor_id  = Column(String(16), ForeignKey('users.id'), nullable=False)
    old_slots = Column(Integer, nullable=False)
    new_slots = Column(Integer, nullable=False)
    reason    = Column(String(200), nullable=True)
    timestamp = Column(String(30), nullable=False)

    deal  = relationship('Deal', foreign_keys=[deal_id])
    actor = relationship('User', foreign_keys=[actor_id])

    def to_dict(self):
        return {
            'id': self.id, 'dealId': self.deal_id, 'actorId': self.actor_id,
            'oldSlots': self.old_slots, 'newSlots': self.new_slots,
            'reason': self.reason, 'timestamp': self.timestamp
        }


# ─────────────────────────────────────────────
#  FEATURE FLAGS (NEW - Feature 39/40)
# ─────────────────────────────────────────────
class FeatureFlag(Base):
    __tablename__ = 'feature_flags'

    key         = Column(String(80), primary_key=True)   # e.g. enable_referral
    enabled     = Column(Boolean, default=True)
    description = Column(String(300), nullable=True)
    updated_at  = Column(String(30), nullable=True)
    updated_by  = Column(String(16), nullable=True)

    def to_dict(self):
        return {
            'key': self.key, 'enabled': self.enabled,
            'description': self.description, 'updatedAt': self.updated_at,
            'updatedBy': self.updated_by
        }


# ─────────────────────────────────────────────
#  REFERRAL EARNINGS (NEW - Feature 9)
# ─────────────────────────────────────────────
class ReferralEarning(Base):
    __tablename__ = 'referral_earnings'

    id            = Column(String(16), primary_key=True)   # REA001
    referrer_id   = Column(String(16), ForeignKey('users.id'), nullable=False)
    referred_id   = Column(String(16), ForeignKey('users.id'), nullable=False)
    amount        = Column(Float, default=50.0)
    status        = Column(String(20), default='credited')  # credited, pending
    created_at    = Column(String(30), nullable=False)

    referrer = relationship('User', foreign_keys=[referrer_id])
    referred = relationship('User', foreign_keys=[referred_id])

    def to_dict(self):
        return {
            'id': self.id, 'referrerId': self.referrer_id,
            'referredId': self.referred_id, 'amount': self.amount,
            'status': self.status, 'createdAt': self.created_at
        }


# ─────────────────────────────────────────────
#  NOTIFICATION LOG (NEW - Feature 10/38)
# ─────────────────────────────────────────────
class NotificationLog(Base):
    __tablename__ = 'notification_logs'

    id         = Column(String(16), primary_key=True)   # NTF001
    user_id    = Column(String(16), ForeignKey('users.id'), nullable=False)
    title      = Column(String(200), nullable=False)
    body       = Column(Text, nullable=True)
    type       = Column(String(40), nullable=False)  # cashback, order, system, referral, announcement
    read       = Column(Boolean, default=False)
    created_at = Column(String(30), nullable=False)

    user = relationship('User', foreign_keys=[user_id])

    def to_dict(self):
        return {
            'id': self.id, 'userId': self.user_id, 'title': self.title,
            'body': self.body, 'type': self.type, 'read': self.read,
            'createdAt': self.created_at
        }
