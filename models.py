"""
models.py — SQLAlchemy database models for deals.seller portal
"""

from datetime import datetime
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


# ─────────────────────────────────────────
#  USER MODEL
# ─────────────────────────────────────────
class User(db.Model):
    __tablename__ = 'users'

    id           = db.Column(db.String(16), primary_key=True)   # e.g. USR001
    name         = db.Column(db.String(100), nullable=False)
    email        = db.Column(db.String(120), unique=True, nullable=False)
    mobile       = db.Column(db.String(15),  unique=True, nullable=True)
    password_hash= db.Column(db.String(64),  nullable=False)    # SHA-256 hex
    role         = db.Column(db.String(10),  nullable=False, default='buyer')  # 'buyer' | 'admin'
    status       = db.Column(db.String(15),  nullable=False, default='active') # 'active' | 'suspended'
    joined       = db.Column(db.String(10),  nullable=False)    # YYYY-MM-DD
    verified     = db.Column(db.Boolean,     default=False)
    referral     = db.Column(db.String(20),  default='')

    orders       = db.relationship('Order',  backref='user', lazy=True)
    refunds      = db.relationship('Refund', backref='user', lazy=True)

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
        }
        if not safe:
            d['passwordHash'] = self.password_hash
        return d


# ─────────────────────────────────────────
#  ORDER MODEL
# ─────────────────────────────────────────
class Order(db.Model):
    __tablename__ = 'orders'

    id              = db.Column(db.String(16), primary_key=True)        # e.g. ORD001
    order_no        = db.Column(db.String(60), nullable=False)
    product_code    = db.Column(db.String(80), nullable=False)
    platform        = db.Column(db.String(30), nullable=False)
    user_id         = db.Column(db.String(16), db.ForeignKey('users.id'), nullable=False)
    mediator        = db.Column(db.String(50), nullable=False)
    deal_type       = db.Column(db.String(30), nullable=False)
    order_date      = db.Column(db.String(10), nullable=False)
    submitted_date  = db.Column(db.String(10), nullable=True)
    amount          = db.Column(db.Float,      default=0.0)
    deduction       = db.Column(db.Float,      default=0.0)
    final_payout    = db.Column(db.Float,      default=0.0)
    status          = db.Column(db.String(30), default='pending_review')
    refund_status   = db.Column(db.String(30), nullable=True)
    paid_date       = db.Column(db.String(10), nullable=True)
    screenshot      = db.Column(db.Boolean,    default=False)

    def to_dict(self):
        return {
            'id':            self.id,
            'orderNo':       self.order_no,
            'productCode':   self.product_code,
            'platform':      self.platform,
            'userId':        self.user_id,
            'mediator':      self.mediator,
            'dealType':      self.deal_type,
            'orderDate':     self.order_date,
            'submittedDate': self.submitted_date,
            'amount':        self.amount,
            'deduction':     self.deduction,
            'finalPayout':   self.final_payout,
            'status':        self.status,
            'refundStatus':  self.refund_status,
            'paidDate':      self.paid_date,
            'screenshot':    self.screenshot,
        }


# ─────────────────────────────────────────
#  REFUND MODEL
# ─────────────────────────────────────────
class Refund(db.Model):
    __tablename__ = 'refunds'

    id           = db.Column(db.String(16), primary_key=True)        # e.g. REF001
    order_id     = db.Column(db.String(16), nullable=True)
    order_no     = db.Column(db.String(60), nullable=False)
    user_id      = db.Column(db.String(16), db.ForeignKey('users.id'), nullable=False)
    user_name    = db.Column(db.String(100), nullable=False)
    reason       = db.Column(db.String(200), nullable=False)
    description  = db.Column(db.Text, nullable=True)
    upi          = db.Column(db.String(50), nullable=True)
    amount       = db.Column(db.Float, default=0.0)
    status       = db.Column(db.String(20), default='pending')   # pending | under_review | resolved
    submitted_at = db.Column(db.String(30), nullable=False)
    reviewed_at  = db.Column(db.String(30), nullable=True)
    resolved_at  = db.Column(db.String(30), nullable=True)

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
        }
