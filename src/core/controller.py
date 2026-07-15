import os
import csv
import io
import uvicorn
import time
from dotenv import load_dotenv  # noqa: F401

# Load .env file for local development (no-op in production where vars are injected)
load_dotenv()

from collections import defaultdict
from fastapi import FastAPI, Depends, HTTPException, status, Response, Request, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from typing import List, Optional

from src.database.db import get_db, Base, engine
from src.models.models import (
    User, Order, Refund, Wallet, Transaction, AuditLog, Deal, Withdrawal, Ticket,
    SystemSetting, Announcement, LoginSession, OrderStatusLog, DealSlotHistory,
    FeatureFlag, ReferralEarning, NotificationLog
)
from src.schemas.schemas import (
    UserLogin, UserRegister, UserResponse, UserUpdate,
    OrderCreate, OrderUpdate, OrderResponse, BulkOrderAction,
    RefundCreate, RefundUpdate, RefundResponse,
    WalletResponse, TransactionResponse, AuditLogResponse,
    APIStatsResponse, MessageResponse, DealCreate, DealUpdate, DealResponse, DealCloneRequest,
    UserProfileUpdate, WithdrawalCreate, WithdrawalUpdate, WithdrawalResponse,
    TicketCreate, TicketUpdate, TicketResponse,
    AnnouncementCreate, AnnouncementUpdate, AnnouncementResponse,
    SystemSettingUpdate, SystemSettingResponse,
    LoginSessionResponse, OrderStatusLogResponse, DealSlotHistoryResponse,
    AnalyticsSummaryResponse, VipTierResponse,
    FeatureFlagUpdate, FeatureFlagResponse,
    ReferralStatsResponse, NotificationResponse,
    RevenueChartResponse, SystemHealthResponse
)
from src.middleware.auth import (
    get_current_user, create_access_token, verify_password, sha256,
    require_admin, require_staff, require_buyer
)
from src.core import engine as biz_logic
from src.utils.helpers import today_date, generate_order_code, generate_tracking_number, now_iso, export_csv, export_excel, next_id

# In-memory rate limiting dictionary (IP -> list of timestamps)
LOGIN_RATE_LIMITS = defaultdict(list)

# Create FastAPI app
app = FastAPI(
    title="Enterprise Order Management System",
    description="Refactored deals-seller MIS powered by FastAPI and React",
    version="2.0.0"
)

# CORS setup — allow localhost + GitHub Codespaces + Vercel deployments + env-configured frontend
_EXTRA_ORIGIN = os.getenv("FRONTEND_URL", "").strip().rstrip("/")
_CORS_ORIGINS = [
    "http://localhost:5000", "http://127.0.0.1:5000",
    "http://localhost:3000", "http://127.0.0.1:3000",
    "http://localhost:80", "http://localhost",
]
if _EXTRA_ORIGIN:
    _CORS_ORIGINS.append(_EXTRA_ORIGIN)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_CORS_ORIGINS,
    allow_origin_regex=r"https://.*",  # Support Codespaces previews, Vercel deployments, etc.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Security headers middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
    # Build connect-src to include backend URL for production environments
    _backend_host = os.getenv("BACKEND_API_URL", "").strip().rstrip("/")
    _frontend_host = os.getenv("FRONTEND_URL", "").strip().rstrip("/")
    _connect_src_parts = ["'self'", "localhost:*"]
    if _backend_host:
        _connect_src_parts.append(_backend_host)
    if _frontend_host:
        _connect_src_parts.append(_frontend_host)
    # Always allow *.vercel.app and *.github.dev (Codespaces) as fallback
    _connect_src_parts += ["https://*.vercel.app", "https://*.github.dev", "https://*.app.github.dev"]
    _connect_src = " ".join(_connect_src_parts)
    response.headers["Content-Security-Policy"] = (
        f"default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
        f"style-src 'self' 'unsafe-inline' fonts.googleapis.com; "
        f"font-src 'self' fonts.gstatic.com; img-src 'self' data: blob:; "
        f"connect-src {_connect_src}; frame-ancestors 'none'"
    )
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    return response


# ─────────────────────────────────────────────
#  HEALTH CHECK ENDPOINT
# ─────────────────────────────────────────────
@app.get("/api/health", tags=["System"])
def health_check():
    """Lightweight health check for uptime monitors and Codespace startup detection."""
    from src.utils.helpers import now_iso
    return {"status": "ok", "timestamp": now_iso(), "version": "2.0.0"}


