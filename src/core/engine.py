import json
from sqlalchemy.orm import Session
from src.models.models import User, Order, Refund, Wallet, Transaction, AuditLog, Deal, Withdrawal, Ticket, SystemSetting, Announcement, LoginSession, OrderStatusLog, DealSlotHistory
from src.schemas.schemas import (UserRegister, UserUpdate, OrderCreate, OrderUpdate, RefundCreate, RefundUpdate,
    DealCreate, DealUpdate, WithdrawalCreate, WithdrawalUpdate, TicketCreate, TicketUpdate,
    AnnouncementCreate, AnnouncementUpdate, SystemSettingUpdate)
from src.utils.helpers import next_id, generate_order_code, generate_tracking_number, now_iso, today_date
from src.middleware.auth import get_password_hash
from fastapi import HTTPException, status

# ─────────────────────────────────────────────
#  PRODUCT CATALOG DATA (Business Rules)
# ─────────────────────────────────────────────
PRODUCT_CATALOG = {
    'AMZ001': {'name': 'boAt Rockerz 255 Pro+ Wireless Earphones', 'platform': 'Amazon', 'price': 1299.0, 'cashback': 300.0},
    'AMZ002': {'name': 'Noise ColorFit Pro 4 Smartwatch', 'platform': 'Amazon', 'price': 2499.0, 'cashback': 500.0},
    'FLK001': {'name': 'Redmi 13C 4G Smartphone (128GB)', 'platform': 'Flipkart', 'price': 8999.0, 'cashback': 800.0},
    'FLK002': {'name': 'Mi 43" 4K Ultra HD Android TV', 'platform': 'Flipkart', 'price': 24999.0, 'cashback': 2000.0},
    'BLK001': {'name': 'Amul Butter (500g)', 'platform': 'Blinkit', 'price': 290.0, 'cashback': 60.0},
    'AMZ003': {'name': 'HP 15 Laptop Intel Core i5 (8GB/512GB)', 'platform': 'Amazon', 'price': 49999.0, 'cashback': 3500.0},
    'FLK003': {'name': 'Puma Men\'s Running Shoes', 'platform': 'Flipkart', 'price': 2999.0, 'cashback': 400.0},
}

# ─────────────────────────────────────────────
#  AUDIT LOG HELPER
# ─────────────────────────────────────────────
def record_audit(db: Session, user: User, action: str, target_type: str, target_id: str, ip: str, ua: str, old_data=None, new_data=None):
    """Log system actions to audit trail table."""
    log = AuditLog(
        id=next_id(db, AuditLog, 'LOG'),
        user_id=user.id if user else None,
        user_email=user.email if user else "system@deals.seller.com",
        action=action,
        target_type=target_type,
        target_id=target_id,
        timestamp=now_iso(),
        ip_address=ip,
        user_agent=ua,
        old_data=json.dumps(old_data) if old_data else None,
        new_data=json.dumps(new_data) if new_data else None
    )
    db.add(log)
    db.commit()

# ─────────────────────────────────────────────
#  USER ENGINE LOGIC
# ─────────────────────────────────────────────
def register_user(db: Session, schema: UserRegister, ip: str, ua: str) -> User:
    # Check duplicate
    existing = db.query(User).filter((User.email == schema.email) | (User.mobile == schema.mobile)).first()
    if existing:
        raise HTTPException(status_code=409, detail="User with this email or mobile already exists")

    # Check referral signup tracking
    ref_user = None
    ref_id = None
    if schema.referral:
        ref_user = db.query(User).filter(User.referral == schema.referral).first()
        if ref_user:
            ref_id = ref_user.id

    uid = next_id(db, User, 'USR')
    user = User(
        id=uid,
        name=schema.name,
        email=schema.email,
        mobile=schema.mobile,
        password_hash=get_password_hash(schema.password),
        role='buyer',
        status='active',
        joined=today_date(),
        verified=False,
        referral=f"REF{uid[3:]}", # Auto-generate referral code for new user
        referrer_id=ref_id
    )
    db.add(user)
    
    # Initialize wallet
    wallet = Wallet(
        id=next_id(db, Wallet, 'WLT'),
        user_id=uid,
        pending_cashback=0.0,
        approved_cashback=0.0,
        locked_cashback=0.0,
        withdrawable_cashback=0.0,
        refund_balance=0.0,
        last_updated=now_iso()
    )
    db.add(wallet)

    # Process referral rewards
    if ref_user:
        ref_wallet = db.query(Wallet).filter(Wallet.user_id == ref_user.id).first()
        if ref_wallet:
            ref_wallet.withdrawable_cashback = round(ref_wallet.withdrawable_cashback + 50.0, 2)
            ref_wallet.last_updated = now_iso()
            
            tx = Transaction(
                id=next_id(db, Transaction, 'TXN'),
                wallet_id=ref_wallet.id,
                order_id=None,
                amount=50.0,
                type='credit',
                category='referral_bonus',
                status='completed',
                description=f"Referral signup bonus for {schema.name}",
                timestamp=now_iso()
            )
            db.add(tx)

    db.commit()
    db.refresh(user)

    record_audit(db, user, "Register User", "users", uid, ip, ua, None, user.to_dict())
    return user

