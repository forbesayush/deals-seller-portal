/**
 * Deal Portal — Shared JavaScript
 * Handles: Alia Chatbot, Form Interactions, Portal Auth, Mediator Tabs
 */

// ─────────────────────────────────────────────
//  ALIA CHATBOT
// ─────────────────────────────────────────────
let chatState = 'greeting';
let hasGreeted = false;

function toggleChat() {
  const win = document.getElementById('alia-chatbot-window');
  if (!win) return;
  if (win.classList.contains('active')) {
    win.classList.remove('active');
    document.body.style.overflow = 'auto';
  } else {
    win.classList.add('active');
    document.body.style.overflow = 'hidden';
    initChatbot();
    scrollToBottom();
  }
}

function initChatbot() {
  if (hasGreeted) return;
  addBotMsg("Welcome! I'm Alia, your support assistant. How can I help you today?");
  setTimeout(() => {
    const b = document.getElementById('chat-body');
    const d = document.createElement('div');
    d.className = 'quick-replies';
    d.id = 'quick-replies-container';
    d.innerHTML = `
      <button class="quick-reply-btn" onclick="quickReply('Track order', 'track_order')">📦 Track order</button>
      <button class="quick-reply-btn" onclick="quickReply('Cancel order', 'cancel_order')">❌ Cancel order</button>
      <button class="quick-reply-btn" onclick="quickReply('More help', 'more_help')">💬 More help</button>
    `;
    b.appendChild(d);
    scrollToBottom();
    hasGreeted = true;
  }, 1200);
}

function quickReply(text, actionType) {
  const cont = document.getElementById('quick-replies-container');
  if (cont) cont.remove();
  addUserMsg(text);

  if (actionType === 'track_order') {
    chatState = 'ask_track_order_id';
    addBotMsg("Please enter your Order ID to track:");
  } else if (actionType === 'cancel_order') {
    chatState = 'greeting';
    addBotMsg("Please <a href='portal.html' style='color:#ec4899;font-weight:bold;text-decoration:underline;'>login here</a> to your dashboard to cancel your order.");
  } else if (actionType === 'more_help') {
    chatState = 'more_help_opts';
    setTimeout(() => {
      const b = document.getElementById('chat-body');
      const d = document.createElement('div');
      d.className = 'quick-replies';
      d.id = 'quick-replies-container';
      d.innerHTML = `
        <button class="quick-reply-btn" onclick="quickReply('Cancel my order', 'cancel_order')">Do you want to cancel your order?</button>
        <button class="quick-reply-btn" onclick="quickReply('Modify order details', 'mod_order')">Order details modification?</button>
      `;
      b.appendChild(d);
      scrollToBottom();
    }, 1000);
  } else if (actionType === 'mod_order') {
    chatState = 'mod_order_id';
    addBotMsg("Please enter the Order ID you wish to modify:");
  }
}

function scrollToBottom() {
  const b = document.getElementById('chat-body');
  if (b) b.scrollTop = b.scrollHeight;
}

function showTyping() {
  const b = document.getElementById('chat-body');
  if (!b) return;
  const typ = document.createElement('div');
  typ.className = 'typing-indicator';
  typ.id = 'typing-indicator';
  typ.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';
  b.appendChild(typ);
  scrollToBottom();
}

function hideTyping() {
  const typ = document.getElementById('typing-indicator');
  if (typ) typ.remove();
}

function addBotMsg(html) {
  showTyping();
  setTimeout(() => {
    hideTyping();
    const d = document.createElement('div');
    d.className = 'chat-msg msg-bot';
    d.innerHTML = html;
    document.getElementById('chat-body').appendChild(d);
    scrollToBottom();
  }, 1000);
}

function addUserMsg(text) {
  const cont = document.getElementById('quick-replies-container');
  if (cont) cont.remove();
  const d = document.createElement('div');
  d.className = 'chat-msg msg-user';
  d.innerText = text;
  document.getElementById('chat-body').appendChild(d);
  scrollToBottom();
}

function sendUserMsg() {
  const inp = document.getElementById('chat-msg-input');
  const text = inp.value.trim();
  if (!text) return;
  inp.value = '';
  addUserMsg(text);
  processLogic(text);
}

