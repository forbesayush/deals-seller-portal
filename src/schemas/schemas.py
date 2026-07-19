from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Any, Dict

# ORM Compatibility utility
class ORMBase(BaseModel):
    class Config:
        orm_mode = True
        from_attributes = True

# ─────────────────────────────────────────────
#  USER SCHEMAS
# ─────────────────────────────────────────────
class UserLogin(BaseModel):
    identifier: str = Field(..., description="Email, username or phone number")
    password: str = Field(..., description="Password")

class UserRegister(BaseModel):
    name: str = Field(..., min_length=2)
    email: EmailStr
    mobile: Optional[str] = None
    password: str = Field(..., min_length=6)
    referral: Optional[str] = ""

class UserResponse(ORMBase):
    id: str
    name: str
    email: EmailStr
    mobile: Optional[str] = None
    role: str
    status: str
    joined: str
    verified: bool
    referral: str
    upi: Optional[str] = None
    referrer_id: Optional[str] = Field(None, alias="referrerId")
    vip_tier: Optional[str] = Field(None, alias="vipTier")
    avatar_color: Optional[str] = Field(None, alias="avatarColor")
    bio: Optional[str] = None
    kyc_status: Optional[str] = Field(None, alias="kycStatus")
    total_earnings: Optional[float] = Field(None, alias="totalEarnings")
    last_login: Optional[str] = Field(None, alias="lastLogin")
    login_count: Optional[int] = Field(None, alias="loginCount")

    class Config:
        allow_population_by_field_name = True
        populate_by_name = True

class UserUpdate(BaseModel):
    name: Optional[str] = None
    mobile: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = None
    verified: Optional[bool] = None
    password: Optional[str] = None
    vip_tier: Optional[str] = Field(None, alias="vipTier")
    suspended_reason: Optional[str] = Field(None, alias="suspendedReason")

    class Config:
        allow_population_by_field_name = True
        populate_by_name = True

# ─────────────────────────────────────────────
#  ORDER SCHEMAS
# ─────────────────────────────────────────────
class OrderCreate(BaseModel):
    orderNo: str = Field(..., alias="orderNo")
    productCode: str = Field(..., alias="productCode")
    orderName: Optional[str] = Field(None, alias="orderName")
    platform: str
    mediator: str
    dealType: str = Field(..., alias="dealType")
    orderDate: str = Field(..., alias="orderDate")
    amount: float
    deduction: Optional[float] = 0.0
    screenshot: Optional[bool] = False

    class Config:
        allow_population_by_field_name = True
        populate_by_name = True

class OrderUpdate(BaseModel):
    mediator: Optional[str] = None
    status: Optional[str] = None
    refund_status: Optional[str] = Field(None, alias="refundStatus")
    paid_date: Optional[str] = Field(None, alias="paidDate")
    deduction: Optional[float] = None
    final_payout: Optional[float] = Field(None, alias="finalPayout")
    current_status: Optional[str] = Field(None, alias="currentStatus")
    approval_status: Optional[str] = Field(None, alias="approvalStatus")
    notes: Optional[str] = None
    priority: Optional[str] = None

    class Config:
        allow_population_by_field_name = True
        populate_by_name = True

class BulkOrderAction(BaseModel):
    order_ids: List[str] = Field(..., alias="orderIds")
    action: str  # approve, reject, mark_paid, cancel
    note: Optional[str] = None

    class Config:
        allow_population_by_field_name = True
        populate_by_name = True

class OrderResponse(ORMBase):
    id: str
    order_no: str = Field(..., alias="orderNo")
    order_code: str = Field(..., alias="orderCode")
    tracking_number: Optional[str] = Field(None, alias="trackingNumber")
    product_name: str = Field(..., alias="productName")
    product_price: float = Field(..., alias="productPrice")
    quantity: int
    buyer_id: str = Field(..., alias="buyerId")
    cashback_pct: float = Field(..., alias="cashbackPct")
    cashback_amount: float = Field(..., alias="cashbackAmount")
    processing_fee: float = Field(..., alias="processingFee")
    deduction_amount: float = Field(..., alias="deductionAmount")
    net_amount: float = Field(..., alias="netAmount")
    refund_status: Optional[str] = Field(None, alias="refundStatus")
    approval_status: str = Field(..., alias="approvalStatus")
    current_status: str = Field(..., alias="currentStatus")
    order_date: str = Field(..., alias="orderDate")
    submitted_date: Optional[str] = Field(None, alias="submittedDate")
    paid_date: Optional[str] = Field(None, alias="paidDate")
    created_by_id: Optional[str] = Field(None, alias="createdBy")
    updated_by_id: Optional[str] = Field(None, alias="updatedBy")
    screenshot: bool
    priority: Optional[str] = None

    class Config:
        allow_population_by_field_name = True
        populate_by_name = True