def update_user(db: Session, user_id: str, schema: UserUpdate, actor: User, ip: str, ua: str) -> User:
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    old_dict = target.to_dict()

    # Apply schema changes
    if schema.name is not None:
        target.name = schema.name
    if schema.mobile is not None:
        target.mobile = schema.mobile
    if schema.role is not None:
        target.role = schema.role
    if schema.status is not None:
        target.status = schema.status
    if schema.verified is not None:
        target.verified = schema.verified
    if schema.password is not None:
        target.password_hash = get_password_hash(schema.password)

    db.commit()
    db.refresh(target)

    record_audit(db, actor, f"Update User ({schema.dict(exclude_none=True).keys()})", "users", target.id, ip, ua, old_dict, target.to_dict())
    return target

# ─────────────────────────────────────────────
#  ORDER ENGINE LOGIC & CALCULATIONS
# ─────────────────────────────────────────────
def calculate_fees(product_code: str, product_price: float, quantity: int, input_deduction: float = 0.0, db: Session = None) -> dict:
    """Perform automatic calculations for an order based on catalog values or fallbacks."""
    subtotal = product_price * quantity
    
    deal = None
    if db is not None:
        deal = db.query(Deal).filter(Deal.product_code == product_code, Deal.active == True).first()

    # Lookup in DB first, then static catalog
    if deal is not None:
        product_name = deal.product_name
        platform = deal.platform
        single_cashback = deal.cashback
        cashback_amount = single_cashback * quantity
        cashback_pct = round((cashback_amount / subtotal) * 100, 2) if subtotal > 0 else 0.0
    elif product_code in PRODUCT_CATALOG:
        catalog_item = PRODUCT_CATALOG[product_code]
        product_name = catalog_item['name']
        platform = catalog_item['platform']
        # Retrieve single item cashback from catalog, multiply by qty
        single_cashback = catalog_item['cashback']
        cashback_amount = single_cashback * quantity
        cashback_pct = round((cashback_amount / subtotal) * 100, 2) if subtotal > 0 else 0.0
    else:
        # Fallback to standard calculations
        product_name = f"Custom Product ({product_code})"
        platform = "Custom Platform"
        cashback_pct = 10.0 # Default 10% cashback
        cashback_amount = subtotal * (cashback_pct / 100)

    # 5% processing deduction if no explicit manual deduction passed
    processing_fee = round(subtotal * 0.05, 2)
    deduction_amount = input_deduction if input_deduction > 0 else processing_fee
    
    net_amount = round(cashback_amount - deduction_amount, 2)
    
    return {
        'productName': product_name,
        'platform': platform,
        'cashbackPct': cashback_pct,
        'cashbackAmount': cashback_amount,
        'processingFee': processing_fee,
        'deductionAmount': deduction_amount,
        'netAmount': net_amount
    }

def create_order(db: Session, schema: OrderCreate, buyer: User, actor: User, ip: str, ua: str) -> Order:
    # Avoid duplicate order submission
    dup = db.query(Order).filter(Order.order_no == schema.orderNo).first()
    if dup:
        raise HTTPException(status_code=400, detail=f"Order ID {schema.orderNo} already exists")

    # Get product price. Check if code in database first
    deal = db.query(Deal).filter(Deal.product_code == schema.productCode, Deal.active == True).first()
    if deal:
        price = deal.price
    else:
        price = PRODUCT_CATALOG[schema.productCode]['price'] if schema.productCode in PRODUCT_CATALOG else schema.amount
    
    # Run automatic calculations passing db
    calc = calculate_fees(schema.productCode, price, 1, schema.deduction, db)

    # Apply VIP tier loyalty bonuses
    vip = get_user_vip_tier(db, buyer.id)
    bonus_pct = vip['bonusPct']
    if bonus_pct > 0:
        bonus_amount = round(price * (bonus_pct / 100.0), 2)
        calc['cashbackAmount'] = round(calc['cashbackAmount'] + bonus_amount, 2)
        calc['cashbackPct'] = round(calc['cashbackPct'] + bonus_pct, 2)
        calc['netAmount'] = round(calc['cashbackAmount'] - calc['deductionAmount'], 2)

    order_id = next_id(db, Order, 'ORD')
    order = Order(
        id=order_id,
        order_no=schema.orderNo,
        order_code=generate_order_code(),
        tracking_number=generate_tracking_number(),
        product_name=calc['productName'],
        product_price=price,
        quantity=1,
        buyer_id=buyer.id,
        cashback_pct=calc['cashbackPct'],
        cashback_amount=calc['cashbackAmount'],
        processing_fee=calc['processingFee'],
        deduction_amount=calc['deductionAmount'],
        net_amount=calc['netAmount'],
        refund_status='not_eligible',
        approval_status='pending_review',
        current_status='pending_review',
        order_date=schema.orderDate,
        submitted_date=today_date(),
        created_by_id=actor.id,
        updated_by_id=actor.id,
        screenshot=schema.screenshot
    )
    db.add(order)

    # ─────────────────────────────────────────
    #  WALLET AUTOMATIC UPDATE (Pending Cashback Credit)
    # ─────────────────────────────────────────
    wallet = db.query(Wallet).filter(Wallet.user_id == buyer.id).first()
    if not wallet:
        wallet = Wallet(
            id=next_id(db, Wallet, 'WLT'), user_id=buyer.id,
            pending_cashback=0.0, approved_cashback=0.0, locked_cashback=0.0,
            withdrawable_cashback=0.0, refund_balance=0.0, last_updated=now_iso()
        )
        db.add(wallet)

    wallet.pending_cashback = round(wallet.pending_cashback + calc['netAmount'], 2)
    wallet.last_updated = now_iso()

    # Log pending transaction
    tx_id = next_id(db, Transaction, 'TXN')
    tx = Transaction(
        id=tx_id,
        wallet_id=wallet.id,
        order_id=order_id,
        amount=calc['netAmount'],
        type='credit',
        category='cashback_pending',
        status='pending',
        description=f"Pending cashback for Order #{schema.orderNo}",
        timestamp=now_iso()
    )
    db.add(tx)
    db.commit()
    db.refresh(order)

    record_audit(db, actor, "Create Order", "orders", order_id, ip, ua, None, order.to_dict())
    return order