# ─────────────────────────────────────────────
#  DATABASE SEED FUNCTION
# ─────────────────────────────────────────────
def seed_database(db: Session):
    """Seed the database with default data if empty (Idempotent)."""
    # Create tables if not exist
    Base.metadata.create_all(bind=engine)
    
    # Check if admins exist
    if db.query(User).filter(User.role == 'admin').count() > 0:
        return  # already seeded
        
    print("[OK] Seeding database with enterprise mock data...")
    today = today_date()

    # 1. Seed users (admins & buyers)
    admins = [
        {'id': 'ADM001', 'name': 'Admin — deals.seller',  'email': 'admin@deals.seller.com',  'mobile': None, 'password': 'admin@123', 'role': 'admin'},
        {'id': 'ADM002', 'name': 'Owner — deals.seller',  'email': 'owner@deals.seller.com',  'mobile': None, 'password': 'owner@123', 'role': 'admin'},
        {'id': 'ADM003', 'name': 'Ekta — Admin',          'email': 'ekta@deals.seller.com',   'mobile': None, 'password': 'ayushu08', 'role': 'admin'},
    ]
    for a in admins:
        u = User(
            id=a['id'], name=a['name'], email=a['email'], mobile=a['mobile'],
            password_hash=sha256(a['password']), role=a['role'], status='active', joined=today, verified=True
        )
        db.add(u)

    buyers = [
        {'id': 'USR001', 'name': 'Ayush Chatterjee', 'email': 'alwaysayushsourav162@gmail.com', 'mobile': '9123337436', 'password': 'ekta123'},
        {'id': 'USR002', 'name': 'Shivam Raj',       'email': 'shivamraj@example.com',          'mobile': '9876543210', 'password': 'user@123'},
        {'id': 'USR003', 'name': 'Priya Sharma',     'email': 'priya@example.com',              'mobile': '9988776655', 'password': 'user@123'},
        {'id': 'USR004', 'name': 'Rahul Mehta',      'email': 'rahul@example.com',              'mobile': '9812345678', 'password': 'user@123', 'status': 'suspended'},
    ]
    for b in buyers:
        u = User(
            id=b['id'], name=b['name'], email=b['email'], mobile=b['mobile'],
            password_hash=sha256(b['password']), role='buyer', status=b.get('status', 'active'), joined=today, verified=True
        )
        db.add(u)
        
        # Create user wallet
        wallet = Wallet(
            id=f"WLT{b['id'][3:]}",
            user_id=b['id'],
            pending_cashback=0.0,
            approved_cashback=0.0,
            locked_cashback=0.0,
            withdrawable_cashback=0.0,
            refund_balance=0.0,
            last_updated=now_iso()
        )
        db.add(wallet)

    db.commit()

    # 2. Seed orders
    orders = [
        {'id': 'ORD001', 'order_no': '402-0025862-2109921', 'product_code': 'AMZ001', 'platform': 'Amazon',   'user_id': 'USR002', 'mediator': 'Aman Pandey', 'deal_type': 'Image Review', 'order_date': '2026-06-26', 'amount': 1299.00, 'deduction': 30.00, 'status': 'order_filled'},
        {'id': 'ORD002', 'order_no': '406-1422779-1212359', 'product_code': 'AMZ002', 'platform': 'Amazon',   'user_id': 'USR001', 'mediator': 'Aman Pandey', 'deal_type': 'Review',       'order_date': '2026-06-16', 'amount': 2499.00, 'deduction': 20.00, 'status': 'order_filled'},
        {'id': 'ORD003', 'order_no': '402-0437892-3137934', 'product_code': 'AMZ001', 'platform': 'Amazon',   'user_id': 'USR001', 'mediator': 'Aman Pandey', 'deal_type': 'Review',       'order_date': '2026-05-18', 'amount': 1299.00, 'deduction': 23.00, 'status': 'paid', 'refund_status': 'cleared', 'paid_date': '2026-06-01'},
        {'id': 'ORD004', 'order_no': '402-5031051-7769965', 'product_code': 'AMZ002', 'platform': 'Amazon',   'user_id': 'USR001', 'mediator': 'Aman Pandey', 'deal_type': 'Review',       'order_date': '2026-05-18', 'amount': 2499.00, 'deduction': 23.00, 'status': 'cancelled', 'refund_status': 'not_eligible'},
        {'id': 'ORD005', 'order_no': '403-1863178-4809140', 'product_code': 'FLK001', 'platform': 'Flipkart', 'user_id': 'USR001', 'mediator': 'Aman Pandey', 'deal_type': 'Review',       'order_date': '2026-05-07', 'amount': 8999.00, 'deduction': 18.00, 'status': 'paid', 'refund_status': 'cleared', 'paid_date': '2026-05-23'},
        {'id': 'ORD006', 'order_no': '408-1123456-9087654', 'product_code': 'FLK001', 'platform': 'Flipkart', 'user_id': 'USR002', 'mediator': 'Aman Pandey', 'deal_type': 'Review',       'order_date': '2026-06-20', 'amount': 8999.00, 'deduction': 35.00, 'status': 'under_review', 'refund_status': 'pending'},
        {'id': 'ORD007', 'order_no': 'FLK-9876543210',      'product_code': 'FLK001', 'platform': 'Flipkart', 'user_id': 'USR003', 'mediator': 'Aman Pandey', 'deal_type': 'Rating',       'order_date': '2026-06-25', 'amount': 8999.00, 'deduction': 200.0, 'status': 'order_filled'},
        {'id': 'ORD008', 'order_no': 'BLK-1122334455',      'product_code': 'BLK001', 'platform': 'Blinkit',  'user_id': 'USR003', 'mediator': 'Direct',       'deal_type': 'Review',       'order_date': '2026-07-01', 'amount': 290.00,  'deduction': 25.00, 'status': 'pending_review'},
    ]
    for o in orders:
        # Precalculate logic using engine calculations
        calc = biz_logic.calculate_fees(o['product_code'], o['amount'], 1, o['deduction'])
        
        ord_row = Order(
            id=o['id'], order_no=o['order_no'], order_code=generate_order_code(),
            tracking_number=generate_tracking_number(), product_name=calc['productName'],
            product_price=o['amount'], quantity=1, buyer_id=o['user_id'],
            cashback_pct=calc['cashbackPct'], cashback_amount=calc['cashbackAmount'],
            processing_fee=calc['processingFee'], deduction_amount=calc['deductionAmount'],
            net_amount=calc['netAmount'], refund_status=o.get('refund_status', 'not_eligible'),
            current_status=o['status'], approval_status='approved' if o['status'] == 'paid' else 'pending_review',
            order_date=o['order_date'], submitted_date=o['order_date'], paid_date=o.get('paid_date'),
            screenshot=True, created_by_id='ADM001', updated_by_id='ADM001'
        )
        db.add(ord_row)

        # Update wallets
        w = db.query(Wallet).filter(Wallet.user_id == o['user_id']).first()
        if w:
            if o['status'] == 'paid':
                w.withdrawable_cashback = round(w.withdrawable_cashback + calc['netAmount'], 2)
                w.approved_cashback = round(w.approved_cashback + calc['netAmount'], 2)
            elif o['status'] != 'cancelled':
                w.pending_cashback = round(w.pending_cashback + calc['netAmount'], 2)

    db.commit()

    # 3. Seed refunds
    refunds = [
        {'id': 'REF001', 'order_id': 'ORD003', 'order_no': '402-0437892-3137934', 'user_id': 'USR001', 'user_name': 'Ayush Chatterjee', 'reason': 'Cashback not credited',    'amount': 276.00,   'upi': 'ayush@upi',  'status': 'resolved',      'submitted_at': '2026-05-20T10:30:00', 'reviewed_at': '2026-05-21T14:45:00', 'resolved_at': '2026-05-22T09:00:00'},
        {'id': 'REF002', 'order_id': 'ORD006', 'order_no': '408-1123456-9087654', 'user_id': 'USR002', 'user_name': 'Shivam Raj',       'reason': 'Wrong product delivered',  'amount': 415.00,   'upi': 'shivam@upi', 'status': 'pending',       'submitted_at': '2026-06-22T08:00:00'},
        {'id': 'REF003', 'order_id': 'ORD007', 'order_no': 'FLK-9876543210',      'user_id': 'USR003', 'user_name': 'Priya Sharma',     'reason': 'Order not delivered',      'amount': 8799.00,  'upi': 'priya@upi',  'status': 'under_review',  'submitted_at': '2026-06-27T16:20:00', 'reviewed_at': '2026-06-27T18:00:00'},
    ]
    for r in refunds:
        ref_row = Refund(
            id=r['id'], order_id=r['order_id'], order_no=r['order_no'], user_id=r['user_id'],
            user_name=r['user_name'], reason=r['reason'], amount=r['amount'], upi=r['upi'],
            status=r['status'], submitted_at=r['submitted_at'], reviewed_at=r.get('reviewed_at'),
            resolved_at=r.get('resolved_at')
        )
        db.add(ref_row)

        if r['status'] == 'resolved':
            w = db.query(Wallet).filter(Wallet.user_id == r['user_id']).first()
            if w:
                w.refund_balance = round(w.refund_balance + r['amount'], 2)

    # 4. Seed deals catalog
    if db.query(Deal).count() == 0:
        default_deals = [
            {'id': 'DEA001', 'product_code': 'AMZ001', 'product_name': 'boAt Rockerz 255 Pro+ Wireless Earphones', 'platform': 'Amazon', 'price': 1299.0, 'cashback': 300.0, 'slots': 4, 'active': True},
            {'id': 'DEA002', 'product_code': 'AMZ002', 'product_name': 'Noise ColorFit Pro 4 Smartwatch', 'platform': 'Amazon', 'price': 2499.0, 'cashback': 500.0, 'slots': 4, 'active': True},
            {'id': 'DEA003', 'product_code': 'FLK001', 'product_name': 'Redmi 13C 4G Smartphone (128GB)', 'platform': 'Flipkart', 'price': 8999.0, 'cashback': 800.0, 'slots': 5, 'active': True},
            {'id': 'DEA004', 'product_code': 'FLK002', 'product_name': 'Mi 43" 4K Ultra HD Android TV', 'platform': 'Flipkart', 'price': 24999.0, 'cashback': 2000.0, 'slots': 3, 'active': True},
            {'id': 'DEA005', 'product_code': 'BLK001', 'product_name': 'Amul Butter (500g)', 'platform': 'Blinkit', 'price': 290.0, 'cashback': 60.0, 'slots': 6, 'active': True},
            {'id': 'DEA006', 'product_code': 'AMZ003', 'product_name': 'HP 15 Laptop Intel Core i5 (8GB/512GB)', 'platform': 'Amazon', 'price': 49999.0, 'cashback': 3500.0, 'slots': 2, 'active': True},
            {'id': 'DEA007', 'product_code': 'FLK003', 'product_name': 'Puma Men\'s Running Shoes', 'platform': 'Flipkart', 'price': 2999.0, 'cashback': 400.0, 'slots': 4, 'active': True},
        ]
        for d in default_deals:
            deal_row = Deal(
                id=d['id'],
                product_code=d['product_code'],
                product_name=d['product_name'],
                platform=d['platform'],
                price=d['price'],
                cashback=d['cashback'],
                slots=d['slots'],
                active=d['active']
            )
            db.add(deal_row)

    db.commit()
    print("[OK] Mock seed complete.")

