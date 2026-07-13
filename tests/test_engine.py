import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from src.database.db import Base
from src.models.models import User, Order, Refund, Wallet, Transaction, AuditLog
from src.schemas.schemas import UserRegister, OrderCreate, RefundCreate, RefundUpdate, OrderUpdate, DealCreate, DealUpdate
from src.core import engine as biz_logic
from src.middleware.auth import verify_password

# ─────────────────────────────────────────────
#  FIXTURES
# ─────────────────────────────────────────────
@pytest.fixture(name="db_session")
def fixture_db_session():
    """Create in-memory SQLite database for test isolation."""
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()

# ─────────────────────────────────────────────
#  TEST CASES
# ─────────────────────────────────────────────
def test_calculate_fees_catalog():
    """Verify catalog calculations retrieve correct cashback and platforms."""
    # AMZ001: boAt Rockerz earphones, price 1299, cashback 300
    calc = biz_logic.calculate_fees("AMZ001", 1299.0, 1, 0.0)
    assert calc["productName"] == "boAt Rockerz 255 Pro+ Wireless Earphones"
    assert calc["platform"] == "Amazon"
    assert calc["cashbackAmount"] == 300.0
    assert calc["processingFee"] == 64.95  # 5% of 1299
    assert calc["deductionAmount"] == 64.95
    assert calc["netAmount"] == 235.05  # 300 - 64.95

def test_calculate_fees_custom():
    """Verify fallback custom product calculations work."""
    calc = biz_logic.calculate_fees("XYZ999", 1000.0, 1, 20.0)
    assert "Custom Product" in calc["productName"]
    assert calc["platform"] == "Custom Platform"
    assert calc["cashbackAmount"] == 100.0  # 10% default
    assert calc["processingFee"] == 50.0  # 5% of 1000
    assert calc["deductionAmount"] == 20.0  # override deduction
    assert calc["netAmount"] == 80.0  # 100 - 20

def test_register_user_creates_wallet(db_session):
    """Verify that registering a user automatically initializes their wallet."""
    schema = UserRegister(
        name="Test Buyer",
        email="testbuyer@example.com",
        mobile="9876543210",
        password="password123",
        referral=""
    )
    user = biz_logic.register_user(db_session, schema, "127.0.0.1", "pytest")
    assert user.id.startswith("USR")
    assert user.name == "Test Buyer"
    assert verify_password("password123", user.password_hash)

    # Check that wallet was initialized
    wallet = db_session.query(Wallet).filter(Wallet.user_id == user.id).first()
    assert wallet is not None
    assert wallet.pending_cashback == 0.0
    assert wallet.withdrawable_cashback == 0.0

def test_create_order_updates_wallet_pending(db_session):
    """Verify that creating an order increments the wallet's pending cashback and logs a transaction."""
    # Register buyer
    buyer_schema = UserRegister(name="Ayush", email="ayush@example.com", mobile="9123337436", password="password123")
    buyer = biz_logic.register_user(db_session, buyer_schema, "127.0.0.1", "pytest")

    # Create order (AMZ001, netAmount is 235.05)
    order_schema = OrderCreate(
        orderNo="402-99999-9999",
        productCode="AMZ001",
        platform="Amazon",
        mediator="Direct",
        dealType="Review",
        orderDate="2026-07-12",
        amount=1299.0,
        deduction=0.0
    )
    order = biz_logic.create_order(db_session, order_schema, buyer, buyer, "127.0.0.1", "pytest")
    assert order.id.startswith("ORD")
    assert order.net_amount == 235.05

    # Check buyer wallet pending balance
    wallet = db_session.query(Wallet).filter(Wallet.user_id == buyer.id).first()
    assert wallet.pending_cashback == 235.05

    # Check transactions logs
    txs = db_session.query(Transaction).filter(Transaction.wallet_id == wallet.id).all()
    assert len(txs) == 1
    assert txs[0].category == "cashback_pending"
    assert txs[0].amount == 235.05
    assert txs[0].status == "pending"

