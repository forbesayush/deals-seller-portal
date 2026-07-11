"""
app.py — Flask Backend for deals.seller Portal
Run:  python app.py
API base: http://localhost:5000/api/
Static files are served from the same directory.
"""

import hashlib
import os
import secrets
from datetime import datetime, timezone

from flask import Flask, jsonify, request, send_from_directory, session
from flask_cors import CORS

from models import Order, Refund, User, db

# ─────────────────────────────────────────────
#  App Configuration
# ─────────────────────────────────────────────
BASE_DIR = os.path.abspath(os.path.dirname(__file__))

app = Flask(__name__, static_folder=BASE_DIR, static_url_path='')
app.secret_key = secrets.token_hex(32)
app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{os.path.join(BASE_DIR, "portal.db")}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'

CORS(app, supports_credentials=True, origins=['http://localhost:5000', 'http://127.0.0.1:5000'])

db.init_app(app)


# ─────────────────────────────────────────────
#  Utility
# ─────────────────────────────────────────────
def sha256(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()


def now_iso() -> str:
    return datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S')


# FIXED: next_id uses max id to avoid duplicates after deletions
def next_id(model, prefix: str) -> str:
    max_id = db.session.query(db.func.max(model.id)).scalar()
    if max_id is None:
        return f"{prefix}001"
    num = int(max_id[len(prefix):]) + 1
    return f"{prefix}{str(num).zfill(3)}"


# ─────────────────────────────────────────────
#  Database Seed (called once on startup)
# ─────────────────────────────────────────────
SEED_ADMINS = [
    {'id': 'ADM001', 'name': 'Admin — deals.seller',  'email': 'admin@deals.seller.com',  'mobile': None, 'password': 'admin@123', 'role': 'admin'},
    {'id': 'ADM002', 'name': 'Owner — deals.seller',  'email': 'owner@deals.seller.com',  'mobile': None, 'password': 'owner@123', 'role': 'admin'},
    {'id': 'ADM003', 'name': 'Ekta — Admin',          'email': 'ekta@deals.seller.com',   'mobile': None, 'password': 'ayushu08', 'role': 'admin'},
]

SEED_BUYERS = [
    {'id': 'USR001', 'name': 'Ayush Chatterjee', 'email': 'alwaysayushsourav162@gmail.com', 'mobile': '9123337436', 'password': 'user@123'},
    {'id': 'USR002', 'name': 'Shivam Raj',       'email': 'shivamraj@example.com',          'mobile': '9876543210', 'password': 'user@123'},
    {'id': 'USR003', 'name': 'Priya Sharma',     'email': 'priya@example.com',              'mobile': '9988776655', 'password': 'user@123'},
    {'id': 'USR004', 'name': 'Rahul Mehta',      'email': 'rahul@example.com',              'mobile': '9812345678', 'password': 'user@123', 'status': 'suspended'},
]

SEED_ORDERS = [
    {'id': 'ORD001', 'order_no': '402-0025862-2109921', 'product_code': 'ANT_COSMOS_3MODE_GAMING_CONTROLLER', 'platform': 'Amazon',   'user_id': 'USR002', 'mediator': 'Aman Pandey', 'deal_type': 'Image Review', 'order_date': '2026-06-26', 'submitted_date': '2026-06-26', 'amount': 1441.05, 'deduction': 300.00, 'final_payout': 1141.05, 'status': 'order_filled'},
    {'id': 'ORD002', 'order_no': '406-1422779-1212359', 'product_code': 'PNC_GREYSHOEWASHINGBAG_AZ',         'platform': 'Amazon',   'user_id': 'USR001', 'mediator': 'Aman Pandey', 'deal_type': 'Review',       'order_date': '2026-06-16', 'submitted_date': '2026-06-17', 'amount': 249.00,  'deduction': 20.00,  'final_payout': 229.00,   'status': 'order_filled'},
    {'id': 'ORD003', 'order_no': '402-0437892-3137934', 'product_code': 'PNC_BLACKHEADREMOVER_AZ',           'platform': 'Amazon',   'user_id': 'USR001', 'mediator': 'Aman Pandey', 'deal_type': 'Review',       'order_date': '2026-05-18', 'submitted_date': '2026-05-18', 'amount': 299.00,  'deduction': 23.00,  'final_payout': 276.00,   'status': 'paid',         'refund_status': 'cleared', 'paid_date': '2026-06-01'},
    {'id': 'ORD004', 'order_no': '402-5031051-7769965', 'product_code': 'PNC_BLACKHEADREMOVER_AZ',           'platform': 'Amazon',   'user_id': 'USR001', 'mediator': 'Aman Pandey', 'deal_type': 'Review',       'order_date': '2026-05-18', 'submitted_date': '2026-05-18', 'amount': 299.00,  'deduction': 23.00,  'final_payout': 276.00,   'status': 'cancelled',    'refund_status': 'not_eligible'},
    {'id': 'ORD005', 'order_no': '403-1863178-4809140', 'product_code': 'PNC_KAPOOREXCH_AZ',                'platform': 'Amazon',   'user_id': 'USR001', 'mediator': 'Aman Pandey', 'deal_type': 'Review',       'order_date': '2026-05-07', 'submitted_date': '2026-05-07', 'amount': 215.00,  'deduction': 18.00,  'final_payout': 197.00,   'status': 'paid',         'refund_status': 'cleared', 'paid_date': '2026-05-23'},
    {'id': 'ORD006', 'order_no': '408-1123456-9087654', 'product_code': 'PHI_USB_CABLE_AZ',                  'platform': 'Amazon',   'user_id': 'USR002', 'mediator': 'Aman Pandey', 'deal_type': 'Review',       'order_date': '2026-06-20', 'submitted_date': '2026-06-21', 'amount': 450.00,  'deduction': 35.00,  'final_payout': 415.00,   'status': 'under_review', 'refund_status': 'pending'},
    {'id': 'ORD007', 'order_no': 'FLK-9876543210',      'product_code': 'FLK_REDMI13C_128GB',               'platform': 'Flipkart', 'user_id': 'USR003', 'mediator': 'Aman Pandey', 'deal_type': 'Rating',       'order_date': '2026-06-25', 'submitted_date': '2026-06-25', 'amount': 8999.00, 'deduction': 200.00, 'final_payout': 8799.00,  'status': 'order_filled'},
    {'id': 'ORD008', 'order_no': 'BLK-1122334455',      'product_code': 'BLK_AMUL_BUTTER_500G',             'platform': 'Blinkit',  'user_id': 'USR003', 'mediator': 'Direct',       'deal_type': 'Review',       'order_date': '2026-07-01', 'submitted_date': '2026-07-01', 'amount': 290.00,  'deduction': 25.00,  'final_payout': 265.00,   'status': 'pending_review'},
]

SEED_REFUNDS = [
    {'id': 'REF001', 'order_id': 'ORD003', 'order_no': '402-0437892-3137934', 'user_id': 'USR001', 'user_name': 'Ayush Chatterjee', 'reason': 'Cashback not credited',    'amount': 276.00,   'upi': 'ayush@upi',  'status': 'resolved',      'submitted_at': '2026-05-20T10:30:00', 'reviewed_at': '2026-05-21T14:45:00', 'resolved_at': '2026-05-22T09:00:00'},
    {'id': 'REF002', 'order_id': 'ORD006', 'order_no': '408-1123456-9087654', 'user_id': 'USR002', 'user_name': 'Shivam Raj',       'reason': 'Wrong product delivered',  'amount': 415.00,   'upi': 'shivam@upi', 'status': 'pending',       'submitted_at': '2026-06-22T08:00:00'},
    {'id': 'REF003', 'order_id': 'ORD007', 'order_no': 'FLK-9876543210',      'user_id': 'USR003', 'user_name': 'Priya Sharma',     'reason': 'Order not delivered',      'amount': 8799.00,  'upi': 'priya@upi',  'status': 'under_review',  'submitted_at': '2026-06-27T16:20:00', 'reviewed_at': '2026-06-27T18:00:00'},
]


def seed_database():
    """Upsert seed data on every startup (idempotent)."""
    today = datetime.now().strftime('%Y-%m-%d')

    # ── Upsert admins ──
    for a in SEED_ADMINS:
        existing = User.query.get(a['id'])
        if existing:
            existing.password_hash = sha256(a['password'])
            existing.name   = a['name']
            existing.email  = a['email']
            existing.status = 'active'
        else:
            db.session.add(User(
                id=a['id'], name=a['name'], email=a['email'],
                mobile=a.get('mobile'), password_hash=sha256(a['password']),
                role=a['role'], status='active', joined=today, verified=True
            ))

    # ── Upsert buyers ──
    for b in SEED_BUYERS:
        existing = User.query.get(b['id'])
        if existing:
            existing.name   = b['name']
            existing.email  = b['email']
            existing.mobile = b.get('mobile')
            # Only reset password if it still matches the old default hash,
            # so manually changed passwords are not overwritten.
            if existing.password_hash == sha256('user@123'):
                existing.password_hash = sha256(b['password'])
        else:
            db.session.add(User(
                id=b['id'], name=b['name'], email=b['email'],
                mobile=b.get('mobile'), password_hash=sha256(b['password']),
                role='buyer', status=b.get('status', 'active'),
                joined=today, verified=b.get('verified', True)
            ))

    # ── Upsert orders (only insert if missing) ──
    for o in SEED_ORDERS:
        if not Order.query.get(o['id']):
            db.session.add(Order(
                id=o['id'], order_no=o['order_no'], product_code=o['product_code'],
                platform=o['platform'], user_id=o['user_id'], mediator=o['mediator'],
                deal_type=o['deal_type'], order_date=o['order_date'],
                submitted_date=o.get('submitted_date'), amount=o['amount'],
                deduction=o['deduction'], final_payout=o['final_payout'],
                status=o['status'], refund_status=o.get('refund_status'),
                paid_date=o.get('paid_date'), screenshot=o.get('screenshot', True)
            ))

    # ── Upsert refunds (only insert if missing) ──
    for r in SEED_REFUNDS:
        if not Refund.query.get(r['id']):
            db.session.add(Refund(
                id=r['id'], order_id=r.get('order_id'), order_no=r['order_no'],
                user_id=r['user_id'], user_name=r['user_name'], reason=r['reason'],
                amount=r['amount'], upi=r.get('upi'), status=r['status'],
                submitted_at=r['submitted_at'],
                reviewed_at=r.get('reviewed_at'), resolved_at=r.get('resolved_at')
            ))

    db.session.commit()
    print('[OK] Seed upsert complete.')


# ─────────────────────────────────────────────
#  AUTH HELPERS
# ─────────────────────────────────────────────
def current_user():
    uid = session.get('user_id')
    if not uid:
        return None
    return User.query.get(uid)


def require_login():
    u = current_user()
    if not u:
        return jsonify({'success': False, 'error': 'Not authenticated'}), 401
    return u


def require_admin():
    u = current_user()
    if not u:
        return jsonify({'success': False, 'error': 'Not authenticated'}), 401
    if u.role != 'admin':
        return jsonify({'success': False, 'error': 'Admin access required'}), 403
    return u


# ─────────────────────────────────────────────
#  STATIC FILE SERVING
#  Serve index.html and all static assets
# ─────────────────────────────────────────────
@app.route('/')
def index():
    return send_from_directory(BASE_DIR, 'index.html')


@app.route('/<path:path>')
def static_files(path):
    return send_from_directory(BASE_DIR, path)


# ═══════════════════════════════════════════════════════
#                   API ROUTES
# ═══════════════════════════════════════════════════════

# ─────────────────────────────────────────────
#  POST /api/login
# ─────────────────────────────────────────────
@app.route('/api/login', methods=['POST'])
def api_login():
    data = request.get_json(silent=True) or {}
    identifier = (data.get('identifier') or '').strip()
    password   = (data.get('password') or '').strip()

    if not identifier or not password:
        return jsonify({'success': False, 'error': 'Missing credentials'}), 400

    pw_hash = sha256(password)

    # Match by username (admin only), email, or mobile
    user = User.query.filter(
        (User.email == identifier) |
        (User.mobile == identifier) |
        (User.name == identifier)
    ).first()

    # Also allow matching admin by username field stored in name (clean lookup)
    # Try direct username match against known admin usernames
    admin_usernames = {'admin': 'ADM001', 'owner': 'ADM002', 'ekta': 'ADM003'}
    if not user and identifier in admin_usernames:
        user = User.query.get(admin_usernames[identifier])

    if not user or user.password_hash != pw_hash:
        return jsonify({'success': False, 'error': 'Invalid credentials. Please try again.'}), 401

    if user.status == 'suspended':
        return jsonify({'success': False, 'error': 'Your account has been suspended. Contact support.'}), 403

    session['user_id'] = user.id
    session.permanent = False

    return jsonify({
        'success': True,
        'role': user.role,
        'user': user.to_dict()
    })


# ─────────────────────────────────────────────
#  POST /api/logout
# ─────────────────────────────────────────────
@app.route('/api/logout', methods=['POST'])
def api_logout():
    session.clear()
    return jsonify({'success': True})


# ─────────────────────────────────────────────
#  GET /api/me
# ─────────────────────────────────────────────
@app.route('/api/me', methods=['GET'])
def api_me():
    user = current_user()
    if not user:
        return jsonify({'success': False, 'authenticated': False}), 401
    return jsonify({'success': True, 'authenticated': True, 'user': user.to_dict()})


# ─────────────────────────────────────────────
#  POST /api/register
# ─────────────────────────────────────────────
@app.route('/api/register', methods=['POST'])
def api_register():
    data = request.get_json(silent=True) or {}
    name     = (data.get('name') or '').strip()
    email    = (data.get('email') or '').strip().lower()
    mobile   = (data.get('mobile') or '').strip()
    password = (data.get('password') or '').strip()
    referral = (data.get('referral') or '').strip()

    if not name or not email or not password:
        return jsonify({'success': False, 'error': 'Name, email and password are required.'}), 400

    if User.query.filter((User.email == email) | (User.mobile == mobile)).first():
        return jsonify({'success': False, 'error': 'An account with this email/mobile already exists.'}), 409

    new_user = User(
        id=next_id(User, 'USR'),
        name=name, email=email, mobile=mobile or None,
        password_hash=sha256(password), role='buyer',
        status='active', joined=datetime.now().strftime('%Y-%m-%d'),
        verified=False, referral=referral
    )
    db.session.add(new_user)
    db.session.commit()

    session['user_id'] = new_user.id
    return jsonify({'success': True, 'user': new_user.to_dict()}), 201


# ─────────────────────────────────────────────
#  GET /api/orders                 — all orders (admin)
#  GET /api/orders?user_id=USR001  — buyer's orders
# ─────────────────────────────────────────────
@app.route('/api/orders', methods=['GET'])
def api_get_orders():
    user = current_user()
    if not user:
        return jsonify({'success': False, 'error': 'Not authenticated'}), 401

    user_id = request.args.get('user_id')

    if user.role == 'admin':
        if user_id:
            orders = Order.query.filter_by(user_id=user_id).all()
        else:
            orders = Order.query.all()
    else:
        # Buyers can only see their own orders
        orders = Order.query.filter_by(user_id=user.id).all()

    return jsonify({'success': True, 'orders': [o.to_dict() for o in orders]})


# ─────────────────────────────────────────────
#  POST /api/orders  — submit a new order
# ─────────────────────────────────────────────
@app.route('/api/orders', methods=['POST'])
def api_add_order():
    user = current_user()
    if not user:
        return jsonify({'success': False, 'error': 'Not authenticated'}), 401

    data = request.get_json(silent=True) or {}
    required = ['orderNo', 'productCode', 'platform', 'mediator', 'dealType', 'orderDate', 'amount']
    for f in required:
        if not data.get(f):
            return jsonify({'success': False, 'error': f'Missing field: {f}'}), 400

    amount    = float(data.get('amount', 0))
    deduction = float(data.get('deduction', 0))

    order = Order(
        id=next_id(Order, 'ORD'),
        order_no=data['orderNo'],
        product_code=data['productCode'],
        platform=data['platform'],
        user_id=user.id,
        mediator=data['mediator'],
        deal_type=data['dealType'],
        order_date=data['orderDate'],
        submitted_date=datetime.now().strftime('%Y-%m-%d'),
        amount=amount,
        deduction=deduction,
        final_payout=round(amount - deduction, 2),
        status='pending_review',
        screenshot=bool(data.get('screenshot', False))
    )
    db.session.add(order)
    db.session.commit()
    return jsonify({'success': True, 'order': order.to_dict()}), 201


# ─────────────────────────────────────────────
#  PATCH /api/orders/<id>  — update order status (admin only)
# ─────────────────────────────────────────────
@app.route('/api/orders/<order_id>', methods=['PATCH'])
def api_update_order(order_id):
    result = require_admin()
    if isinstance(result, tuple):
        return result

    order = Order.query.get(order_id)
    if not order:
        return jsonify({'success': False, 'error': 'Order not found'}), 404

    data = request.get_json(silent=True) or {}
    allowed = ['status', 'refund_status', 'paid_date', 'deduction', 'final_payout', 'mediator']
    for field in allowed:
        if field in data:
            setattr(order, field, data[field])

    db.session.commit()
    return jsonify({'success': True, 'order': order.to_dict()})


# ─────────────────────────────────────────────
#  GET /api/refunds                — all (admin) / own (buyer)
# ─────────────────────────────────────────────
@app.route('/api/refunds', methods=['GET'])
def api_get_refunds():
    user = current_user()
    if not user:
        return jsonify({'success': False, 'error': 'Not authenticated'}), 401

    if user.role == 'admin':
        refunds = Refund.query.all()
    else:
        refunds = Refund.query.filter_by(user_id=user.id).all()

    return jsonify({'success': True, 'refunds': [r.to_dict() for r in refunds]})


# ─────────────────────────────────────────────
#  POST /api/refunds  — submit a refund request
# ─────────────────────────────────────────────
@app.route('/api/refunds', methods=['POST'])
def api_add_refund():
    user = current_user()
    if not user:
        return jsonify({'success': False, 'error': 'Not authenticated'}), 401

    data = request.get_json(silent=True) or {}
    required = ['orderNo', 'reason']
    for f in required:
        if not data.get(f):
            return jsonify({'success': False, 'error': f'Missing field: {f}'}), 400

    refund = Refund(
        id=next_id(Refund, 'REF'),
        order_id=data.get('orderId'),
        order_no=data['orderNo'],
        user_id=user.id,
        user_name=user.name,
        reason=data['reason'],
        description=data.get('description', ''),
        upi=data.get('upi', ''),
        amount=float(data.get('amount', 0)),
        status='pending',
        submitted_at=now_iso()
    )
    db.session.add(refund)
    db.session.commit()
    return jsonify({'success': True, 'refund': refund.to_dict()}), 201


# ─────────────────────────────────────────────
#  PATCH /api/refunds/<id>  — update refund status (admin)
# ─────────────────────────────────────────────
@app.route('/api/refunds/<refund_id>', methods=['PATCH'])
def api_update_refund(refund_id):
    result = require_admin()
    if isinstance(result, tuple):
        return result

    refund = Refund.query.get(refund_id)
    if not refund:
        return jsonify({'success': False, 'error': 'Refund not found'}), 404

    data = request.get_json(silent=True) or {}
    if 'status' in data:
        refund.status = data['status']
        if data['status'] == 'under_review' and not refund.reviewed_at:
            refund.reviewed_at = now_iso()
        if data['status'] == 'resolved' and not refund.resolved_at:
            refund.resolved_at = now_iso()

    db.session.commit()
    return jsonify({'success': True, 'refund': refund.to_dict()})


# ─────────────────────────────────────────────
#  GET /api/users  — all buyers (admin only)
# ─────────────────────────────────────────────
@app.route('/api/users', methods=['GET'])
def api_get_users():
    result = require_admin()
    if isinstance(result, tuple):
        return result

    users = User.query.filter_by(role='buyer').all()
    return jsonify({'success': True, 'users': [u.to_dict() for u in users]})


# ─────────────────────────────────────────────
#  PATCH /api/users/<id>  — update user status (admin only)
# ─────────────────────────────────────────────
@app.route('/api/users/<user_id>', methods=['PATCH'])
def api_update_user(user_id):
    result = require_admin()
    if isinstance(result, tuple):
        return result

    user = User.query.get(user_id)
    if not user:
        return jsonify({'success': False, 'error': 'User not found'}), 404

    data = request.get_json(silent=True) or {}
    allowed = ['status', 'verified', 'name', 'mobile']
    for field in allowed:
        if field in data:
            setattr(user, field, data[field])

    db.session.commit()
    return jsonify({'success': True, 'user': user.to_dict()})


# ─────────────────────────────────────────────
#  GET /api/stats  — dashboard statistics (admin)
# ─────────────────────────────────────────────
@app.route('/api/stats', methods=['GET'])
def api_stats():
    result = require_admin()
    if isinstance(result, tuple):
        return result

    total_orders  = Order.query.count()
    total_buyers  = User.query.filter_by(role='buyer').count()
    total_refunds = Refund.query.count()
    pending_ref   = Refund.query.filter_by(status='pending').count()
    paid_orders   = Order.query.filter_by(status='paid').count()
    total_payout  = db.session.query(db.func.sum(Order.final_payout)).filter_by(status='paid').scalar() or 0

    return jsonify({
        'success': True,
        'stats': {
            'totalOrders':   total_orders,
            'totalBuyers':   total_buyers,
            'totalRefunds':  total_refunds,
            'pendingRefunds': pending_ref,
            'paidOrders':    paid_orders,
            'totalPayout':   round(total_payout, 2),
        }
    })


# ─────────────────────────────────────────────
#  MAIN
# ─────────────────────────────────────────────
if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        seed_database()
    print('[OK] deals.seller portal running at http://localhost:5000')
    app.run(debug=True, port=5000, host='0.0.0.0')