@app.on_event("startup")
def startup_event():
    db = next(get_db())
    seed_database(db)

# ─────────────────────────────────────────────
#  AUTHENTICATION APIS
# ─────────────────────────────────────────────
@app.post("/api/auth/login", response_model=MessageResponse)
def login(schema: UserLogin, response: Response, request: Request, db: Session = Depends(get_db)):
    ip = request.client.host if request.client else "unknown"
    ua = request.headers.get("user-agent", "unknown")

    # Rate limiting: Max 10 attempts per 60 seconds
    now = time.time()
    LOGIN_RATE_LIMITS[ip] = [t for t in LOGIN_RATE_LIMITS[ip] if now - t < 60]
    if len(LOGIN_RATE_LIMITS[ip]) >= 10:
        biz_logic.record_audit(db, None, "Login Rate Limit Triggered", "security", None, ip, ua, {"ip": ip})
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many login attempts. Please wait 60 seconds."
        )
    LOGIN_RATE_LIMITS[ip].append(now)

    user = db.query(User).filter(
        (User.email == schema.identifier) |
        (User.mobile == schema.identifier) |
        (User.name == schema.identifier)
    ).first()

    # Old Flask username stubs fallback mapping
    admin_usernames = {'admin': 'ADM001', 'owner': 'ADM002', 'ekta': 'ADM003'}
    if not user and schema.identifier in admin_usernames:
        user = db.query(User).filter(User.id == admin_usernames[schema.identifier]).first()

    if not user or not verify_password(schema.password, user.password_hash):
        biz_logic.record_audit(db, None, "Login Failure", "users", None, ip, ua, {"identifier": schema.identifier})
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials. Please try again."
        )

    if user.status == 'suspended':
        biz_logic.record_audit(db, user, "Login Suspended", "users", user.id, ip, ua)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been suspended. Contact support."
        )

    biz_logic.record_audit(db, user, "Login Success", "users", user.id, ip, ua)

    token = create_access_token(data={"sub": user.id, "role": user.role})
    response.set_cookie(
        key="token",
        value=token,
        httponly=True,
        samesite="lax",
        secure=False # set to True in production
    )
    return {"success": True, "message": "Login successful"}

@app.post("/api/auth/register", response_model=MessageResponse)
def register(schema: UserRegister, response: Response, request: Request, db: Session = Depends(get_db)):
    ip = request.client.host if request.client else "127.0.0.1"
    ua = request.headers.get("user-agent", "unknown")

    # Password complexity enforcement
    if len(schema.password) < 8 or not any(c.isdigit() for c in schema.password) or not any(c.isalpha() for c in schema.password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters long and contain both letters and numbers."
        )

    user = biz_logic.register_user(db, schema, ip, ua)
    
    token = create_access_token(data={"sub": user.id, "role": user.role})
    response.set_cookie(key="token", value=token, httponly=True, samesite="lax")
    return {"success": True, "message": "Registration successful"}

@app.get("/api/auth/me")
def get_me(user: User = Depends(get_current_user)):
    return {"success": True, "user": user.to_dict()}

@app.post("/api/auth/logout", response_model=MessageResponse)
def logout(response: Response):
    response.delete_cookie("token")
    return {"success": True, "message": "Logged out successfully"}

# ─────────────────────────────────────────────
#  ORDER APIS
# ─────────────────────────────────────────────
@app.get("/api/orders", response_model=List[OrderResponse])
def get_orders(
    user_id: Optional[str] = None,
    q: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Order)
    
    # 1. Enforcement of Role permissions
    if current_user.role != "admin" and current_user.role != "manager" and current_user.role != "auditor":
        # Buyers can only see their own orders
        query = query.filter(Order.buyer_id == current_user.id)
    elif user_id:
        # Admin filtering by buyer
        query = query.filter(Order.buyer_id == user_id)

    # 2. Global Search
    if q:
        q_wild = f"%{q}%"
        # Search by order no, order code, tracking number, product name, buyer id, or date
        query = query.filter(
            Order.order_no.like(q_wild) |
            Order.order_code.like(q_wild) |
            Order.tracking_number.like(q_wild) |
            Order.product_name.like(q_wild) |
            Order.buyer_id.like(q_wild) |
            Order.current_status.like(q_wild) |
            Order.order_date.like(q_wild)
        )

    return query.all()