def update_order(db: Session, order_id: str, schema: OrderUpdate, actor: User, ip: str, ua: str) -> Order:
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    old_dict = order.to_dict()
    wallet = db.query(Wallet).filter(Wallet.user_id == order.buyer_id).first()
    if not wallet:
        raise HTTPException(status_code=404, detail="Buyer wallet not found")

    # Fields checking for state transition logic
    old_status = order.current_status
    new_status = schema.current_status or order.current_status
    
    if schema.mediator is not None:
        order.mediator = schema.mediator
    if schema.status is not None:
        order.status = schema.status
    if schema.refund_status is not None:
        order.refund_status = schema.refund_status
    if schema.paid_date is not None:
        order.paid_date = schema.paid_date
    if schema.deduction is not None:
        # Recalculate net payout and update wallet pending if not paid/cancelled
        old_net = order.net_amount
        order.deduction_amount = schema.deduction
        order.net_amount = round(order.cashback_amount - order.deduction_amount, 2)
        diff = round(order.net_amount - old_net, 2)
        if order.current_status not in ['paid', 'cancelled']:
            wallet.pending_cashback = round(wallet.pending_cashback + diff, 2)
    if schema.final_payout is not None:
        # Overwrite amount directly if provided
        order.net_amount = schema.final_payout
    if schema.approval_status is not None:
        order.approval_status = schema.approval_status
    if schema.current_status is not None:
        order.current_status = schema.current_status

    # ─────────────────────────────────────────
    #  WALLET AUTOMATIC TRANSITIONS (State Machine)
    # ─────────────────────────────────────────
    if old_status != new_status:
        # 1. Transitioning to PAID: Pending -> Withdrawable
        if new_status == 'paid':
            # Remove from pending, add to withdrawable/approved
            wallet.pending_cashback = max(0.0, round(wallet.pending_cashback - order.net_amount, 2))
            wallet.withdrawable_cashback = round(wallet.withdrawable_cashback + order.net_amount, 2)
            wallet.approved_cashback = round(wallet.approved_cashback + order.net_amount, 2)
            
            # Log transaction
            tx = Transaction(
                id=next_id(db, Transaction, 'TXN'),
                wallet_id=wallet.id,
                order_id=order.id,
                amount=order.net_amount,
                type='credit',
                category='cashback_approved',
                status='completed',
                description=f"Approved cashback released for Order #{order.order_no}",
                timestamp=now_iso()
            )
            db.add(tx)
            
            order.approval_status = 'approved'
            order.paid_date = today_date()

        # 2. Transitioning to CANCELLED: Deduct pending or withdrawable
        elif new_status == 'cancelled':
            if old_status == 'paid':
                # Deduct from withdrawable since it was already paid
                wallet.withdrawable_cashback = max(0.0, round(wallet.withdrawable_cashback - order.net_amount, 2))
                wallet.approved_cashback = max(0.0, round(wallet.approved_cashback - order.net_amount, 2))
            else:
                # Deduct from pending
                wallet.pending_cashback = max(0.0, round(wallet.pending_cashback - order.net_amount, 2))

            tx = Transaction(
                id=next_id(db, Transaction, 'TXN'),
                wallet_id=wallet.id,
                order_id=order.id,
                amount=order.net_amount,
                type='debit',
                category='cashback_cancelled',
                status='completed',
                description=f"Cancelled order cashback deduction for #{order.order_no}",
                timestamp=now_iso()
            )
            db.add(tx)
            order.approval_status = 'rejected'

    order.updated_by_id = actor.id
    wallet.last_updated = now_iso()
    db.commit()
    db.refresh(order)

    record_audit(db, actor, f"Update Order status ({old_status} -> {new_status})", "orders", order.id, ip, ua, old_dict, order.to_dict())
    return order