def test_order_payout_transitions_wallet(db_session):
    """Verify updating order status to paid shifts pending cashback to approved/withdrawable."""
    # Setup buyer & order
    buyer_schema = UserRegister(name="Ayush", email="ayush@example.com", mobile="9123337436", password="password123")
    buyer = biz_logic.register_user(db_session, buyer_schema, "127.0.0.1", "pytest")
    
    order_schema = OrderCreate(
        orderNo="402-11111-2222", productCode="AMZ001", platform="Amazon",
        mediator="Direct", dealType="Review", orderDate="2026-07-12",
        amount=1299.0, deduction=0.0
    )
    order = biz_logic.create_order(db_session, order_schema, buyer, buyer, "127.0.0.1", "pytest")
    
    # Update status to paid (simulating admin action)
    update_schema = OrderUpdate(currentStatus="paid")
    updated_order = biz_logic.update_order(db_session, order.id, update_schema, buyer, "127.0.0.1", "pytest")
    assert updated_order.current_status == "paid"

    wallet = db_session.query(Wallet).filter(Wallet.user_id == buyer.id).first()
    assert wallet.pending_cashback == 0.0
    assert wallet.withdrawable_cashback == 235.05

    # Verify approved transaction is registered
    txs = db_session.query(Transaction).filter(Transaction.wallet_id == wallet.id).order_by(Transaction.id.desc()).all()
    assert len(txs) == 2  # pending + approved
    assert txs[0].category == "cashback_approved"
    assert txs[0].amount == 235.05
    assert txs[0].status == "completed"

def test_create_refund_and_approve(db_session):
    """Verify that submitting a refund updates order status, and resolving it credits the refund wallet."""
    buyer_schema = UserRegister(name="Ayush", email="ayush@example.com", mobile="9123337436", password="password123")
    buyer = biz_logic.register_user(db_session, buyer_schema, "127.0.0.1", "pytest")
    
    order_schema = OrderCreate(
        orderNo="402-11111-3333", productCode="AMZ001", platform="Amazon",
        mediator="Direct", dealType="Review", orderDate="2026-07-12",
        amount=1299.0, deduction=0.0
    )
    order = biz_logic.create_order(db_session, order_schema, buyer, buyer, "127.0.0.1", "pytest")
    
    # Create refund request
    refund_schema = RefundCreate(orderNo="402-11111-3333", reason="Damaged item received", amount=1299.0, upi="ayush@upi")
    refund = biz_logic.create_refund(db_session, refund_schema, buyer, "127.0.0.1", "pytest")
    
    assert refund.status == "pending"
    assert order.refund_status == "pending"
    assert order.current_status == "under_review"

    # Approve refund
    update_ref_schema = RefundUpdate(status="resolved")
    resolved_refund = biz_logic.review_refund(db_session, refund.id, update_ref_schema, buyer, "127.0.0.1", "pytest")
    assert resolved_refund.status == "resolved"

    wallet = db_session.query(Wallet).filter(Wallet.user_id == buyer.id).first()
    assert wallet.refund_balance == 1299.0
    assert order.refund_status == "cleared"
    assert order.current_status == "cancelled"  # Order should cancel after refund resolved


def test_live_deals_crud_and_order_fees(db_session):
    """Verify that adding, updating, and querying deals affects catalog order logic dynamically."""
    # 1. Setup admin and buyer
    admin_schema = UserRegister(name="Admin User", email="admin@test.com", mobile="1234567890", password="adminpassword")
    admin = biz_logic.register_user(db_session, admin_schema, "127.0.0.1", "pytest")
    admin.role = "admin"  # Make him admin
    
    buyer_schema = UserRegister(name="Buyer User", email="buyer@test.com", mobile="0987654321", password="buyerpassword")
    buyer = biz_logic.register_user(db_session, buyer_schema, "127.0.0.1", "pytest")

    # 2. Create dynamic deal
    deal_schema = DealCreate(
        productCode="TST001",
        productName="Super Test Widget",
        platform="Flipkart",
        price=1000.0,
        cashback=200.0,
        slots=3,
        active=True
    )
    deal = biz_logic.create_deal(db_session, deal_schema, admin, "127.0.0.1", "pytest")
    assert deal.id.startswith("DEA")
    assert deal.product_code == "TST001"
    assert deal.slots == 3

    # 3. Query active deals
    active_deals = biz_logic.get_active_deals(db_session)
    assert len(active_deals) == 1
    assert active_deals[0].product_name == "Super Test Widget"

    # 4. Submit order utilizing dynamic deal
    order_schema = OrderCreate(
        orderNo="402-TEST-DEAL-111",
        productCode="TST001",
        platform="Flipkart",
        mediator="Direct",
        dealType="Review",
        orderDate="2026-07-13",
        amount=1000.0,
        deduction=0.0
    )
    order = biz_logic.create_order(db_session, order_schema, buyer, buyer, "127.0.0.1", "pytest")
    assert order.product_name == "Super Test Widget"
    assert order.product_price == 1000.0
    assert order.cashback_amount == 200.0
    assert order.net_amount == 150.0  # 200 - (1000 * 0.05 processing fee)

    # 5. Update deal to inactive
    update_schema = DealUpdate(active=False)
    updated_deal = biz_logic.update_deal(db_session, deal.id, update_schema, admin, "127.0.0.1", "pytest")
    assert updated_deal.active is False

    active_deals_after = biz_logic.get_active_deals(db_session)
    assert len(active_deals_after) == 0

    # 6. Delete deal
    deleted = biz_logic.delete_deal(db_session, deal.id, admin, "127.0.0.1", "pytest")
    assert deleted is True