# ─────────────────────────────────────────────
#  REFUND SCHEMAS
# ─────────────────────────────────────────────
class RefundCreate(BaseModel):
    orderId: Optional[str] = Field(None, alias="orderId")
    orderNo: str = Field(..., alias="orderNo")
    reason: str
    description: Optional[str] = ""
    upi: Optional[str] = ""
    amount: float

    class Config:
        allow_population_by_field_name = True
        populate_by_name = True

class RefundUpdate(BaseModel):
    status: str
    admin_note: Optional[str] = Field(None, alias="adminNote")

    class Config:
        allow_population_by_field_name = True
        populate_by_name = True

class RefundResponse(ORMBase):
    id: str
    order_id: Optional[str] = Field(None, alias="orderId")
    order_no: str = Field(..., alias="orderNo")
    user_id: str = Field(..., alias="userId")
    user_name: str = Field(..., alias="userName")
    reason: str
    description: Optional[str] = None
    upi: Optional[str] = None
    amount: float
    status: str
    submitted_at: str = Field(..., alias="submittedAt")
    reviewed_at: Optional[str] = Field(None, alias="reviewedAt")
    resolved_at: Optional[str] = Field(None, alias="resolvedAt")
    admin_note: Optional[str] = Field(None, alias="adminNote")

    class Config:
        allow_population_by_field_name = True
        populate_by_name = True

# ─────────────────────────────────────────────
#  WALLET SCHEMAS
# ─────────────────────────────────────────────
class WalletResponse(ORMBase):
    id: str
    user_id: str = Field(..., alias="userId")
    pending_cashback: float = Field(..., alias="pendingCashback")
    approved_cashback: float = Field(..., alias="approvedCashback")
    locked_cashback: float = Field(..., alias="lockedCashback")
    withdrawable_cashback: float = Field(..., alias="withdrawableCashback")
    refund_balance: float = Field(..., alias="refundBalance")
    last_updated: str = Field(..., alias="lastUpdated")
    total_withdrawn: Optional[float] = Field(0.0, alias="totalWithdrawn")
    lifetime_earned: Optional[float] = Field(0.0, alias="lifetimeEarned")

    class Config:
        allow_population_by_field_name = True
        populate_by_name = True

class TransactionResponse(ORMBase):
    id: str
    wallet_id: str = Field(..., alias="walletId")
    order_id: Optional[str] = Field(None, alias="orderId")
    amount: float
    type: str
    category: str
    status: str
    description: Optional[str] = None
    timestamp: str

    class Config:
        allow_population_by_field_name = True
        populate_by_name = True

# ─────────────────────────────────────────────
#  AUDIT LOG SCHEMAS
# ─────────────────────────────────────────────
class AuditLogResponse(ORMBase):
    id: str
    user_id: Optional[str] = Field(None, alias="userId")
    user_email: str = Field(..., alias="userEmail")
    action: str
    target_type: str = Field(..., alias="targetType")
    target_id: Optional[str] = Field(None, alias="targetId")
    timestamp: str
    ip_address: Optional[str] = Field(None, alias="ipAddress")
    user_agent: Optional[str] = Field(None, alias="userAgent")
    old_data: Optional[Any] = Field(None, alias="oldData")
    new_data: Optional[Any] = Field(None, alias="newData")
    severity: Optional[str] = "info"

    class Config:
        allow_population_by_field_name = True
        populate_by_name = True

# ─────────────────────────────────────────────
#  BULK UPLOAD & GENERAL RESPONSE
# ─────────────────────────────────────────────
class MessageResponse(BaseModel):
    success: bool
    message: str

class APIStatsResponse(BaseModel):
    totalOrders: int
    totalBuyers: int
    totalRefunds: int
    pendingRefunds: int
    paidOrders: int
    totalPayout: float
    activeDeals: int
    openTickets: int
    pendingWithdrawals: int
    totalRevenue: float