def delete_order(db: Session, order_id: str, actor: User, ip: str, ua: str):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    old_dict = order.to_dict()
    wallet = db.query(Wallet).filter(Wallet.user_id == order.buyer_id).first()

    # Revert wallet values if user has wallet
    if wallet:
        if order.current_status == 'paid':
            wallet.withdrawable_cashback = max(0.0, round(wallet.withdrawable_cashback - order.net_amount, 2))
            wallet.approved_cashback = max(0.0, round(wallet.approved_cashback - order.net_amount, 2))
        elif order.current_status in ['pending_review', 'under_review', 'order_filled']:
            wallet.pending_cashback = max(0.0, round(wallet.pending_cashback - order.net_amount, 2))
        wallet.last_updated = now_iso()

    db.delete(order)
    db.commit()
    record_audit(db, actor, "Delete Order", "orders", order_id, ip, ua, old_dict, None)

# ─────────────────────────────────────────────
#  REFUND ENGINE LOGIC
# ─────────────────────────────────────────────
def create_refund(db: Session, schema: RefundCreate, buyer: User, ip: str, ua: str) -> Refund:
    # Find matching order
    order = db.query(Order).filter(Order.order_no == schema.orderNo).first()
    
    refund_id = next_id(db, Refund, 'REF')
    refund = Refund(
        id=refund_id,
        order_id=order.id if order else None,
        order_no=schema.orderNo,
        user_id=buyer.id,
        user_name=buyer.name,
        reason=schema.reason,
        description=schema.description,
        upi=schema.upi,
        amount=schema.amount,
        status='pending',
        submitted_at=now_iso()
    )
    db.add(refund)

    if order:
        order.refund_status = 'pending'
        order.current_status = 'under_review'

    db.commit()
    db.refresh(refund)

    record_audit(db, buyer, "Submit Refund", "refunds", refund_id, ip, ua, None, refund.to_dict())
    return refund

def review_refund(db: Session, refund_id: str, schema: RefundUpdate, actor: User, ip: str, ua: str) -> Refund:
    refund = db.query(Refund).filter(Refund.id == refund_id).first()
    if not refund:
        raise HTTPException(status_code=404, detail="Refund request not found")

    old_dict = refund.to_dict()
    old_status = refund.status
    new_status = schema.status

    refund.status = new_status
    if new_status == 'under_review' and not refund.reviewed_at:
        refund.reviewed_at = now_iso()
    elif new_status == 'resolved':
        refund.resolved_at = now_iso()
        
        # ─────────────────────────────────────────
        #  WALLET AUTOMATIC UPDATE (Refund balance payout)
        # ─────────────────────────────────────────
        wallet = db.query(Wallet).filter(Wallet.user_id == refund.user_id).first()
        if wallet:
            wallet.refund_balance = round(wallet.refund_balance + refund.amount, 2)
            wallet.last_updated = now_iso()
            
            # Log transaction
            tx = Transaction(
                id=next_id(db, Transaction, 'TXN'),
                wallet_id=wallet.id,
                order_id=refund.order_id,
                amount=refund.amount,
                type='credit',
                category='refund_credit',
                status='completed',
                description=f"Refund credited for Order #{refund.order_no}",
                timestamp=now_iso()
            )
            db.add(tx)
            
        # Update associated order
        if refund.order:
            refund.order.refund_status = 'cleared'
            refund.order.current_status = 'cancelled' # Cancel order once refund resolved
            
    elif new_status == 'rejected':
        refund.resolved_at = now_iso()
        if refund.order:
            refund.order.refund_status = 'rejected'

    db.commit()
    db.refresh(refund)

    record_audit(db, actor, f"Review Refund ({old_status} -> {new_status})", "refunds", refund.id, ip, ua, old_dict, refund.to_dict())
    return refund

# ─────────────────────────────────────────────
#  REPORTS & METRICS COMPILER
# ─────────────────────────────────────────────
def get_stats(db: Session) -> dict:
    total_orders = db.query(Order).count()
    total_buyers = db.query(User).filter(User.role == 'buyer').count()
    total_refunds = db.query(Refund).count()
    pending_ref = db.query(Refund).filter(Refund.status == 'pending').count()
    paid_orders = db.query(Order).filter(Order.current_status == 'paid').count()
    
    # Query final payout sums
    from sqlalchemy.sql import func
    total_payout = db.query(func.sum(Order.net_amount)).filter(Order.current_status == 'paid').scalar() or 0.0

    return {
        'totalOrders': total_orders,
        'totalBuyers': total_buyers,
        'totalRefunds': total_refunds,
        'pendingRefunds': pending_ref,
        'paidOrders': paid_orders,
        'totalPayout': round(float(total_payout), 2)
    }