@app.post("/api/orders", response_model=OrderResponse)
def create_order(
    schema: OrderCreate,
    request: Request,
    buyer_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Determine the buyer
    if current_user.role in ["admin", "manager"]:
        if not buyer_id:
            raise HTTPException(status_code=400, detail="Missing buyer_id for admin assignment")
        buyer = db.query(User).filter(User.id == buyer_id).first()
        if not buyer:
            raise HTTPException(status_code=404, detail="Buyer user not found")
    else:
        buyer = current_user

    ip = request.client.host if request.client else "127.0.0.1"
    ua = request.headers.get("user-agent", "unknown")
    
    return biz_logic.create_order(db, schema, buyer, current_user, ip, ua)

@app.patch("/api/orders/{order_id}", response_model=OrderResponse)
def update_order(
    order_id: str,
    schema: OrderUpdate,
    request: Request,
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    ip = request.client.host if request.client else "127.0.0.1"
    ua = request.headers.get("user-agent", "unknown")
    return biz_logic.update_order(db, order_id, schema, current_user, ip, ua)

@app.delete("/api/orders/{order_id}", response_model=MessageResponse)
def delete_order(
    order_id: str,
    request: Request,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    ip = request.client.host if request.client else "127.0.0.1"
    ua = request.headers.get("user-agent", "unknown")
    biz_logic.delete_order(db, order_id, current_user, ip, ua)
    return {"success": True, "message": "Order deleted successfully"}

@app.post("/api/orders/bulk-upload", response_model=MessageResponse)
async def bulk_upload_orders(
    request: Request,
    file: UploadFile = File(...),
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    contents = await file.read()
    decoded = contents.decode('utf-8')
    csv_reader = csv.DictReader(io.StringIO(decoded))
    
    ip = request.client.host if request.client else "127.0.0.1"
    ua = request.headers.get("user-agent", "unknown")
    
    count = 0
    errors = []
    
    for row in csv_reader:
        try:
            # Expected headers: orderNo, productCode, amount, buyerEmail, orderDate
            order_no = row.get('orderNo') or row.get('order_no')
            product_code = row.get('productCode') or row.get('product_code')
            amount_str = row.get('amount', '0')
            buyer_email = row.get('buyerEmail') or row.get('buyer_email')
            order_date = row.get('orderDate') or row.get('order_date') or today_date()
            
            if not order_no or not product_code or not buyer_email:
                errors.append(f"Row {count+1}: Missing required fields.")
                continue
                
            buyer = db.query(User).filter(User.email == buyer_email).first()
            if not buyer:
                errors.append(f"Row {count+1}: Buyer with email {buyer_email} not found.")
                continue
                
            schema = OrderCreate(
                orderNo=order_no,
                productCode=product_code,
                platform="Amazon", # default platform
                mediator="Bulk Upload",
                dealType="Review",
                orderDate=order_date,
                amount=float(amount_str),
                deduction=0.0,
                screenshot=True
            )
            
            biz_logic.create_order(db, schema, buyer, current_user, ip, ua)
            count += 1
        except Exception as e:
            errors.append(f"Row {count+1} error: {str(e)}")
            
    if errors:
        return {
            "success": True, 
            "message": f"Bulk upload completed with warnings. Imported {count} orders. Errors: {'; '.join(errors[:5])}"
        }
        
    return {"success": True, "message": f"Successfully imported {count} orders"}

# ─────────────────────────────────────────────
#  REFUNDS APIS
# ─────────────────────────────────────────────
@app.get("/api/refunds", response_model=List[RefundResponse])
def get_refunds(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role in ["admin", "manager", "auditor"]:
        return db.query(Refund).all()
    return db.query(Refund).filter(Refund.user_id == current_user.id).all()

@app.post("/api/refunds", response_model=RefundResponse)
def create_refund(
    schema: RefundCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    ip = request.client.host if request.client else "127.0.0.1"
    ua = request.headers.get("user-agent", "unknown")
    return biz_logic.create_refund(db, schema, current_user, ip, ua)

@app.patch("/api/refunds/{refund_id}", response_model=RefundResponse)
def review_refund(
    refund_id: str,
    schema: RefundUpdate,
    request: Request,
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    ip = request.client.host if request.client else "127.0.0.1"
    ua = request.headers.get("user-agent", "unknown")
    return biz_logic.review_refund(db, refund_id, schema, current_user, ip, ua)

# ─────────────────────────────────────────────
#  USER APIS
# ─────────────────────────────────────────────
@app.get("/api/users", response_model=List[UserResponse])
def get_users(
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    return db.query(User).filter(User.role == 'buyer').all()

@app.patch("/api/users/{user_id}", response_model=UserResponse)
def update_user(
    user_id: str,
    schema: UserUpdate,
    request: Request,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    ip = request.client.host if request.client else "127.0.0.1"
    ua = request.headers.get("user-agent", "unknown")
    return biz_logic.update_user(db, user_id, schema, current_user, ip, ua)

# ─────────────────────────────────────────────
#  WALLET APIS
# ─────────────────────────────────────────────
@app.get("/api/wallet", response_model=WalletResponse)
def get_wallet(
    user_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    target_uid = current_user.id
    if current_user.role in ["admin", "manager", "auditor"] and user_id:
        target_uid = user_id
        
    wallet = db.query(Wallet).filter(Wallet.user_id == target_uid).first()
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")
    return wallet

@app.get("/api/wallet/transactions", response_model=List[TransactionResponse])
def get_wallet_transactions(
    user_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    target_uid = current_user.id
    if current_user.role in ["admin", "manager", "auditor"] and user_id:
        target_uid = user_id
        
    wallet = db.query(Wallet).filter(Wallet.user_id == target_uid).first()
    if not wallet:
        return []
        
    return db.query(Transaction).filter(Transaction.wallet_id == wallet.id).order_by(Transaction.timestamp.desc()).all()

# ─────────────────────────────────────────────
#  METRICS & REPORTS EXPORTS APIS
# ─────────────────────────────────────────────
@app.get("/api/stats", response_model=APIStatsResponse)
def get_dashboard_stats(
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    return biz_logic.get_stats(db)

@app.get("/api/reports/export")
def export_reports(
    type: str = "orders",
    format: str = "csv",
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    headers, data = biz_logic.get_report_data(db, type)
    
    if format == "csv":
        csv_str = export_csv(headers, data)
        return Response(
            content=csv_str,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={type}_report.csv"}
        )
    elif format == "excel":
        xlsx_bytes = export_excel(headers, data)
        return Response(
            content=xlsx_bytes,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={type}_report.xlsx"}
        )
    else:
        raise HTTPException(status_code=400, detail="Unsupported format. Choose 'csv' or 'excel'.")

# ─────────────────────────────────────────────
#  AUDIT LOGS APIS
# ─────────────────────────────────────────────
@app.get("/api/audit-logs", response_model=List[AuditLogResponse])
def get_audit_logs(
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    return db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(100).all()


# ─────────────────────────────────────────────
#  DEALS APIS — ALL LOGGED-IN USERS SEE ALL DEALS
# ─────────────────────────────────────────────
@app.get("/api/deals", response_model=List[DealResponse], tags=["Deals"])
def list_deals(
    q: Optional[str] = None,
    category: Optional[str] = None,
    platform: Optional[str] = None,
    featured: Optional[bool] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """All logged-in users (any role) see ALL active deals. Admins also see inactive ones."""
    if current_user.role in ('admin', 'super_admin', 'manager', 'auditor'):
        query = db.query(Deal)
    else:
        # Buyers see all active deals — no restriction
        query = db.query(Deal).filter(Deal.active == True)

    if q:
        query = query.filter(
            Deal.product_name.like(f"%{q}%") |
            Deal.platform.like(f"%{q}%") |
            Deal.product_code.like(f"%{q}%") |
            Deal.category.like(f"%{q}%")
        )
    if category and category != 'All':
        query = query.filter(Deal.category == category)
    if platform and platform != 'All':
        query = query.filter(Deal.platform == platform)
    if featured is not None:
        query = query.filter(Deal.featured == featured)

    return query.order_by(Deal.featured.desc(), Deal.cashback.desc()).all()


@app.get("/api/deals/{deal_id}", tags=["Deals"])
def get_deal_detail(
    deal_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Feature 2: Deal detail — visible to all logged-in users."""
    deal = db.query(Deal).filter(Deal.id == deal_id).first()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    return deal.to_dict()


@app.post("/api/deals", response_model=DealResponse, tags=["Deals"])
def create_deal(
    schema: DealCreate,
    request: Request,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    ip = request.client.host if request.client else "unknown"
    ua = request.headers.get("user-agent", "unknown")
    return biz_logic.create_deal(db, schema, current_user, ip, ua)


@app.patch("/api/deals/{deal_id}", response_model=DealResponse, tags=["Deals"])
def update_deal(
    deal_id: str,
    schema: DealUpdate,
    request: Request,
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    ip = request.client.host if request.client else "unknown"
    ua = request.headers.get("user-agent", "unknown")
    return biz_logic.update_deal(db, deal_id, schema, current_user, ip, ua)


@app.delete("/api/deals/{deal_id}", tags=["Deals"])
def delete_deal(
    deal_id: str,
    request: Request,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    ip = request.client.host if request.client else "unknown"
    ua = request.headers.get("user-agent", "unknown")
    biz_logic.delete_deal(db, deal_id, current_user, ip, ua)
    return {"success": True, "message": "Deal permanently removed"}


@app.post("/api/deals/{deal_id}/clone", tags=["Deals"])
def clone_deal(
    deal_id: str,
    schema: DealCloneRequest,
    request: Request,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Feature 21: Clone an existing deal with a new product code."""
    original = db.query(Deal).filter(Deal.id == deal_id).first()
    if not original:
        raise HTTPException(status_code=404, detail="Deal not found")
    # Check code uniqueness
    existing = db.query(Deal).filter(Deal.product_code == schema.new_product_code).first()
    if existing:
        raise HTTPException(status_code=409, detail="Product code already exists")

    cloned = Deal(
        id=next_id(db, Deal, 'DEA'),
        product_code=schema.new_product_code,
        product_name=f"{original.product_name} (Copy)",
        platform=original.platform,
        price=original.price,
        cashback=original.cashback,
        slots=schema.new_slots if schema.new_slots else original.slots,
        active=False,  # cloned deals start inactive
        category=original.category,
        description=original.description,
        image_url=original.image_url,
        rating=original.rating,
        deal_type=original.deal_type,
        min_order_value=original.min_order_value,
        max_per_user=original.max_per_user,
        featured=False,
        tags=original.tags,
        created_at=now_iso()
    )
    db.add(cloned)
    db.commit()
    db.refresh(cloned)
    return cloned.to_dict()


@app.patch("/api/deals/{deal_id}/slots", tags=["Deals"])
def adjust_deal_slots(
    deal_id: str,
    new_slots: int,
    reason: Optional[str] = None,
    request: Request = None,
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    """Feature 20: Manager can adjust slots without full deal edit."""
    deal = db.query(Deal).filter(Deal.id == deal_id).first()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    old_slots = deal.slots
    deal.slots = new_slots
    history = DealSlotHistory(
        id=next_id(db, DealSlotHistory, 'DSH'),
        deal_id=deal_id, actor_id=current_user.id,
        old_slots=old_slots, new_slots=new_slots,
        reason=reason or "Manual adjustment",
        timestamp=now_iso()
    )
    db.add(history)
    db.commit()
    db.refresh(deal)
    return deal.to_dict()


from pydantic import BaseModel, Field

class BulkOrderPatchSchema(BaseModel):
    order_ids: List[str] = Field(..., alias="orderIds")
    status: str
    
    class Config:
        allow_population_by_field_name = True
        populate_by_name = True

@app.patch("/api/users/profile", response_model=UserResponse, tags=["Users"])
def update_profile(
    schema: UserProfileUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Feature 8: Profile & KYC Center — update profile fields."""
    ip = request.client.host if request.client else "unknown"
    ua = request.headers.get("user-agent", "unknown")

    old_dict = current_user.to_dict()

    if schema.name is not None:
        current_user.name = schema.name
    if schema.email is not None:
        dup = db.query(User).filter(User.email == schema.email, User.id != current_user.id).first()
        if dup:
            raise HTTPException(status_code=400, detail="Email is already taken.")
        current_user.email = schema.email
    if schema.mobile is not None:
        dup = db.query(User).filter(User.mobile == schema.mobile, User.id != current_user.id).first()
        if dup:
            raise HTTPException(status_code=400, detail="Mobile is already taken.")
        current_user.mobile = schema.mobile
    if schema.upi is not None:
        current_user.upi = schema.upi
    if schema.bio is not None:
        current_user.bio = schema.bio
    if schema.avatar_color is not None:
        current_user.avatar_color = schema.avatar_color

    db.commit()
    db.refresh(current_user)

    biz_logic.record_audit(db, current_user, "Update Profile", "users", current_user.id, ip, ua, old_dict, current_user.to_dict())
    return current_user


@app.post("/api/users", response_model=UserResponse, tags=["Users"])
def create_user_by_admin(
    schema: UserRegister,
    role: Optional[str] = "buyer",
    request: Request = None,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Feature 22 & 37: Admin creates any user (buyer, manager, auditor, admin)."""
    ip = request.client.host if request.client else "unknown"
    ua = request.headers.get("user-agent", "unknown")
    user = biz_logic.register_user(db, schema, ip, ua)
    if role and role != 'buyer':
        user.role = role
        db.commit()
        db.refresh(user)
    return user


@app.get("/api/users/all", response_model=List[UserResponse], tags=["Users"])
def get_all_users(
    q: Optional[str] = None,
    role: Optional[str] = None,
    status_filter: Optional[str] = None,
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    """Feature 22: Enhanced user management — search by role, status, name."""
    query = db.query(User)
    if q:
        query = query.filter(
            User.name.like(f"%{q}%") |
            User.email.like(f"%{q}%") |
            User.mobile.like(f"%{q}%") |
            User.id.like(f"%{q}%")
        )
    if role:
        query = query.filter(User.role == role)
    if status_filter:
        query = query.filter(User.status == status_filter)
    return query.all()

@app.get("/api/withdrawals", response_model=List[WithdrawalResponse])
def list_withdrawals(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role in ["admin", "manager", "auditor"]:
        return db.query(Withdrawal).all()
    return db.query(Withdrawal).filter(Withdrawal.user_id == current_user.id).all()

@app.post("/api/withdrawals", response_model=WithdrawalResponse)
def create_withdrawal_request(
    schema: WithdrawalCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    ip = request.client.host if request.client else "unknown"
    ua = request.headers.get("user-agent", "unknown")
    return biz_logic.create_withdrawal(db, schema, current_user, ip, ua)

@app.patch("/api/withdrawals/{wth_id}", response_model=WithdrawalResponse)
def review_withdrawal_request(
    wth_id: str,
    schema: WithdrawalUpdate,
    request: Request,
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    ip = request.client.host if request.client else "unknown"
    ua = request.headers.get("user-agent", "unknown")
    return biz_logic.review_withdrawal(db, wth_id, schema, current_user, ip, ua)

@app.post("/api/orders/bulk-patch", response_model=MessageResponse)
def bulk_patch_orders(
    schema: BulkOrderPatchSchema,
    request: Request,
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    ip = request.client.host if request.client else "unknown"
    ua = request.headers.get("user-agent", "unknown")
    
    success_count = 0
    for oid in schema.order_ids:
        try:
            order_update = OrderUpdate(currentStatus=schema.status)
            biz_logic.update_order(db, oid, order_update, current_user, ip, ua)
            success_count += 1
        except Exception as e:
            print(f"Error bulk updating order {oid}: {str(e)}")
            
    return {"success": True, "message": f"Successfully updated {success_count} of {len(schema.order_ids)} orders to {schema.status}."}


# ─────────────────────────────────────────────
#  SUPPORT TICKETS API
# ─────────────────────────────────────────────
@app.get("/api/tickets", tags=["Tickets"])
def list_tickets(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role in ('admin', 'super_admin', 'manager', 'staff'):
        tickets = db.query(Ticket).order_by(Ticket.created_at.desc()).all()
    else:
        tickets = db.query(Ticket).filter(Ticket.user_id == current_user.id).order_by(Ticket.created_at.desc()).all()
    return [t.to_dict() for t in tickets]

@app.post("/api/tickets", tags=["Tickets"])
def create_ticket(
    schema: TicketCreate,
    request: Request,
    current_user: User = Depends(require_buyer),
    db: Session = Depends(get_db)
):
    ip = request.client.host if request.client else "unknown"
    ua = request.headers.get("user-agent", "unknown")
    ticket = biz_logic.create_ticket(db, schema, current_user, ip, ua)
    return ticket.to_dict()

@app.patch("/api/tickets/{ticket_id}", tags=["Tickets"])
def review_ticket(
    ticket_id: str,
    schema: TicketUpdate,
    request: Request,
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    ip = request.client.host if request.client else "unknown"
    ua = request.headers.get("user-agent", "unknown")
    ticket = biz_logic.review_ticket(db, ticket_id, schema, current_user, ip, ua)
    return ticket.to_dict()


# ─────────────────────────────────────────────
#  ANNOUNCEMENTS API
# ─────────────────────────────────────────────
@app.get("/api/announcements", tags=["Announcements"])
def list_announcements(
    active_only: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    anns = biz_logic.list_announcements(db, active_only=active_only)
    return [a.to_dict() for a in anns]

@app.post("/api/announcements", tags=["Announcements"])
def create_announcement(
    schema: AnnouncementCreate,
    request: Request,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    ip = request.client.host if request.client else "unknown"
    ua = request.headers.get("user-agent", "unknown")
    ann = biz_logic.create_announcement(db, schema, current_user, ip, ua)
    return ann.to_dict()

@app.patch("/api/announcements/{ann_id}", tags=["Announcements"])
def update_announcement(
    ann_id: str,
    schema: AnnouncementUpdate,
    request: Request,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    ip = request.client.host if request.client else "unknown"
    ua = request.headers.get("user-agent", "unknown")
    ann = biz_logic.update_announcement(db, ann_id, schema, current_user, ip, ua)
    return ann.to_dict()


# ─────────────────────────────────────────────
#  ANALYTICS API
# ─────────────────────────────────────────────
@app.get("/api/analytics/summary", tags=["Analytics"])
def get_analytics_summary(
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    """Feature 12/26: Analytics summary — admins + auditors."""
    return biz_logic.get_analytics_summary(db)


@app.get("/api/analytics/revenue", tags=["Analytics"])
def get_revenue_chart(
    days: int = 30,
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    """Feature 26/38: Revenue chart data for the last N days."""
    return biz_logic.get_revenue_chart(db, days)


@app.get("/api/analytics/deals", tags=["Analytics"])
def get_deal_analytics(
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    """Feature 15: Deal performance analytics."""
    deals = db.query(Deal).all()
    result = []
    for d in deals:
        orders_for_deal = db.query(Order).filter(Order.deal_id == d.id).count()
        paid_for_deal = db.query(Order).filter(Order.deal_id == d.id, Order.current_status == 'paid').count()
        result.append({
            'dealId': d.id, 'productName': d.product_name, 'platform': d.platform,
            'totalOrders': orders_for_deal, 'paidOrders': paid_for_deal,
            'slotsRemaining': d.slots, 'cashback': d.cashback, 'active': d.active,
            'claimedCount': d.claimed_count,
        })
    return result


# ─────────────────────────────────────────────
#  SYSTEM SETTINGS API
# ─────────────────────────────────────────────
@app.get("/api/settings", tags=["Settings"])
def list_settings(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    settings = db.query(SystemSetting).all()
    return [s.to_dict() for s in settings]

@app.put("/api/settings/{key}", tags=["Settings"])
def update_setting(
    key: str,
    schema: SystemSettingUpdate,
    request: Request,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    ip = request.client.host if request.client else "unknown"
    ua = request.headers.get("user-agent", "unknown")
    setting = biz_logic.update_system_setting(db, key, schema, current_user, ip, ua)
    return setting.to_dict()


# ─────────────────────────────────────────────
#  VIP TIER API
# ─────────────────────────────────────────────
@app.get("/api/users/me/vip", tags=["VIP"])
def get_my_vip_tier(
    current_user: User = Depends(require_buyer),
    db: Session = Depends(get_db)
):
    return biz_logic.get_user_vip_tier(db, current_user.id)

@app.get("/api/users/{user_id}/vip", tags=["VIP"])
def get_user_vip_tier(
    user_id: str,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    return biz_logic.get_user_vip_tier(db, user_id)


# ─────────────────────────────────────────────
#  FRAUD CHECK API
# ─────────────────────────────────────────────
@app.get("/api/orders/{order_id}/fraud-check", tags=["Fraud"])
def order_fraud_check(
    order_id: str,
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    flags = biz_logic.check_order_fraud_status(db, order.order_no, order.buyer_id)
    return {"orderId": order_id, "fraudFlags": flags, "isFlagged": len(flags) > 0}


# ─────────────────────────────────────────────
#  ORDER STATUS TIMELINE API
# ─────────────────────────────────────────────
@app.get("/api/orders/{order_id}/timeline", tags=["Orders"])
def get_order_timeline(
    order_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    timeline = biz_logic.get_order_status_timeline(db, order_id)
    return [t.to_dict() for t in timeline]


# ─────────────────────────────────────────────
#  DEAL SLOT HISTORY API
# ─────────────────────────────────────────────
@app.get("/api/deals/{deal_id}/slot-history", tags=["Deals"])
def get_deal_slot_history(
    deal_id: str,
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    history = biz_logic.get_deal_slot_history(db, deal_id)
    return [h.to_dict() for h in history]


# ─────────────────────────────────────────────
#  LOGIN SESSIONS API
# ─────────────────────────────────────────────
@app.get("/api/sessions", tags=["Sessions"])
def list_my_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    sessions = db.query(LoginSession).filter(LoginSession.user_id == current_user.id).order_by(LoginSession.created_at.desc()).limit(20).all()
    return [s.to_dict() for s in sessions]

@app.delete("/api/sessions/{session_id}", tags=["Sessions"])
def terminate_session(
    session_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    ip = request.client.host if request.client else "unknown"
    ua = request.headers.get("user-agent", "unknown")
    session = biz_logic.terminate_session(db, session_id, current_user, ip, ua)
    return {"success": True, "sessionId": session.id, "endedAt": session.ended_at}


# ─────────────────────────────────────────────
#  WALLET STATEMENT EXPORT API
# ─────────────────────────────────────────────
@app.get("/api/wallet/statement.csv", tags=["Wallet"])
def download_wallet_statement(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    csv_str = biz_logic.generate_wallet_statement_csv(db, current_user)
    return StreamingResponse(
        iter([csv_str]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=wallet_statement_{current_user.id}.csv"}
    )


# ─────────────────────────────────────────────
#  FEATURE FLAGS API (Feature 39/40)
# ─────────────────────────────────────────────
@app.get("/api/feature-flags", tags=["Admin"])
def list_feature_flags(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Feature 39: Get all feature flags."""
    flags = db.query(FeatureFlag).all()
    return [f.to_dict() for f in flags]


@app.put("/api/feature-flags/{key}", tags=["Admin"])
def toggle_feature_flag(
    key: str,
    schema: FeatureFlagUpdate,
    request: Request,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Feature 40: Toggle a feature flag on/off."""
    flag = db.query(FeatureFlag).filter(FeatureFlag.key == key).first()
    if not flag:
        flag = FeatureFlag(key=key, enabled=schema.enabled, description=schema.description, updated_at=now_iso(), updated_by=current_user.id)
        db.add(flag)
    else:
        flag.enabled = schema.enabled
        if schema.description:
            flag.description = schema.description
        flag.updated_at = now_iso()
        flag.updated_by = current_user.id
    db.commit()
    db.refresh(flag)
    return flag.to_dict()


# ─────────────────────────────────────────────
#  REFERRAL API (Feature 9)
# ─────────────────────────────────────────────
@app.get("/api/referrals/my", tags=["Referrals"])
def get_my_referral_stats(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Feature 9: Referral dashboard stats."""
    base_url = str(request.base_url).rstrip('/')
    referred_users = db.query(User).filter(User.referrer_id == current_user.id).all()
    earnings = db.query(ReferralEarning).filter(ReferralEarning.referrer_id == current_user.id).all()
    total_earned = sum(e.amount for e in earnings)
    pending_earned = sum(e.amount for e in earnings if e.status == 'pending')
    return {
        "referralCode": current_user.referral,
        "referralLink": f"{base_url}/login?ref={current_user.referral}",
        "totalReferrals": len(referred_users),
        "totalEarned": total_earned,
        "pendingEarned": pending_earned,
        "referredUsers": [{"name": u.name, "joined": u.joined, "status": u.status} for u in referred_users]
    }


# ─────────────────────────────────────────────
#  NOTIFICATIONS API (Feature 10/38)
# ─────────────────────────────────────────────
@app.get("/api/notifications", tags=["Notifications"])
def get_my_notifications(
    unread_only: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Feature 10: Get notifications for current user."""
    query = db.query(NotificationLog).filter(NotificationLog.user_id == current_user.id)
    if unread_only:
        query = query.filter(NotificationLog.read == False)
    return [n.to_dict() for n in query.order_by(NotificationLog.created_at.desc()).limit(50).all()]


@app.patch("/api/notifications/{notif_id}/read", tags=["Notifications"])
def mark_notification_read(
    notif_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    notif = db.query(NotificationLog).filter(NotificationLog.id == notif_id, NotificationLog.user_id == current_user.id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.read = True
    db.commit()
    return {"success": True}


@app.patch("/api/notifications/mark-all-read", tags=["Notifications"])
def mark_all_notifications_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db.query(NotificationLog).filter(NotificationLog.user_id == current_user.id, NotificationLog.read == False).update({"read": True})
    db.commit()
    return {"success": True}


# ─────────────────────────────────────────────
#  SYSTEM HEALTH API (Feature 31/34)
# ─────────────────────────────────────────────
@app.get("/api/health/full", tags=["System"])
def system_health_full(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Feature 31/34: Full system health check — DB stats, counts, sessions."""
    import os
    db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'portal.db')
    db_size_kb = 0.0
    if os.path.exists(db_path):
        db_size_kb = round(os.path.getsize(db_path) / 1024, 2)

    return {
        "status": "healthy",
        "dbSizeKb": db_size_kb,
        "totalUsers": db.query(User).count(),
        "totalOrders": db.query(Order).count(),
        "totalDeals": db.query(Deal).count(),
        "activeSessions": db.query(LoginSession).filter(LoginSession.active == True).count(),
        "openTickets": db.query(Ticket).filter(Ticket.status == 'open').count(),
        "pendingWithdrawals": db.query(Withdrawal).filter(Withdrawal.status == 'pending').count(),
        "version": "3.0.0",
        "timestamp": now_iso()
    }


# ─────────────────────────────────────────────
#  GLOBAL SEARCH API (Feature 35)
# ─────────────────────────────────────────────
@app.get("/api/search", tags=["Admin"])
def global_search(
    q: str,
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    """Feature 35: Global search across orders, users, deals, tickets."""
    if not q or len(q) < 2:
        return {"users": [], "orders": [], "deals": [], "tickets": []}

    wq = f"%{q}%"
    users = db.query(User).filter(
        User.name.like(wq) | User.email.like(wq) | User.mobile.like(wq) | User.id.like(wq)
    ).limit(5).all()
    orders = db.query(Order).filter(
        Order.order_no.like(wq) | Order.order_code.like(wq) | Order.product_name.like(wq)
    ).limit(5).all()
    deals = db.query(Deal).filter(
        Deal.product_name.like(wq) | Deal.product_code.like(wq) | Deal.platform.like(wq)
    ).limit(5).all()
    tickets = db.query(Ticket).filter(
        Ticket.title.like(wq) | Ticket.description.like(wq)
    ).limit(5).all()

    return {
        "users": [u.to_dict() for u in users],
        "orders": [o.to_dict() for o in orders],
        "deals": [d.to_dict() for d in deals],
        "tickets": [t.to_dict() for t in tickets],
    }


# ─────────────────────────────────────────────
#  ADMIN SESSIONS MANAGEMENT (Feature 29/32)
# ─────────────────────────────────────────────
@app.get("/api/admin/sessions", tags=["Admin"])
def list_all_sessions(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Feature 29: Admin sees all active sessions."""
    sessions = db.query(LoginSession).filter(LoginSession.active == True).order_by(LoginSession.created_at.desc()).limit(100).all()
    result = []
    for s in sessions:
        user = db.query(User).filter(User.id == s.user_id).first()
        d = s.to_dict()
        if user:
            d['userName'] = user.name
            d['userRole'] = user.role
        result.append(d)
    return result


@app.delete("/api/admin/sessions/{session_id}", tags=["Admin"])
def admin_terminate_session(
    session_id: str,
    request: Request,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Feature 29: Admin force-terminates a session."""
    ip = request.client.host if request.client else "unknown"
    ua = request.headers.get("user-agent", "unknown")
    session = db.query(LoginSession).filter(LoginSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    session.active = False
    session.ended_at = now_iso()
    biz_logic.record_audit(db, current_user, "Terminate Session", "sessions", session_id, ip, ua)
    db.commit()
    return {"success": True, "message": f"Session {session_id} terminated"}


# ─────────────────────────────────────────────
#  ADMIN IMPERSONATION API (super_admin only)
# ─────────────────────────────────────────────
@app.post("/api/admin/impersonate/{user_id}", tags=["Admin"])
def impersonate_user(
    user_id: str,
    request: Request,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Feature 32: Super admin impersonates any user for debugging."""
    if current_user.role not in ('super_admin', 'admin'):
        raise HTTPException(status_code=403, detail="Only admin/super_admin can impersonate users")
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    ip = request.client.host if request.client else "unknown"
    ua = request.headers.get("user-agent", "unknown")
    token_data = {"sub": target.id, "role": target.role, "impersonated_by": current_user.id}
    token = create_access_token(token_data)
    biz_logic.record_audit(db, current_user, "Impersonate User", "users", user_id, ip, ua)
    return {"success": True, "impersonationToken": token, "targetUser": target.to_dict()}


# ─────────────────────────────────────────────
#  BULK ORDER ACTION (Feature 18)
# ─────────────────────────────────────────────
@app.post("/api/orders/bulk-action", tags=["Orders"])
def bulk_order_action(
    schema: BulkOrderAction,
    request: Request,
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    """Feature 18: Bulk approve/reject/mark-paid/cancel multiple orders at once."""
    ip = request.client.host if request.client else "unknown"
    ua = request.headers.get("user-agent", "unknown")

    status_map = {
        'approve': 'approved', 'reject': 'cancelled',
        'mark_paid': 'paid', 'cancel': 'cancelled'
    }
    new_status = status_map.get(schema.action, schema.action)
    success_count = 0

    for oid in schema.order_ids:
        try:
            order_update = OrderUpdate(currentStatus=new_status, notes=schema.note)
            biz_logic.update_order(db, oid, order_update, current_user, ip, ua)
            success_count += 1
        except Exception as e:
            print(f"Bulk action error on {oid}: {e}")

    return {"success": True, "message": f"{success_count}/{len(schema.order_ids)} orders updated to {new_status}"}


# ─────────────────────────────────────────────
#  STATIC WEB SERVER HOSTING (FALLBACK SPA)
# ─────────────────────────────────────────────
STATIC_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static")
os.makedirs(STATIC_DIR, exist_ok=True)

@app.get("/", response_class=HTMLResponse, include_in_schema=False)
def serve_portal_spa():
    spa_path = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(spa_path):
        with open(spa_path, "r", encoding="utf-8") as f:
            return f.read()
    return "<h3>Portal API is running. Frontend is served by Next.js on port 3000 (or via nginx on port 80).</h3>"

@app.get("/portal", response_class=HTMLResponse, include_in_schema=False)
def serve_portal_spa_alias():
    return serve_portal_spa()

# Mount the static directory for assets
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

if __name__ == "__main__":
    uvicorn.run("src.core.controller:app", host="0.0.0.0", port=5000, reload=True)