def test_password_strength_and_login_audit(db_session):
    """Verify password strength validation on registration and login success logs."""
    from src.core.controller import register, login
    from src.schemas.schemas import UserRegister, UserLogin
    from fastapi import HTTPException

    class MockRequest:
        client = type('Client', (object,), {'host': '127.0.0.1'})()
        headers = {'user-agent': 'pytest'}

    class MockResponse:
        def set_cookie(self, *args, **kwargs):
            pass

    # 1. Weak password (too short)
    weak_schema = UserRegister(
        name="Weak User",
        email="weak@example.com",
        mobile="1111111111",
        password="short12",
        referral=""
    )
    with pytest.raises(HTTPException) as excinfo:
        register(weak_schema, response=MockResponse(), request=MockRequest(), db=db_session)
    assert excinfo.value.status_code == 400
    assert "at least 8 characters" in excinfo.value.detail

    # 2. Weak password (no digits)
    nodigits_schema = UserRegister(
        name="No Digits User",
        email="nodigits@example.com",
        mobile="2222222222",
        password="shortpassword",
        referral=""
    )
    with pytest.raises(HTTPException) as excinfo:
        register(nodigits_schema, response=MockResponse(), request=MockRequest(), db=db_session)
    assert excinfo.value.status_code == 400

    # 3. Strong password
    strong_schema = UserRegister(
        name="Strong User",
        email="strong@example.com",
        mobile="3333333333",
        password="StrongPassword123",
        referral=""
    )

    reg_res = register(strong_schema, response=MockResponse(), request=MockRequest(), db=db_session)
    assert reg_res["success"] is True

    # 4. Test login success auditing
    login_schema = UserLogin(identifier="strong@example.com", password="StrongPassword123")
    login_res = login(login_schema, response=MockResponse(), request=MockRequest(), db=db_session)
    assert login_res["success"] is True
    
    # Verify audit log recorded
    from src.models.models import AuditLog
    success_log = db_session.query(AuditLog).filter(AuditLog.action == "Login Success").first()
    assert success_log is not None
    assert success_log.user_email == "strong@example.com"


def test_update_order_deduction_adjusts_wallet(db_session):
    """Verify that updating the deduction updates the order net amount and dynamically adjusts the buyer's wallet pending balance."""
    # 1. Setup admin and buyer
    admin_schema = UserRegister(name="Admin User", email="admin2@test.com", mobile="1234567892", password="adminpassword1")
    admin = biz_logic.register_user(db_session, admin_schema, "127.0.0.1", "pytest")
    admin.role = "admin"
    
    buyer_schema = UserRegister(name="Buyer User", email="buyer2@test.com", mobile="0987654322", password="buyerpassword1")
    buyer = biz_logic.register_user(db_session, buyer_schema, "127.0.0.1", "pytest")

    from src.models.models import Wallet

    # 2. Create order
    order_schema = OrderCreate(
        orderNo="402-DED-TEST",
        productCode="AMZ001",
        platform="Amazon",
        mediator="Direct",
        dealType="Review",
        orderDate="2026-07-13",
        amount=1299.0,
        deduction=0.0
    )
    order = biz_logic.create_order(db_session, order_schema, buyer, buyer, "127.0.0.1", "pytest")
    
    # Verify initial wallet pending cashback matches net payout
    wallet = db_session.query(Wallet).filter(Wallet.user_id == buyer.id).first()
    initial_net = order.net_amount
    assert wallet.pending_cashback == initial_net

    # 3. Update order deduction to ₹100.0 (net payout should decrease, pending wallet should decrease)
    update_schema = OrderUpdate(deduction=100.0)
    updated_order = biz_logic.update_order(db_session, order.id, update_schema, admin, "127.0.0.1", "pytest")
    
    expected_net = round(order.cashback_amount - 100.0, 2)
    assert updated_order.net_amount == expected_net
    assert wallet.pending_cashback == expected_net