def get_report_data(db: Session, report_type: str) -> list:
    """Retrieve raw fields list for report export."""
    if report_type == "orders":
        orders = db.query(Order).all()
        headers = ["ID", "Order No", "Order Code", "Product", "Buyer ID", "Cashback %", "Deductions", "Payout", "Status", "Date"]
        data = [[o.id, o.order_no, o.order_code, o.product_name, o.buyer_id, o.cashback_pct, o.deduction_amount, o.net_amount, o.current_status, o.order_date] for o in orders]
        return headers, data
    elif report_type == "refunds":
        refunds = db.query(Refund).all()
        headers = ["ID", "Order ID", "Order No", "User Name", "Reason", "Amount", "Status", "Submitted At"]
        data = [[r.id, r.order_id, r.order_no, r.user_name, r.reason, r.amount, r.status, r.submitted_at] for r in refunds]
        return headers, data
    elif report_type == "users":
        users = db.query(User).filter(User.role == 'buyer').all()
        headers = ["ID", "Name", "Email", "Mobile", "Status", "Joined", "Verified"]
        data = [[u.id, u.name, u.email, u.mobile, u.status, u.joined, u.verified] for u in users]
        return headers, data
    else:
        raise HTTPException(status_code=400, detail=f"Unknown report type: {report_type}")


# ─────────────────────────────────────────────
#  DEAL ENGINE LOGIC
# ─────────────────────────────────────────────
def get_active_deals(db: Session) -> list[Deal]:
    return db.query(Deal).filter(Deal.active == True).all()

def get_all_deals(db: Session) -> list[Deal]:
    return db.query(Deal).all()

def create_deal(db: Session, schema: DealCreate, actor: User, ip: str, ua: str) -> Deal:
    # Check duplicate product code
    existing = db.query(Deal).filter(Deal.product_code == schema.productCode).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Deal with product code {schema.productCode} already exists")

    deal_id = next_id(db, Deal, 'DEA')
    deal = Deal(
        id=deal_id,
        product_code=schema.productCode,
        product_name=schema.productName,
        platform=schema.platform,
        price=schema.price,
        cashback=schema.cashback,
        slots=schema.slots if schema.slots is not None else 5,
        active=schema.active if schema.active is not None else True,
        category=schema.category if schema.category is not None else 'General',
        expires_at=schema.expiresAt
    )
    db.add(deal)
    db.commit()
    db.refresh(deal)

    record_audit(db, actor, "Create Deal", "deals", deal_id, ip, ua, None, deal.to_dict())
    return deal

def update_deal(db: Session, deal_id: str, schema: DealUpdate, actor: User, ip: str, ua: str) -> Deal:
    deal = db.query(Deal).filter(Deal.id == deal_id).first()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")

    old_dict = deal.to_dict()

    if schema.productCode is not None:
        # Check duplicate
        dup = db.query(Deal).filter(Deal.product_code == schema.productCode, Deal.id != deal_id).first()
        if dup:
            raise HTTPException(status_code=400, detail="Another deal already has this product code")
        deal.product_code = schema.productCode
    if schema.productName is not None:
        deal.product_name = schema.productName
    if schema.platform is not None:
        deal.platform = schema.platform
    if schema.price is not None:
        deal.price = schema.price
    if schema.cashback is not None:
        deal.cashback = schema.cashback
    if schema.slots is not None:
        deal.slots = schema.slots
    if schema.active is not None:
        deal.active = schema.active
    if schema.category is not None:
        deal.category = schema.category
    if schema.expiresAt is not None:
        deal.expires_at = schema.expiresAt

    db.commit()
    db.refresh(deal)

    record_audit(db, actor, f"Update Deal ({schema.dict(exclude_none=True).keys()})", "deals", deal_id, ip, ua, old_dict, deal.to_dict())
    return deal

def delete_deal(db: Session, deal_id: str, actor: User, ip: str, ua: str) -> bool:
    deal = db.query(Deal).filter(Deal.id == deal_id).first()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")

    old_dict = deal.to_dict()
    db.delete(deal)
    db.commit()

    record_audit(db, actor, "Delete Deal", "deals", deal_id, ip, ua, old_dict, None)
    return True

# ─────────────────────────────────────────────
#  WITHDRAWAL ENGINE LOGIC
# ─────────────────────────────────────────────
def create_withdrawal(db: Session, schema: WithdrawalCreate, buyer: User, ip: str, ua: str) -> Withdrawal:
    wallet = db.query(Wallet).filter(Wallet.user_id == buyer.id).first()
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")

    if wallet.withdrawable_cashback < schema.amount:
        raise HTTPException(status_code=400, detail="Insufficient withdrawable balance for this withdrawal request.")

    # Deduct immediately to prevent double spending
    wallet.withdrawable_cashback = round(wallet.withdrawable_cashback - schema.amount, 2)
    wallet.last_updated = now_iso()

    w_id = next_id(db, Withdrawal, 'WTH')
    wth = Withdrawal(
        id=w_id,
        user_id=buyer.id,
        upi=schema.upi,
        amount=schema.amount,
        status='pending',
        created_at=now_iso(),
        processed_at=None
    )
    db.add(wth)

    # Save pending transaction
    tx = Transaction(
        id=next_id(db, Transaction, 'TXN'),
        wallet_id=wallet.id,
        order_id=None,
        amount=schema.amount,
        type='debit',
        category='withdrawal_pending',
        status='pending',
        description=f"Withdrawal request of ₹{schema.amount} to UPI: {schema.upi}",
        timestamp=now_iso()
    )
    db.add(tx)
    db.commit()
    db.refresh(wth)

    record_audit(db, buyer, "Request Withdrawal", "withdrawals", w_id, ip, ua, None, wth.to_dict())
    return wth