function processLogic(text) {
  const lc = text.toLowerCase();
  if (chatState === 'ask_track_order_id') {
    chatState = 'greeting';
    addBotMsg(`Searching for Order <strong>#${text}</strong>... This is a demo — please <a href='track_order.html' style='color:#ec4899;font-weight:bold;text-decoration:underline;'>use the Track Order page</a> for real-time tracking.`);
  } else if (chatState === 'mod_order_id') {
    chatState = 'mod_issue';
    addBotMsg("What is the exact modification you need?");
  } else if (chatState === 'mod_issue') {
    chatState = 'greeting';
    addBotMsg("✅ Got it! Our team will review your request within 24 hours. You can check updates in your dashboard.");
  } else if (lc.includes('hello') || lc.includes('hi')) {
    addBotMsg("Hi there! 👋 How can I help you today?");
  } else if (lc.includes('track') || lc.includes('order')) {
    chatState = 'ask_track_order_id';
    addBotMsg("Please enter your Order ID to track:");
  } else if (lc.includes('refund') || lc.includes('cancel')) {
    addBotMsg("For refunds, please fill our <a href='refundform.html' style='color:#ec4899;font-weight:bold;text-decoration:underline;'>Refund Form</a>.");
  } else {
    addBotMsg("I'm not sure about that. Try asking about order tracking, refunds, or cancellations! 😊");
  }
}

function restartChat() {
  chatState = 'greeting';
  hasGreeted = false;
  const body = document.getElementById('chat-body');
  if (body) body.innerHTML = '';
  initChatbot();
}

// ─────────────────────────────────────────────
//  ORDER FORM — Dynamic Fields
// ─────────────────────────────────────────────
const productCatalog = [
  { code: 'AMZ001', name: 'boAt Rockerz 255 Pro+ Wireless Earphones', platform: 'Amazon', price: 1299, cashback: 300, type: 'Cashback' },
  { code: 'AMZ002', name: 'Noise ColorFit Pro 4 Smartwatch', platform: 'Amazon', price: 2499, cashback: 500, type: 'Cashback' },
  { code: 'FLK001', name: 'Redmi 13C 4G Smartphone (128GB)', platform: 'Flipkart', price: 8999, cashback: 800, type: 'Cashback' },
  { code: 'FLK002', name: 'Mi 43" 4K Ultra HD Android TV', platform: 'Flipkart', price: 24999, cashback: 2000, type: 'Cashback' },
  { code: 'BLK001', name: 'Amul Butter (500g)', platform: 'Blinkit', price: 290, cashback: 60, type: 'Cashback' },
  { code: 'AMZ003', name: 'HP 15 Laptop Intel Core i5 (8GB/512GB)', platform: 'Amazon', price: 49999, cashback: 3500, type: 'Cashback' },
  { code: 'FLK003', name: 'Puma Men\'s Running Shoes', platform: 'Flipkart', price: 2999, cashback: 400, type: 'Cashback' },
];

function initOrderForm() {
  const productSelect = document.getElementById('product-code');
  const dynamicFields = document.getElementById('dynamic-fields');
  if (!productSelect) return;

  productSelect.addEventListener('change', function() {
    const code = this.value;
    const product = productCatalog.find(p => p.code === code);
    if (product) {
      dynamicFields.classList.remove('hidden');
      const info = document.getElementById('product-info');
      if (info) {
        info.innerHTML = `
          <div style="background:#f5f3ff;border-radius:12px;padding:14px;margin-bottom:16px;border:1.5px solid #e9d5ff;">
            <div style="font-weight:700;color:#5c6bc0;font-size:0.9rem;">Selected Product</div>
            <div style="font-size:0.88rem;color:#374151;margin-top:4px;">${product.name}</div>
            <div style="display:flex;gap:12px;margin-top:8px;font-size:0.82rem;">
              <span style="background:#dbeafe;color:#1d4ed8;padding:3px 10px;border-radius:99px;font-weight:700;">${product.platform}</span>
              <span style="background:#dcfce7;color:#15803d;padding:3px 10px;border-radius:99px;font-weight:700;">₹${product.price.toLocaleString()}</span>
            </div>
          </div>
        `;
      }
    } else {
      dynamicFields.classList.add('hidden');
    }
  });

  // Mediator field
  const dealType = document.querySelectorAll('input[name="deal-type"]');
  dealType.forEach(r => r.addEventListener('change', function() {
    const mediatorGroup = document.getElementById('mediator-group');
    if (mediatorGroup) {
      mediatorGroup.style.display = this.value === 'Mediator' ? 'block' : 'none';
    }
  }));
}