def test_referral_rewards(db_session):
    """Verify that registering with a valid referral code credits the referrer with ₹50 withdrawable cashback."""
    # 1. Register Referrer User
    referrer_schema = UserRegister(name="Referrer A", email="referrer_a@test.com", mobile="1112223334", password="password1")
    referrer = biz_logic.register_user(db_session, referrer_schema, "127.0.0.1", "pytest")
    
    assert referrer.referral != ""
    
    # 2. Register Referred User
    referred_schema = UserRegister(name="Referred B", email="referred_b@test.com", mobile="4445556667", password="password1", referral=referrer.referral)
    referred = biz_logic.register_user(db_session, referred_schema, "127.0.0.1", "pytest")
    
    assert referred.referrer_id == referrer.id
    
    # 3. Verify Referrer wallet got credited with ₹50.0
    from src.models.models import Wallet, Transaction
    ref_wallet = db_session.query(Wallet).filter(Wallet.user_id == referrer.id).first()
    assert ref_wallet.withdrawable_cashback == 50.0
    
    # Verify transaction logs
    tx = db_session.query(Transaction).filter(Transaction.wallet_id == ref_wallet.id).first()
    assert tx is not None
    assert tx.amount == 50.0
    assert tx.category == 'referral_bonus'
    assert tx.status == 'completed'


def test_wallet_withdrawals(db_session):
    """Verify that users can submit payouts, and admins can approve (clear) or reject (revert funds)."""
    # 1. Setup users
    admin_schema = UserRegister(name="Admin X", email="admin_x@test.com", mobile="9998887776", password="password1")
    admin = biz_logic.register_user(db_session, admin_schema, "127.0.0.1", "pytest")
    admin.role = "admin"
    
    buyer_schema = UserRegister(name="Buyer Y", email="buyer_y@test.com", mobile="5556667778", password="password1")
    buyer = biz_logic.register_user(db_session, buyer_schema, "127.0.0.1", "pytest")
    
    from src.models.models import Wallet, Transaction, Withdrawal
    from src.schemas.schemas import WithdrawalCreate, WithdrawalUpdate
    
    # Pre-credit buyer wallet withdrawable balance with ₹200.0
    wallet = db_session.query(Wallet).filter(Wallet.user_id == buyer.id).first()
    wallet.withdrawable_cashback = 200.0
    db_session.commit()
    
    # 2. Request withdrawal of ₹150.0
    w_create = WithdrawalCreate(upi="buyer@upi", amount=150.0)
    wth = biz_logic.create_withdrawal(db_session, w_create, buyer, "127.0.0.1", "pytest")
    
    # Verify deduction occurred
    assert wallet.withdrawable_cashback == 50.0
    assert wth.status == 'pending'
    
    # Verify transaction logs
    tx_pending = db_session.query(Transaction).filter(
        Transaction.wallet_id == wallet.id,
        Transaction.category == 'withdrawal_pending',
        Transaction.status == 'pending'
    ).first()
    assert tx_pending is not None
    assert tx_pending.amount == 150.0
    
    # 3. Approve Payout
    w_update = WithdrawalUpdate(status="approved")
    approved_wth = biz_logic.review_withdrawal(db_session, wth.id, w_update, admin, "127.0.0.1", "pytest")
    
    assert approved_wth.status == 'approved'
    assert tx_pending.status == 'completed'
    assert tx_pending.category == 'withdrawal_cleared'
    
    # 4. Request another withdrawal of ₹50.0, reject it to revert funds
    w_create_2 = WithdrawalCreate(upi="buyer@upi", amount=50.0)
    wth_2 = biz_logic.create_withdrawal(db_session, w_create_2, buyer, "127.0.0.1", "pytest")
    
    assert wallet.withdrawable_cashback == 0.0
    
    w_update_2 = WithdrawalUpdate(status="rejected")
    rejected_wth = biz_logic.review_withdrawal(db_session, wth_2.id, w_update_2, admin, "127.0.0.1", "pytest")
    
    assert rejected_wth.status == 'rejected'
    # Verify balance reverted back to ₹50.0
    assert wallet.withdrawable_cashback == 50.0





