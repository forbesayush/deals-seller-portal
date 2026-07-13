from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Any

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
    mobile: Optional[str]
    role: str
    status: str
    joined: str
    verified: bool
    referral: str
    upi: Optional[str]
    referrer_id: Optional[str] = Field(None, alias="referrerId")

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

# ─────────────────────────────────────────────
#  ORDER SCHEMAS
# ─────────────────────────────────────────────
class OrderCreate(BaseModel):
    orderNo: str = Field(..., alias="orderNo")
    productCode: str = Field(..., alias="productCode")
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

    class Config:
        allow_population_by_field_name = True
        populate_by_name = True

class OrderResponse(ORMBase):
    id: str
    order_no: str = Field(..., alias="orderNo")
    order_code: str = Field(..., alias="orderCode")
    tracking_number: Optional[str] = Field(..., alias="trackingNumber")
    product_name: str = Field(..., alias="productName")
    product_price: float = Field(..., alias="productPrice")
    quantity: int
    buyer_id: str = Field(..., alias="buyerId")
    cashback_pct: float = Field(..., alias="cashbackPct")
    cashback_amount: float = Field(..., alias="cashbackAmount")
    processing_fee: float = Field(..., alias="processingFee")
    deduction_amount: float = Field(..., alias="deductionAmount")
    net_amount: float = Field(..., alias="netAmount")
    refund_status: Optional[str] = Field(..., alias="refundStatus")
    approval_status: str = Field(..., alias="approvalStatus")
    current_status: str = Field(..., alias="currentStatus")
    order_date: str = Field(..., alias="orderDate")
    submitted_date: Optional[str] = Field(..., alias="submittedDate")
    paid_date: Optional[str] = Field(..., alias="paidDate")
    created_by_id: Optional[str] = Field(..., alias="createdBy")
    updated_by_id: Optional[str] = Field(..., alias="updatedBy")
    screenshot: bool

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

class RefundResponse(ORMBase):
    id: str
    order_id: Optional[str] = Field(..., alias="orderId")
    order_no: str = Field(..., alias="orderNo")
    user_id: str = Field(..., alias="userId")
    user_name: str = Field(..., alias="userName")
    reason: str
    description: Optional[str]
    upi: Optional[str]
    amount: float
    status: str
    submitted_at: str = Field(..., alias="submittedAt")
    reviewed_at: Optional[str] = Field(..., alias="reviewedAt")
    resolved_at: Optional[str] = Field(..., alias="resolvedAt")

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

    class Config:
        allow_population_by_field_name = True
        populate_by_name = True

class TransactionResponse(ORMBase):
    id: str
    wallet_id: str = Field(..., alias="walletId")
    order_id: Optional[str] = Field(..., alias="orderId")
    amount: float
    type: str
    category: str
    status: str
    description: Optional[str]
    timestamp: str

    class Config:
        allow_population_by_field_name = True
        populate_by_name = True

# ─────────────────────────────────────────────
#  AUDIT LOG SCHEMAS
# ─────────────────────────────────────────────
class AuditLogResponse(ORMBase):
    id: str
    user_id: Optional[str] = Field(..., alias="userId")
    user_email: str = Field(..., alias="userEmail")
    action: str
    target_type: str = Field(..., alias="targetType")
    target_id: Optional[str] = Field(..., alias="targetId")
    timestamp: str
    ip_address: Optional[str] = Field(..., alias="ipAddress")
    user_agent: Optional[str] = Field(..., alias="userAgent")
    old_data: Optional[Any] = Field(..., alias="oldData")
    new_data: Optional[Any] = Field(..., alias="newData")

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

    class Config:
        allow_population_by_field_name = True
        populate_by_name = True


class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    mobile: Optional[str] = None
    upi: Optional[str] = None

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

    class Config:
        allow_population_by_field_name = True
        populate_by_name = True


class TicketCreate(BaseModel):
    title: str
    description: str
    category: str

    class Config:
        allow_population_by_field_name = True
        populate_by_name = True


class TicketUpdate(BaseModel):
    status: Optional[str] = None
    reply: Optional[str] = None

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
    reply: Optional[str] = None
    created_at: str = Field(..., alias="createdAt")

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

    class Config:
        allow_population_by_field_name = True
        populate_by_name = True

class AnnouncementUpdate(BaseModel):
    title: Optional[str] = None
    body: Optional[str] = None
    priority: Optional[str] = None
    active: Optional[bool] = None

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