// ─────────────────────────────────────────────
//  PORTAL AUTH — Toggle Login/Register
// ─────────────────────────────────────────────
function initPortal() {
  const loginView = document.getElementById('login-view');
  const registerView = document.getElementById('register-view');
  const loginBtn = document.getElementById('show-login');
  const registerBtn = document.getElementById('show-register');
  if (!loginView) return;

  function showLogin() {
    loginView.classList.remove('hidden');
    registerView.classList.add('hidden');
    loginBtn.classList.add('active');
    registerBtn.classList.remove('active');
  }
  function showRegister() {
    registerView.classList.remove('hidden');
    loginView.classList.add('hidden');
    registerBtn.classList.add('active');
    loginBtn.classList.remove('active');
  }
  loginBtn.addEventListener('click', showLogin);
  registerBtn.addEventListener('click', showRegister);
}

// ─────────────────────────────────────────────
//  MEDIATOR TABS
// ─────────────────────────────────────────────
function initMediatorTabs() {
  const tabs = document.querySelectorAll('[data-tab]');
  tabs.forEach(tab => {
    tab.addEventListener('click', function() {
      const target = this.dataset.tab;
      tabs.forEach(t => t.classList.remove('active'));
      this.classList.add('active');
      document.querySelectorAll('[data-tab-content]').forEach(c => {
        c.classList.toggle('hidden', c.dataset.tabContent !== target);
      });
    });
  });
}

// ─────────────────────────────────────────────
//  PASSKEY STUB
// ─────────────────────────────────────────────
function startPasskeyLogin() {
  const statusEl = document.getElementById('passkey-status');
  const iconEl = document.getElementById('passkey-icon');
  if (statusEl) statusEl.classList.remove('hidden');
  if (iconEl) iconEl.classList.add('hidden');

  setTimeout(() => {
    if (statusEl) statusEl.classList.add('hidden');
    if (iconEl) iconEl.classList.remove('hidden');
    window.location.href = 'portal.html';
  }, 2000);
}

// ─────────────────────────────────────────────
//  TRACK ORDER
// ─────────────────────────────────────────────
function trackOrder() {
  const input = document.getElementById('order-id-input');
  const resultArea = document.getElementById('track-result');
  if (!input || !resultArea) return;
  const orderId = input.value.trim();
  if (!orderId) {
    resultArea.innerHTML = '<div class="info-box" style="background:#fef2f2;border-color:#fecaca;color:#991b1b;">⚠️ Please enter an Order ID.</div>';
    return;
  }
  resultArea.innerHTML = `
    <div style="background:white;border-radius:16px;box-shadow:0 4px 20px rgba(0,0,0,0.07);padding:20px;animation:fadeInMsg 0.4s ease;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
        <div style="width:40px;height:40px;background:#dcfce7;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.2rem;">📦</div>
        <div>
          <div style="font-weight:700;color:#1f2937;">Order #${orderId}</div>
          <div style="font-size:0.82rem;color:#6b7280;">Demo Mode</div>
        </div>
      </div>
      <div class="status-online" style="margin-bottom:12px;"><span class="status-dot"></span> Order Placed</div>
      <div style="font-size:0.88rem;color:#6b7280;font-weight:600;">This is a demo. Real order tracking requires an active backend.</div>
    </div>
  `;
}

// ─────────────────────────────────────────────
//  INIT ON LOAD
// ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initOrderForm();
  initPortal();
  initMediatorTabs();

  // Chat enter key
  const chatInput = document.getElementById('chat-msg-input');
  if (chatInput) {
    chatInput.addEventListener('keypress', e => {
      if (e.key === 'Enter') sendUserMsg();
    });
  }
});