def review_withdrawal(db: Session, wth_id: str, schema: WithdrawalUpdate, actor: User, ip: str, ua: str) -> Withdrawal:
    wth = db.query(Withdrawal).filter(Withdrawal.id == wth_id).first()
    if not wth:
        raise HTTPException(status_code=404, detail="Withdrawal request not found")

    if wth.status != 'pending':
        raise HTTPException(status_code=400, detail="Withdrawal request has already been processed.")

    old_dict = wth.to_dict()
    wth.status = schema.status
    wth.processed_at = now_iso()

    wallet = db.query(Wallet).filter(Wallet.user_id == wth.user_id).first()
    if not wallet:
         raise HTTPException(status_code=404, detail="User wallet not found")

    if schema.status == 'approved':
        # Finalize the transaction to completed status
        tx = db.query(Transaction).filter(
            Transaction.wallet_id == wallet.id,
            Transaction.amount == wth.amount,
            Transaction.category == 'withdrawal_pending',
            Transaction.status == 'pending'
        ).order_by(Transaction.timestamp.desc()).first()
        if tx:
            tx.status = 'completed'
            tx.category = 'withdrawal_cleared'
            tx.description = f"Cleared withdrawal of ₹{wth.amount} to UPI: {wth.upi}"
    elif schema.status == 'rejected':
        # Revert funds back to withdrawable wallet
        wallet.withdrawable_cashback = round(wallet.withdrawable_cashback + wth.amount, 2)
        wallet.last_updated = now_iso()

        # Update transaction to failed
        tx = db.query(Transaction).filter(
            Transaction.wallet_id == wallet.id,
            Transaction.amount == wth.amount,
            Transaction.category == 'withdrawal_pending',
            Transaction.status == 'pending'
        ).order_by(Transaction.timestamp.desc()).first()
        if tx:
            tx.status = 'failed'
            tx.category = 'withdrawal_refunded'
            tx.description = f"Rejected withdrawal of ₹{wth.amount} to UPI: {wth.upi} (Refunded)"

    db.commit()
    db.refresh(wth)

    record_audit(db, actor, f"Review Withdrawal ({schema.status})", "withdrawals", wth_id, ip, ua, old_dict, wth.to_dict())
    return wth


# ─────────────────────────────────────────────
#  LOYALTY & ANTI-FRAUD MODULES
# ─────────────────────────────────────────────
def get_user_vip_tier(db: Session, user_id: str) -> dict:
    paid_count = db.query(Order).filter(Order.buyer_id == user_id, Order.current_status == 'paid').count()
    if paid_count >= 5:
        tier = "Gold"
        bonus_pct = 5.0
        next_tier = None
        orders_needed = 0
    elif paid_count >= 3:
        tier = "Silver"
        bonus_pct = 2.0
        next_tier = "Gold"
        orders_needed = 5 - paid_count
    else:
        tier = "Bronze"
        bonus_pct = 0.0
        next_tier = "Silver"
        orders_needed = 3 - paid_count
    return {
        "tier": tier,
        "bonusPct": bonus_pct,
        "paidCount": paid_count,
        "nextTier": next_tier,
        "ordersNeeded": orders_needed
    }

def check_order_fraud_status(db: Session, order_no: str, buyer_id: str) -> list[str]:
    flags = []
    # 1. Duplicate order check across other buyer claims
    dup = db.query(Order).filter(Order.order_no == order_no, Order.buyer_id != buyer_id).first()
    if dup:
        flags.append(f"Duplicate Order ID: Claimed by user {dup.buyer_id}")

    # 2. Account velocity check (max 3 claims in same day)
    from src.utils.helpers import today_date
    today = today_date()
    today_orders = db.query(Order).filter(Order.buyer_id == buyer_id, Order.order_date == today).count()
    if today_orders >= 3:
        flags.append(f"Velocity Anomaly: Account claimed {today_orders} orders today")

    return flags