# ─────────────────────────────────────────────
#  DEAL SCHEMAS
# ─────────────────────────────────────────────
class DealCreate(BaseModel):
    productCode: str = Field(..., alias="productCode")
    productName: str = Field(..., alias="productName")
    platform: str
    price: float
    cashback: float
    slots: Optional[int] = 5
    active: Optional[bool] = True
    category: Optional[str] = "General"
    expiresAt: Optional[str] = Field(None, alias="expiresAt")
    description: Optional[str] = None
    imageUrl: Optional[str] = Field(None, alias="imageUrl")
    rating: Optional[float] = 4.0
    dealType: Optional[str] = Field("cashback", alias="dealType")
    minOrderValue: Optional[float] = Field(0.0, alias="minOrderValue")
    maxPerUser: Optional[int] = Field(1, alias="maxPerUser")
    featured: Optional[bool] = False
    tags: Optional[str] = None

    class Config:
        allow_population_by_field_name = True
        populate_by_name = True


class DealUpdate(BaseModel):
    productCode: Optional[str] = Field(None, alias="productCode")
    productName: Optional[str] = Field(None, alias="productName")
    platform: Optional[str] = None
    price: Optional[float] = None
    cashback: Optional[float] = None
    slots: Optional[int] = None
    active: Optional[bool] = None
    category: Optional[str] = None
    expiresAt: Optional[str] = Field(None, alias="expiresAt")
    description: Optional[str] = None
    imageUrl: Optional[str] = Field(None, alias="imageUrl")
    rating: Optional[float] = None
    dealType: Optional[str] = Field(None, alias="dealType")
    minOrderValue: Optional[float] = Field(None, alias="minOrderValue")
    maxPerUser: Optional[int] = Field(None, alias="maxPerUser")
    featured: Optional[bool] = None
    tags: Optional[str] = None

    class Config:
        allow_population_by_field_name = True
        populate_by_name = True


class DealResponse(ORMBase):
    id: str
    product_code: str = Field(..., alias="productCode")
    product_name: str = Field(..., alias="productName")
    platform: str
    price: float
    cashback: float
    slots: int
    active: bool
    category: Optional[str] = "General"
    expires_at: Optional[str] = Field(None, alias="expiresAt")
    description: Optional[str] = None
    image_url: Optional[str] = Field(None, alias="imageUrl")
    rating: Optional[float] = 4.0
    deal_type: Optional[str] = Field(None, alias="dealType")
    min_order_value: Optional[float] = Field(0.0, alias="minOrderValue")
    max_per_user: Optional[int] = Field(1, alias="maxPerUser")
    claimed_count: Optional[int] = Field(0, alias="claimedCount")
    featured: Optional[bool] = False
    tags: Optional[str] = None
    created_at: Optional[str] = Field(None, alias="createdAt")

    class Config:
        allow_population_by_field_name = True
        populate_by_name = True


class DealCloneRequest(BaseModel):
    new_product_code: str = Field(..., alias="newProductCode")
    new_slots: Optional[int] = Field(None, alias="newSlots")

    class Config:
        allow_population_by_field_name = True
        populate_by_name = True


class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    mobile: Optional[str] = None
    upi: Optional[str] = None
    bio: Optional[str] = None
    avatar_color: Optional[str] = Field(None, alias="avatarColor")

    class Config:
        allow_population_by_field_name = True
        populate_by_name = True


class WithdrawalCreate(BaseModel):
    upi: str
    amount: float

    class Config:
        allow_population_by_field_name = True
        populate_by_name = True


class WithdrawalUpdate(BaseModel):
    status: str  # approved, rejected
    admin_note: Optional[str] = Field(None, alias="adminNote")
    txn_ref: Optional[str] = Field(None, alias="txnRef")

    class Config:
        allow_population_by_field_name = True
        populate_by_name = True


class WithdrawalResponse(ORMBase):
    id: str
    user_id: str = Field(..., alias="userId")
    upi: str
    amount: float
    status: str
    created_at: str = Field(..., alias="createdAt")
    processed_at: Optional[str] = Field(None, alias="processedAt")
    admin_note: Optional[str] = Field(None, alias="adminNote")
    txn_ref: Optional[str] = Field(None, alias="txnRef")

    class Config:
        allow_population_by_field_name = True
        populate_by_name = True


class TicketCreate(BaseModel):
    title: str
    description: str
    category: str
    priority: Optional[str] = "normal"

    class Config:
        allow_population_by_field_name = True
        populate_by_name = True