# ─────────────────────────────────────────────
#  SUPPORT TICKETS LOGIC
# ─────────────────────────────────────────────
def create_ticket(db: Session, schema: TicketCreate, buyer: User, ip: str, ua: str) -> Ticket:
    t_id = next_id(db, Ticket, 'TKT')
    ticket = Ticket(
        id=t_id,
        user_id=buyer.id,
        title=schema.title,
        description=schema.description,
        category=schema.category,
        status='open',
        reply=None,
        created_at=now_iso()
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    record_audit(db, buyer, "Create Support Ticket", "tickets", t_id, ip, ua, None, ticket.to_dict())
    return ticket

def review_ticket(db: Session, ticket_id: str, schema: TicketUpdate, actor: User, ip: str, ua: str) -> Ticket:
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Support ticket not found")

    old_dict = ticket.to_dict()
    if schema.status is not None:
        ticket.status = schema.status
    if schema.reply is not None:
        ticket.reply = schema.reply
        ticket.status = 'resolved'

    db.commit()
    db.refresh(ticket)
    record_audit(db, actor, f"Review Support Ticket ({ticket.status})", "tickets", ticket_id, ip, ua, old_dict, ticket.to_dict())
    return ticket


# ─────────────────────────────────────────────
#  DYNAMIC FEE ENGINE (reads SystemSetting)
# ─────────────────────────────────────────────
def get_platform_fee_pct(db: Session) -> float:
    """Read platform_fee_pct from SystemSetting. Fallback to 5.0 if not configured."""
    row = db.query(SystemSetting).filter(SystemSetting.key == 'platform_fee_pct').first()
    if row:
        try:
            return float(row.value)
        except ValueError:
            pass
    return 5.0

def get_system_setting(db: Session, key: str, default: str = '') -> str:
    row = db.query(SystemSetting).filter(SystemSetting.key == key).first()
    return row.value if row else default

def update_system_setting(db: Session, key: str, schema: SystemSettingUpdate, actor: User, ip: str, ua: str) -> SystemSetting:
    row = db.query(SystemSetting).filter(SystemSetting.key == key).first()
    if not row:
        row = SystemSetting(key=key, value=schema.value, description=schema.description, updated_at=now_iso())
        db.add(row)
    else:
        row.value = schema.value
        if schema.description is not None:
            row.description = schema.description
        row.updated_at = now_iso()
    db.commit()
    db.refresh(row)
    record_audit(db, actor, f"Update SystemSetting ({key})", "system_settings", key, ip, ua, None, row.to_dict())
    return row


# ─────────────────────────────────────────────
#  ANALYTICS ENGINE
# ─────────────────────────────────────────────
def get_analytics_summary(db: Session) -> dict:
    """Return site-wide KPI summary for the Admin analytics dashboard."""
    from sqlalchemy import func as sqlfunc
    total_orders   = db.query(Order).count()
    paid_orders    = db.query(Order).filter(Order.current_status == 'paid').count()
    pending_orders = db.query(Order).filter(Order.current_status.in_(['pending_review', 'under_review'])).count()
    cashback_paid  = db.query(sqlfunc.coalesce(sqlfunc.sum(Order.net_amount), 0.0)).filter(Order.current_status == 'paid').scalar()
    withdrawals    = db.query(sqlfunc.coalesce(sqlfunc.sum(Withdrawal.amount), 0.0)).filter(Withdrawal.status == 'approved').scalar()
    active_buyers  = db.query(User).filter(User.role == 'buyer', User.status == 'active').count()
    active_deals   = db.query(Deal).filter(Deal.active == True).count()
    open_tickets   = db.query(Ticket).filter(Ticket.status == 'open').count()
    return {
        'totalOrders': total_orders,
        'paidOrders': paid_orders,
        'pendingOrders': pending_orders,
        'totalCashbackPaid': round(float(cashback_paid), 2),
        'totalWithdrawals': round(float(withdrawals), 2),
        'activeBuyers': active_buyers,
        'activeDeals': active_deals,
        'openTickets': open_tickets
    }


# ─────────────────────────────────────────────
#  ANNOUNCEMENT ENGINE
# ─────────────────────────────────────────────
def list_announcements(db: Session, active_only: bool = False) -> list:
    q = db.query(Announcement)
    if active_only:
        q = q.filter(Announcement.active == True)
    return q.order_by(Announcement.created_at.desc()).all()

def create_announcement(db: Session, schema: AnnouncementCreate, actor: User, ip: str, ua: str) -> Announcement:
    ann_id = next_id(db, Announcement, 'ANN')
    ann = Announcement(
        id=ann_id, author_id=actor.id,
        title=schema.title, body=schema.body,
        priority=schema.priority or 'normal',
        active=True, created_at=now_iso()
    )
    db.add(ann)
    db.commit()
    db.refresh(ann)
    record_audit(db, actor, "Create Announcement", "announcements", ann_id, ip, ua, None, ann.to_dict())
    return ann

def update_announcement(db: Session, ann_id: str, schema: AnnouncementUpdate, actor: User, ip: str, ua: str) -> Announcement:
    ann = db.query(Announcement).filter(Announcement.id == ann_id).first()
    if not ann:
        raise HTTPException(status_code=404, detail="Announcement not found")
    old = ann.to_dict()
    if schema.title is not None: ann.title = schema.title
    if schema.body is not None: ann.body = schema.body
    if schema.priority is not None: ann.priority = schema.priority
    if schema.active is not None: ann.active = schema.active
    db.commit()
    db.refresh(ann)
    record_audit(db, actor, "Update Announcement", "announcements", ann_id, ip, ua, old, ann.to_dict())
    return ann


# ─────────────────────────────────────────────
#  SESSION ENGINE
# ─────────────────────────────────────────────
def create_login_session(db: Session, user: User, token_hash: str, ip: str, ua: str) -> LoginSession:
    """Create a new login session record on successful authentication."""
    ses_id = next_id(db, LoginSession, 'SES')
    session = LoginSession(
        id=ses_id, user_id=user.id, ip_address=ip,
        user_agent=ua, token_hash=token_hash,
        active=True, created_at=now_iso(), ended_at=None
    )
    db.add(session)
    # Update user last login stats
    user.last_login = now_iso()
    user.login_count = (user.login_count or 0) + 1
    db.commit()
    db.refresh(session)
    return session

def terminate_session(db: Session, session_id: str, actor: User, ip: str, ua: str) -> LoginSession:
    """Force-terminate a specific login session."""
    session = db.query(LoginSession).filter(LoginSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.user_id != actor.id and actor.role not in ('admin', 'super_admin'):
        raise HTTPException(status_code=403, detail="Not authorized to terminate this session")
    session.active = False
    session.ended_at = now_iso()
    db.commit()
    db.refresh(session)
    record_audit(db, actor, "Force-Terminate Session", "login_sessions", session_id, ip, ua, None, session.to_dict())
    return session


# ─────────────────────────────────────────────
#  ORDER STATUS TIMELINE ENGINE
# ─────────────────────────────────────────────
def log_order_status_change(db: Session, order_id: str, from_status: str, to_status: str, actor: User, note: str = None):
    """Append an order status transition entry to the timeline."""
    log_id = next_id(db, OrderStatusLog, 'OSL')
    entry = OrderStatusLog(
        id=log_id, order_id=order_id, actor_id=actor.id,
        from_status=from_status, to_status=to_status,
        note=note, timestamp=now_iso()
    )
    db.add(entry)
    # No commit here — caller handles the transaction

def get_order_status_timeline(db: Session, order_id: str) -> list:
    return db.query(OrderStatusLog).filter(OrderStatusLog.order_id == order_id).order_by(OrderStatusLog.timestamp.asc()).all()


# ─────────────────────────────────────────────
#  DEAL SLOT HISTORY ENGINE
# ─────────────────────────────────────────────
def log_deal_slot_change(db: Session, deal_id: str, old_slots: int, new_slots: int, actor: User, reason: str = None):
    log_id = next_id(db, DealSlotHistory, 'DSH')
    entry = DealSlotHistory(
        id=log_id, deal_id=deal_id, actor_id=actor.id,
        old_slots=old_slots, new_slots=new_slots,
        reason=reason, timestamp=now_iso()
    )
    db.add(entry)

def get_deal_slot_history(db: Session, deal_id: str) -> list:
    return db.query(DealSlotHistory).filter(DealSlotHistory.deal_id == deal_id).order_by(DealSlotHistory.timestamp.desc()).all()


# ─────────────────────────────────────────────
#  WALLET STATEMENT EXPORT
# ─────────────────────────────────────────────
def generate_wallet_statement_csv(db: Session, user: User) -> str:
    """Generate CSV ledger string of all transactions for a user's wallet."""
    import io, csv
    wallet = db.query(Wallet).filter(Wallet.user_id == user.id).first()
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")
    txns = db.query(Transaction).filter(Transaction.wallet_id == wallet.id).order_by(Transaction.timestamp.asc()).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['Date', 'Type', 'Category', 'Amount (INR)', 'Status', 'Description'])
    for t in txns:
        writer.writerow([t.timestamp, t.type, t.category, t.amount, t.status, t.description or ''])
    # Summary
    writer.writerow([])
    writer.writerow(['Summary', '', '', '', '', ''])
    writer.writerow(['Pending Cashback', '', '', wallet.pending_cashback, '', ''])
    writer.writerow(['Approved Cashback', '', '', wallet.approved_cashback, '', ''])
    writer.writerow(['Withdrawable', '', '', wallet.withdrawable_cashback, '', ''])
    return output.getvalue()


# ─────────────────────────────────────────────
#  REVENUE CHART ENGINE (Feature 26/38)
# ─────────────────────────────────────────────
def get_revenue_chart(db: Session, days: int = 30) -> dict:
    """Return daily revenue, order count, and cashback data for the last N days."""
    from datetime import datetime, timedelta
    today = datetime.utcnow().date()
    data = []
    total_revenue = 0.0
    total_cashback = 0.0

    for i in range(days - 1, -1, -1):
        date = today - timedelta(days=i)
        date_str = date.strftime('%Y-%m-%d')
        day_orders = db.query(Order).filter(Order.order_date == date_str).all()
        day_revenue = sum(o.product_price for o in day_orders)
        day_cashback = sum(o.cashback_amount for o in day_orders)
        data.append({
            'date': date_str,
            'orders': len(day_orders),
            'revenue': round(day_revenue, 2),
            'cashback': round(day_cashback, 2),
        })
        total_revenue += day_revenue
        total_cashback += day_cashback

    # Calculate growth: compare last 7 days vs prior 7 days
    last7 = sum(d['revenue'] for d in data[-7:])
    prior7 = sum(d['revenue'] for d in data[-14:-7]) if len(data) >= 14 else last7
    growth_pct = round(((last7 - prior7) / prior7 * 100) if prior7 > 0 else 0, 1)

    return {
        'data': data,
        'totalRevenue': round(total_revenue, 2),
        'totalCashback': round(total_cashback, 2),
        'growthPct': growth_pct,
    }