class TicketUpdate(BaseModel):
    status: Optional[str] = None
    reply: Optional[str] = None
    priority: Optional[str] = None

    class Config:
        allow_population_by_field_name = True
        populate_by_name = True


class TicketResponse(ORMBase):
    id: str
    user_id: str = Field(..., alias="userId")
    title: str
    description: str
    category: str
    status: str
    priority: Optional[str] = "normal"
    reply: Optional[str] = None
    created_at: str = Field(..., alias="createdAt")
    updated_at: Optional[str] = Field(None, alias="updatedAt")
    resolved_at: Optional[str] = Field(None, alias="resolvedAt")

    class Config:
        allow_population_by_field_name = True
        populate_by_name = True


# ─────────────────────────────────────────────
#  SYSTEM SETTINGS SCHEMAS
# ─────────────────────────────────────────────
class SystemSettingUpdate(BaseModel):
    value: str
    description: Optional[str] = None

    class Config:
        allow_population_by_field_name = True
        populate_by_name = True

class SystemSettingResponse(ORMBase):
    key: str
    value: str
    description: Optional[str] = None
    updated_at: Optional[str] = Field(None, alias="updatedAt")

    class Config:
        allow_population_by_field_name = True
        populate_by_name = True


# ─────────────────────────────────────────────
#  ANNOUNCEMENT SCHEMAS
# ─────────────────────────────────────────────
class AnnouncementCreate(BaseModel):
    title: str
    body: str
    priority: Optional[str] = 'normal'
    expires_at: Optional[str] = Field(None, alias="expiresAt")
    target_role: Optional[str] = Field(None, alias="targetRole")

    class Config:
        allow_population_by_field_name = True
        populate_by_name = True

class AnnouncementUpdate(BaseModel):
    title: Optional[str] = None
    body: Optional[str] = None
    priority: Optional[str] = None
    active: Optional[bool] = None
    expires_at: Optional[str] = Field(None, alias="expiresAt")

    class Config:
        allow_population_by_field_name = True
        populate_by_name = True

class AnnouncementResponse(ORMBase):
    id: str
    author_id: str = Field(..., alias="authorId")
    title: str
    body: str
    priority: str
    active: bool
    created_at: str = Field(..., alias="createdAt")
    expires_at: Optional[str] = Field(None, alias="expiresAt")
    target_role: Optional[str] = Field(None, alias="targetRole")

    class Config:
        allow_population_by_field_name = True
        populate_by_name = True


# ─────────────────────────────────────────────
#  LOGIN SESSION SCHEMAS
# ─────────────────────────────────────────────
class LoginSessionResponse(ORMBase):
    id: str
    user_id: str = Field(..., alias="userId")
    ip_address: Optional[str] = Field(None, alias="ipAddress")
    user_agent: Optional[str] = Field(None, alias="userAgent")
    active: bool
    created_at: str = Field(..., alias="createdAt")
    ended_at: Optional[str] = Field(None, alias="endedAt")

    class Config:
        allow_population_by_field_name = True
        populate_by_name = True


# ─────────────────────────────────────────────
#  ORDER STATUS LOG SCHEMAS
# ─────────────────────────────────────────────
class OrderStatusLogResponse(ORMBase):
    id: str
    order_id: str = Field(..., alias="orderId")
    actor_id: str = Field(..., alias="actorId")
    from_status: Optional[str] = Field(None, alias="fromStatus")
    to_status: str = Field(..., alias="toStatus")
    note: Optional[str] = None
    timestamp: str

    class Config:
        allow_population_by_field_name = True
        populate_by_name = True


# ─────────────────────────────────────────────
#  DEAL SLOT HISTORY SCHEMAS
# ─────────────────────────────────────────────
class DealSlotHistoryResponse(ORMBase):
    id: str
    deal_id: str = Field(..., alias="dealId")
    actor_id: str = Field(..., alias="actorId")
    old_slots: int = Field(..., alias="oldSlots")
    new_slots: int = Field(..., alias="newSlots")
    reason: Optional[str] = None
    timestamp: str

    class Config:
        allow_population_by_field_name = True
        populate_by_name = True


# ─────────────────────────────────────────────
#  ANALYTICS & VIP TIER SCHEMAS
# ─────────────────────────────────────────────
class AnalyticsSummaryResponse(BaseModel):
    total_orders: int = Field(..., alias="totalOrders")
    paid_orders: int = Field(..., alias="paidOrders")
    pending_orders: int = Field(..., alias="pendingOrders")
    total_cashback_paid: float = Field(..., alias="totalCashbackPaid")
    total_withdrawals: float = Field(..., alias="totalWithdrawals")
    active_buyers: int = Field(..., alias="activeBuyers")
    active_deals: int = Field(..., alias="activeDeals")
    open_tickets: int = Field(..., alias="openTickets")

    class Config:
        allow_population_by_field_name = True
        populate_by_name = True

class VipTierResponse(BaseModel):
    tier: str
    bonus_pct: float = Field(..., alias="bonusPct")
    paid_count: int = Field(..., alias="paidCount")
    next_tier: Optional[str] = Field(None, alias="nextTier")
    orders_needed: int = Field(..., alias="ordersNeeded")

    class Config:
        allow_population_by_field_name = True
        populate_by_name = True


# ─────────────────────────────────────────────
#  FEATURE FLAG SCHEMAS (NEW - Feature 39/40)
# ─────────────────────────────────────────────
class FeatureFlagUpdate(BaseModel):
    enabled: bool
    description: Optional[str] = None

    class Config:
        allow_population_by_field_name = True
        populate_by_name = True

class FeatureFlagResponse(ORMBase):
    key: str
    enabled: bool
    description: Optional[str] = None
    updated_at: Optional[str] = Field(None, alias="updatedAt")
    updated_by: Optional[str] = Field(None, alias="updatedBy")

    class Config:
        allow_population_by_field_name = True
        populate_by_name = True


# ─────────────────────────────────────────────
#  REFERRAL SCHEMAS (NEW - Feature 9)
# ─────────────────────────────────────────────
class ReferralStatsResponse(BaseModel):
    referral_code: str = Field(..., alias="referralCode")
    total_referrals: int = Field(..., alias="totalReferrals")
    total_earned: float = Field(..., alias="totalEarned")
    pending_earned: float = Field(..., alias="pendingEarned")
    referral_link: str = Field(..., alias="referralLink")

    class Config:
        allow_population_by_field_name = True
        populate_by_name = True


# ─────────────────────────────────────────────
#  NOTIFICATION SCHEMAS (NEW)
# ─────────────────────────────────────────────
class NotificationResponse(ORMBase):
    id: str
    user_id: str = Field(..., alias="userId")
    title: str
    body: Optional[str] = None
    type: str
    read: bool
    created_at: str = Field(..., alias="createdAt")

    class Config:
        allow_population_by_field_name = True
        populate_by_name = True


# ─────────────────────────────────────────────
#  REVENUE CHART RESPONSE (NEW - Feature 26/38)
# ─────────────────────────────────────────────
class RevenueDataPoint(BaseModel):
    date: str
    orders: int
    revenue: float
    cashback: float

class RevenueChartResponse(BaseModel):
    data: List[RevenueDataPoint]
    total_revenue: float = Field(..., alias="totalRevenue")
    total_cashback: float = Field(..., alias="totalCashback")
    growth_pct: float = Field(..., alias="growthPct")

    class Config:
        allow_population_by_field_name = True
        populate_by_name = True


# ─────────────────────────────────────────────
#  SYSTEM HEALTH RESPONSE (NEW - Feature 31/34)
# ─────────────────────────────────────────────
class SystemHealthResponse(BaseModel):
    status: str
    db_size_kb: float = Field(..., alias="dbSizeKb")
    total_users: int = Field(..., alias="totalUsers")
    total_orders: int = Field(..., alias="totalOrders")
    total_deals: int = Field(..., alias="totalDeals")
    active_sessions: int = Field(..., alias="activeSessions")
    open_tickets: int = Field(..., alias="openTickets")
    pending_withdrawals: int = Field(..., alias="pendingWithdrawals")
    version: str
    timestamp: str

    class Config:
        allow_population_by_field_name = True
        populate_by_name = True


# ─────────────────────────────────────────────
#  AI SUGGEST REPLY & CHAT SCHEMAS (NEW)
# ─────────────────────────────────────────────
class AISuggestReplyRequest(BaseModel):
    ticket_id: Optional[str] = Field(None, alias="ticketId")
    title: str
    description: str

    class Config:
        allow_population_by_field_name = True
        populate_by_name = True

class AIChatMessage(BaseModel):
    role: str
    content: str

class AIChatRequest(BaseModel):
    message: str
    history: Optional[List[AIChatMessage]] = []

    class Config:
        allow_population_by_field_name = True
        populate_by_name = True

