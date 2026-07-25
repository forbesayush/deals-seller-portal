// ─────────────────────────────────────────────────────────────
//  deals.seller — Standalone Client-Side Mock API Router
//  Intercepts all window.fetch('/api/*') calls and acts as a 
//  browser-based backend using localStorage for 100% database persistence.
// ─────────────────────────────────────────────────────────────

if (typeof window !== 'undefined') {
  // Mock Database Setup & Helpers
  const getStorage = (key: string, defaultVal: any) => {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultVal;
  };

  const setStorage = (key: string, data: any) => {
    localStorage.setItem(key, JSON.stringify(data));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ds_storage_update', { detail: { key } }));
    }
  };

  const seedDatabase = () => {
    if (localStorage.getItem('ds_seeded_v10')) {
      return;
    }
    // Clean old storage versions to force a fresh clean seed without sample data
    localStorage.removeItem('ds_seeded');
    localStorage.removeItem('ds_seeded_v2');
    localStorage.removeItem('ds_seeded_v3');
    localStorage.removeItem('ds_seeded_v4');
    localStorage.removeItem('ds_seeded_v5');
    localStorage.removeItem('ds_seeded_v6');
    localStorage.removeItem('ds_seeded_v7');
    localStorage.removeItem('ds_seeded_v8');
    localStorage.removeItem('ds_seeded_v9');
    localStorage.removeItem('ds_users'); // Reset user credentials to ensure latest default passwords match

    // Force purge cached sample deals and order history from browser localStorage
    localStorage.removeItem('ds_deals');
    localStorage.removeItem('ds_orders');
    localStorage.removeItem('ds_refunds');
    localStorage.removeItem('ds_transactions');
    localStorage.removeItem('ds_withdrawals');
    localStorage.removeItem('ds_tickets');
    localStorage.removeItem('ds_user_activity');
    localStorage.removeItem('ds_claims');

    const today = new Date().toISOString().split('T')[0];

    // Seed Core System Accounts (Live Users populate dynamically via registration)
    const users = [
      { id: 'ADM001', name: 'Admin — deals.seller', email: 'admin@deals.seller.com', mobile: null, password: 'admin@123', role: 'admin', status: 'active', joined: today, verified: true, referral: 'ADMIN1' },
      { id: 'ADM002', name: 'Owner — deals.seller', email: 'owner@deals.seller.com', mobile: null, password: 'owner@123', role: 'admin', status: 'active', joined: today, verified: true, referral: 'ADMIN2' },
      { id: 'ADM003', name: 'Ekta — Admin', email: 'ekta@deals.seller.com', mobile: null, password: 'ayushu08', role: 'admin', status: 'active', joined: today, verified: true, referral: 'EKTA08' },
      { id: 'USR001', name: 'Ayush Chatterjee', email: 'alwaysayushsourav162@gmail.com', mobile: '9123337436', password: 'ekta@123', role: 'buyer', status: 'active', joined: today, verified: true, referral: 'AYUSH123' },
    ];
    setStorage('ds_users', users);

    // Initial Deals: Clean 0 deals (Deals only appear when Admin creates live deals)
    setStorage('ds_deals', []);

    // Seed Wallets (Clean 0 balance)
    const wallets = [
      { id: 'WLT001', userId: 'USR001', pendingCashback: 0.0, approvedCashback: 0.0, lockedCashback: 0.0, withdrawableCashback: 0.0, refundBalance: 0.0, lastUpdated: new Date().toISOString() },
    ];
    setStorage('ds_wallets', wallets);

    // Empty Orders (Clean State)
    setStorage('ds_orders', []);

    // Empty Refunds (Clean State)
    setStorage('ds_refunds', []);

    // Seed Announcements
    const announcements = [
      { id: 'ANN001', title: 'Welcome to the New Deal Portal!', body: 'Check out high-yield cashback deals on Amazon, Flipkart, Myntra & Nykaa.', type: 'info', active: true, pinned: true, createdAt: '2026-07-01T00:00:00Z' },
      { id: 'ANN002', title: 'Withdrawal Processing Time Cut to Instant UPI!', body: 'We have updated our mediator processing, and all UPI withdrawals are now instant.', type: 'success', active: true, pinned: false, createdAt: '2026-07-10T12:00:00Z' },
      { id: 'ANN003', title: '🔥 Flash Sale: 10% Extra Cashback on Apple & Samsung!', body: 'Limited deal slots unlocked for Galaxy S24 Ultra & AirPods Pro 2.', type: 'warning', active: true, pinned: true, createdAt: '2026-07-20T09:00:00Z' },
    ];
    setStorage('ds_announcements', announcements);

    // Empty Support Tickets
    setStorage('ds_tickets', []);

    // Empty Withdrawals
    setStorage('ds_withdrawals', []);

    // Seed Settings & Flags
    const settings = {
      registration_enabled: true,
      portal_active: true,
      auto_approve_orders: false,
      ollama_url: 'http://localhost:11434',
      ollama_model: 'deepseek-coder:6.7b',
    };
    setStorage('ds_settings', settings);

    const flags = [
      { key: 'referral_system', name: 'Referral System', description: 'Enable referral code generation and tracking', enabled: true },
      { key: 'kyc_verification', name: 'KYC Checks', description: 'Require user verification for withdrawals', enabled: false },
    ];
    setStorage('ds_feature_flags', flags);

    // Seed Audit Logs
    const logs = [
      { id: 'LOG001', userEmail: 'system@deals.seller.com', action: 'System Init', targetType: 'system', timestamp: new Date().toISOString(), ipAddress: '127.0.0.1' }
    ];
    setStorage('ds_audit_logs', logs);

    setStorage('ds_user_activity', []);
    setStorage('ds_claims', []);
    setStorage('ds_transactions', []);

    localStorage.setItem('ds_seeded_v10', 'true');
  };

  // Run database initialization
  seedDatabase();

  // Helper to fetch current logged-in user
  const getCurrentUser = () => {
    const sessionUserId = sessionStorage.getItem('ds_session_user_id');
    if (!sessionUserId) return null;
    const users = getStorage('ds_users', []);
    return users.find((u: any) => u.id === sessionUserId) || null;
  };

  // Mock Request Handler
  const handleMockApi = async (path: string, init?: RequestInit): Promise<Response> => {
    const method = init?.method?.toUpperCase() || 'GET';
    const body = init?.body ? JSON.parse(init.body as string) : {};

    // Parse queries
    const urlObj = new URL(path, window.location.origin);
    const pathname = urlObj.pathname;
    const searchParams = urlObj.searchParams;

    // Response Helper
    const jsonResponse = (data: any, status = 200) => {
      return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    // ── AUTHENTICATION APIS ──
    if (pathname === '/api/auth/login' && method === 'POST') {
      const { identifier, password } = body;
      const cleanIdentifier = typeof identifier === 'string' ? identifier.replace(/^[\s,]+|[\s,]+$/g, '').trim() : '';
      const cleanPassword = typeof password === 'string' ? password.replace(/^[\s,]+|[\s,]+$/g, '').trim() : '';
      const cleanDigits = cleanIdentifier.replace(/\D/g, '');
      const users = getStorage('ds_users', []);
      
      // Support standard identifiers: email, mobile, or name, as well as Flask fallback stubs
      const adminStubs: Record<string, string> = { admin: 'ADM001', owner: 'ADM002', ekta: 'ADM003' };
      const lookupId = adminStubs[cleanIdentifier.toLowerCase()] || cleanIdentifier.toLowerCase();

      const user = users.find((u: any) => {
        const uEmail = (u.email || '').toLowerCase();
        const uName = (u.name || '').toLowerCase();
        const uId = (u.id || '').toLowerCase();
        const uMobileDigits = String(u.mobile || '').replace(/\D/g, '');

        return (
          uEmail === lookupId ||
          uName === lookupId ||
          uId === lookupId ||
          (cleanDigits.length >= 7 && uMobileDigits.length >= 7 && uMobileDigits.endsWith(cleanDigits))
        );
      });

      if (!user || user.password.trim() !== cleanPassword) {
        return jsonResponse({ success: false, detail: 'Invalid credentials. Please check your email/mobile and password.' }, 401);
      }
      if (user.status === 'suspended') {
        return jsonResponse({ success: false, detail: 'Your account has been suspended.' }, 403);
      }

      sessionStorage.setItem('ds_session_user_id', user.id);
      return jsonResponse({ success: true, message: 'Login successful' });
    }

    if (pathname === '/api/auth/me' && method === 'GET') {
      const user = getCurrentUser();
      if (!user) {
        return jsonResponse({ success: false, user: null }, 200);
      }
      return jsonResponse({ success: true, user });
    }

    if (pathname === '/api/auth/logout' && method === 'POST') {
      sessionStorage.removeItem('ds_session_user_id');
      return jsonResponse({ success: true });
    }

    if (pathname === '/api/auth/register' && method === 'POST') {
      const { name, email, mobile, password, referralCode } = body;
      const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
      const cleanName = typeof name === 'string' ? name.trim() : '';
      const cleanPassword = typeof password === 'string' ? password.trim() : '';
      const cleanMobile = typeof mobile === 'string' ? mobile.trim() : '';

      if (!cleanEmail || !cleanName || !cleanPassword) {
        return jsonResponse({ success: false, detail: 'Please fill in all required fields (Name, Email, Password).' }, 400);
      }

      const users = getStorage('ds_users', []);
      if (users.some((u: any) => u.email === cleanEmail)) {
        return jsonResponse({ success: false, detail: 'An account with this email address already exists.' }, 400);
      }

      const today = new Date().toISOString().split('T')[0];
      const newUserId = 'USR' + Math.floor(Math.random() * 90000 + 10000);
      const userReferral = (cleanName.slice(0, 4).toUpperCase().replace(/[^A-Z]/g, '') || 'USER') + Math.floor(Math.random() * 900 + 100);

      const newUser = {
        id: newUserId,
        name: cleanName,
        email: cleanEmail,
        mobile: cleanMobile || null,
        password: cleanPassword,
        role: 'buyer',
        status: 'active',
        joined: today,
        verified: true,
        referral: userReferral,
        referredBy: referralCode || null,
      };

      users.push(newUser);
      setStorage('ds_users', users);

      // Create clean isolated user wallet
      const wallets = getStorage('ds_wallets', []);
      wallets.push({
        id: 'WLT' + Math.floor(Math.random() * 90000 + 10000),
        userId: newUserId,
        pendingCashback: 0.0,
        approvedCashback: 0.0,
        lockedCashback: 0.0,
        withdrawableCashback: 0.0,
        refundBalance: 0.0,
        lastUpdated: new Date().toISOString(),
      });
      setStorage('ds_wallets', wallets);

      // Auto login session
      sessionStorage.setItem('ds_session_user_id', newUserId);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('ds_storage_update'));
      }
      return jsonResponse({ success: true, message: 'Account created successfully!', user: newUser });
    }

    // ── USER MANAGEMENT APIS ──
    if (pathname === '/api/users/all' && method === 'GET') {
      let users = getStorage('ds_users', []);
      const q = searchParams.get('q')?.toLowerCase();
      const role = searchParams.get('role');
      const statusFilter = searchParams.get('status_filter');

      if (q) {
        users = users.filter((u: any) =>
          u.name?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q) ||
          u.id?.toLowerCase().includes(q) ||
          (u.mobile && u.mobile.includes(q))
        );
      }
      if (role && role !== 'All') {
        users = users.filter((u: any) => u.role === role);
      }
      if (statusFilter && statusFilter !== 'All') {
        users = users.filter((u: any) => u.status === statusFilter);
      }
      return jsonResponse(users);
    }

    if (pathname === '/api/users/create' && method === 'POST') {
      const { name, email, mobile, password, role } = body;
      const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
      const cleanName = typeof name === 'string' ? name.trim() : '';
      const cleanPassword = typeof password === 'string' ? password.trim() : '';
      const cleanMobile = typeof mobile === 'string' ? mobile.trim() : '';

      if (!cleanEmail || !cleanName || !cleanPassword) {
        return jsonResponse({ success: false, detail: 'Please fill in all required fields.' }, 400);
      }

      const users = getStorage('ds_users', []);
      if (users.some((u: any) => u.email === cleanEmail)) {
        return jsonResponse({ success: false, detail: 'User with this email already exists.' }, 400);
      }

      const today = new Date().toISOString().split('T')[0];
      const newUserId = (role === 'admin' || role === 'super_admin' ? 'ADM' : 'USR') + Math.floor(Math.random() * 90000 + 10000);
      const newUser = {
        id: newUserId,
        name: cleanName,
        email: cleanEmail,
        mobile: cleanMobile || null,
        password: cleanPassword,
        role: role || 'buyer',
        status: 'active',
        joined: today,
        verified: true,
        referral: (cleanName.slice(0, 4).toUpperCase().replace(/[^A-Z]/g, '') || 'USER') + Math.floor(Math.random() * 900 + 100),
      };

      users.push(newUser);
      setStorage('ds_users', users);

      if (role === 'buyer') {
        const wallets = getStorage('ds_wallets', []);
        wallets.push({
          id: 'WLT' + Math.floor(Math.random() * 90000 + 10000),
          userId: newUserId,
          pendingCashback: 0.0,
          approvedCashback: 0.0,
          lockedCashback: 0.0,
          withdrawableCashback: 0.0,
          refundBalance: 0.0,
          lastUpdated: new Date().toISOString(),
        });
        setStorage('ds_wallets', wallets);
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('ds_storage_update'));
      }
      return jsonResponse({ success: true, user: newUser });
    }

    if (pathname.startsWith('/api/users/')) {
      const parts = pathname.replace('/api/users/', '').split('/');
      const userId = parts[0];
      const users = getStorage('ds_users', []);
      const uIdx = users.findIndex((u: any) => u.id === userId);

      if (uIdx !== -1) {
        if (method === 'GET') {
          return jsonResponse(users[uIdx]);
        }
        if (method === 'PATCH' || method === 'PUT') {
          const { role, status, name, mobile } = body;
          if (role) users[uIdx].role = role;
          if (status) users[uIdx].status = status;
          if (name) users[uIdx].name = name;
          if (mobile !== undefined) users[uIdx].mobile = mobile;
          setStorage('ds_users', users);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('ds_storage_update'));
          }
          return jsonResponse(users[uIdx]);
        }
        if (method === 'DELETE') {
          users.splice(uIdx, 1);
          setStorage('ds_users', users);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('ds_storage_update'));
          }
          return jsonResponse({ success: true });
        }
      }
    }

    // ── SYSTEM SETTINGS & FEATURE FLAGS ──
    if (pathname === '/api/settings' && method === 'GET') {
      return jsonResponse(getStorage('ds_settings', {}));
    }
    if (pathname.startsWith('/api/settings/') && method === 'PUT') {
      const key = pathname.replace('/api/settings/', '');
      const settings = getStorage('ds_settings', {});
      settings[key] = body.value !== undefined ? body.value : body;
      setStorage('ds_settings', settings);
      return jsonResponse({ success: true });
    }

    if (pathname === '/api/feature-flags' && method === 'GET') {
      return jsonResponse(getStorage('ds_feature_flags', []));
    }
    if (pathname.startsWith('/api/feature-flags/') && method === 'PUT') {
      const key = pathname.replace('/api/feature-flags/', '');
      const flags = getStorage('ds_feature_flags', []);
      const flagIdx = flags.findIndex((f: any) => f.key === key);
      if (flagIdx !== -1) {
        flags[flagIdx].enabled = body.enabled;
        setStorage('ds_feature_flags', flags);
      }
      return jsonResponse({ success: true });
    }

    // ── AI APIS (OLLAMA CONNECTION) ──
    if (pathname === '/api/ai/suggest-reply' && method === 'POST') {
      const settings = getStorage('ds_settings', {});
      const ollamaUrl = (settings.ollama_url || 'http://localhost:11434').trim().replace(/\/$/, '');
      const ollamaModel = (settings.ollama_model || 'deepseek-coder:6.7b').trim();

      const { title, description } = body;
      const prompt = `You are a helpful customer support agent for a cashback deal portal called 'deals.seller'.\n` +
        `A buyer has submitted a support ticket:\n` +
        `Subject: ${title}\n` +
        `Body: ${description}\n\n` +
        `Write a polite, professional, and helpful response to resolve their query. ` +
        `Keep the response concise, clear, and direct. Do not add any greeting placeholders like '[My Name]' or '[Your Name]'; ` +
        `simply sign off as 'Deals Seller Support Team'.`;

      try {
        const res = await originalFetch(`${ollamaUrl}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: ollamaModel,
            prompt: prompt,
            stream: false
          })
        });

        if (res.ok) {
          const resData = await res.json();
          const suggestion = (resData.response || '').trim();
          return jsonResponse({ success: true, suggestion });
        } else {
          const errText = await res.text();
          return jsonResponse({ success: false, detail: `Ollama returned error: ${errText}` }, 500);
        }
      } catch (err: any) {
        return jsonResponse({ success: false, detail: `Could not connect to local Ollama on ${ollamaUrl}. Error: ${err.message}` }, 500);
      }
    }

    if (pathname === '/api/ai/chat' && method === 'POST') {
      const settings = getStorage('ds_settings', {});
      const ollamaUrl = (settings.ollama_url || 'http://localhost:11434').trim().replace(/\/$/, '');
      const ollamaModel = (settings.ollama_model || 'deepseek-coder:6.7b').trim();

      const { message, history } = body;
      const currentUser = getCurrentUser();

      if (!currentUser) {
        return jsonResponse({ detail: 'Authentication required' }, 401);
      }

      const wallets = getStorage('ds_wallets', []);
      const wallet = wallets.find((w: any) => w.userId === currentUser.id);

      const orders = getStorage('ds_orders', []);
      const userOrders = orders.filter((o: any) => o.buyerId === currentUser.id);

      const walletInfo = wallet 
        ? `Pending: ₹${wallet.pendingCashback}, Approved: ₹${wallet.approvedCashback}, Withdrawable: ₹${wallet.withdrawableCashback}, Refund Balance: ₹${wallet.refundBalance}`
        : 'No wallet found';

      const ordersInfo = userOrders.slice(0, 5).map((o: any) => 
        `- Order ${o.orderNo} (${o.platform}): status '${o.currentStatus}', cashback ₹${o.netAmount}`
      ).join('\n') || 'No orders placed yet.';

      const systemPrompt = `You are the Deals Seller Portal virtual assistant. You help buyers with their cashback deals and orders.\n` +
        `User Profile Info:\n` +
        `- Name: ${currentUser.name}\n` +
        `- Email: ${currentUser.email}\n` +
        `- VIP Tier: ${currentUser.vipTier || 'Standard'}\n` +
        `- Wallet Balance: ${walletInfo}\n` +
        `- Recent Orders:\n${ordersInfo}\n\n` +
        `Guidelines:\n` +
        `- Answer client queries using the profile information. Be polite, precise, and professional.\n` +
        `- If asked about withdrawal rules: Minimum withdrawal is ₹100.\n` +
        `- If asked about fee: Platform fee is 5% deducted from cashback.\n` +
        `- Keep responses direct and concise (under 3 sentences where possible). Avoid long-winded output.\n`;

      let historyStr = '';
      if (history) {
        for (const msg of history.slice(-6)) {
          historyStr += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
        }
      }

      const fullPrompt = `${systemPrompt}\nChat History:\n${historyStr}User: ${message}\nAssistant:`;

      try {
        const res = await originalFetch(`${ollamaUrl}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: ollamaModel,
            prompt: fullPrompt,
            stream: false
          })
        });

        if (res.ok) {
          const resData = await res.json();
          const response = (resData.response || '').trim();
          return jsonResponse({ success: true, response });
        } else {
          const errText = await res.text();
          return jsonResponse({ success: false, detail: `Ollama returned error: ${errText}` }, 500);
        }
      } catch (err: any) {
        return jsonResponse({ success: false, detail: `Could not connect to local Ollama on ${ollamaUrl}. Error: ${err.message}` }, 500);
      }
    }

    // ── SUPPORT TICKETS APIS ──
    if (pathname === '/api/tickets') {
      const tickets = getStorage('ds_tickets', []);
      if (method === 'GET') {
        const currentUser = getCurrentUser();
        if (currentUser && currentUser.role === 'buyer') {
          return jsonResponse(tickets.filter((t: any) => t.userId === currentUser.id));
        }
        return jsonResponse(tickets);
      }
      if (method === 'POST') {
        const currentUser = getCurrentUser();
        const { title, description, category, orderNo, priority } = body;
        const newTicket = {
          id: 'TCK' + Math.floor(Math.random() * 90000 + 10000),
          userId: currentUser ? currentUser.id : 'GUEST',
          userName: currentUser ? currentUser.name : 'Buyer',
          userEmail: currentUser ? currentUser.email : '',
          title: title || 'Support Query',
          description: description || '',
          category: category || 'General',
          orderNo: orderNo || null,
          status: 'open',
          priority: priority || 'medium',
          reply: null,
          repliedAt: null,
          createdAt: new Date().toISOString(),
        };
        tickets.unshift(newTicket);
        setStorage('ds_tickets', tickets);

        if (currentUser) {
          const activityLogs = getStorage('ds_user_activity', []);
          activityLogs.unshift({
            id: 'ACT' + Math.floor(Math.random() * 90000 + 10000),
            userId: currentUser.id,
            action: 'Submitted Support Ticket',
            details: `Created ticket ${newTicket.id}: ${newTicket.title}`,
            timestamp: new Date().toISOString(),
          });
          setStorage('ds_user_activity', activityLogs);
        }

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('ds_storage_update'));
        }
        return jsonResponse(newTicket);
      }
    }

    if (pathname.startsWith('/api/tickets/')) {
      const ticketId = pathname.replace('/api/tickets/', '');
      const tickets = getStorage('ds_tickets', []);
      const ticketIdx = tickets.findIndex((t: any) => t.id === ticketId);

      if (ticketIdx !== -1) {
        if (method === 'GET') {
          return jsonResponse(tickets[ticketIdx]);
        }
        if (method === 'PATCH' || method === 'PUT') {
          const { reply, status } = body;
          if (reply !== undefined) tickets[ticketIdx].reply = reply;
          tickets[ticketIdx].status = status || 'resolved';
          tickets[ticketIdx].repliedAt = new Date().toISOString();
          setStorage('ds_tickets', tickets);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('ds_storage_update'));
          }
          return jsonResponse(tickets[ticketIdx]);
        }
        if (method === 'DELETE') {
          tickets.splice(ticketIdx, 1);
          setStorage('ds_tickets', tickets);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('ds_storage_update'));
          }
          return jsonResponse({ success: true });
        }
      }
    }

    // ── DEALS APIS ──
    if (pathname === '/api/deals') {
      const deals = getStorage('ds_deals', []);
      if (method === 'GET') {
        const currentUser = getCurrentUser();
        const activeOnly = searchParams.get('active_only') === 'true' || (currentUser && currentUser.role === 'buyer');
        // Live Sync availability filter: active === true and remaining slots > 0
        const filtered = activeOnly 
          ? deals.filter((d: any) => d.active && ((d.slots || 0) - (d.claimedCount || 0)) > 0) 
          : deals;
        return jsonResponse(filtered);
      }
      if (method === 'POST') {
        const id = 'DEA' + Math.floor(Math.random() * 900 + 100);
        const newDeal = { id, active: true, claimedCount: 0, ...body };
        deals.push(newDeal);
        setStorage('ds_deals', deals);
        return jsonResponse(newDeal);
      }
    }

    if (pathname === '/api/claims/my' && method === 'GET') {
      const currentUser = getCurrentUser();
      if (!currentUser) return jsonResponse([]);
      const claims = getStorage('ds_claims', []);
      const userClaims = claims.filter((c: any) => c.userId === currentUser.id);
      return jsonResponse(userClaims);
    }

    if (pathname.startsWith('/api/deals/')) {
      const parts = pathname.replace('/api/deals/', '').split('/');
      const dealId = parts[0];
      const subRoute = parts[1]; // like 'clone', 'slots', 'claim' etc.

      const deals = getStorage('ds_deals', []);
      const dealIdx = deals.findIndex((d: any) => d.id === dealId);

      if (dealIdx === -1) return jsonResponse({ detail: 'Deal not found' }, 404);
      const deal = deals[dealIdx];

      if (method === 'POST' && subRoute === 'claim') {
        const currentUser = getCurrentUser();
        if (!currentUser) return jsonResponse({ detail: 'Authentication required' }, 401);

        const claims = getStorage('ds_claims', []);
        const existing = claims.find((c: any) => c.userId === currentUser.id && c.dealId === dealId && c.status === 'active');
        if (existing) {
          return jsonResponse({ success: true, claim: existing, message: 'Deal slot already reserved' });
        }

        const availSlots = (deal.slots || 0) - (deal.claimedCount || 0);
        if (availSlots <= 0) {
          deal.active = false;
          setStorage('ds_deals', deals);
          return jsonResponse({ detail: 'No available slots remaining for this deal' }, 400);
        }

        deal.claimedCount = (deal.claimedCount || 0) + 1;
        if (deal.claimedCount >= deal.slots) {
          deal.active = false;
        }
        deals[dealIdx] = deal;
        setStorage('ds_deals', deals);

        const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        const newClaim = {
          id: 'CLM' + Math.floor(Math.random() * 9000 + 1000),
          userId: currentUser.id,
          dealId: deal.id,
          productCode: deal.productCode,
          productName: deal.productName,
          cashback: deal.cashback,
          claimedAt: new Date().toISOString(),
          expiresAt,
          status: 'active'
        };
        claims.push(newClaim);
        setStorage('ds_claims', claims);

        const activityLogs = getStorage('ds_user_activity', []);
        activityLogs.unshift({
          id: 'ACT' + Math.floor(Math.random() * 90000 + 10000),
          userId: currentUser.id,
          action: 'Claimed Deal Slot',
          details: `Reserved slot for ${deal.productName} (15m lock token)`,
          timestamp: new Date().toISOString()
        });
        setStorage('ds_user_activity', activityLogs);

        return jsonResponse({ success: true, claim: newClaim });
      }

      if (method === 'GET' && !subRoute) {
        const currentUser = getCurrentUser();
        if (currentUser && currentUser.role === 'buyer' && !deal.active) {
          return jsonResponse({ detail: 'Deal is paused or inactive' }, 403);
        }
        return jsonResponse(deal);
      }

      if (method === 'DELETE') {
        deals.splice(dealIdx, 1);
        setStorage('ds_deals', deals);
        return jsonResponse({ success: true });
      }

      if (method === 'PUT' || method === 'PATCH') {
        if (pathname.endsWith('/clone')) {
          const original = deals[dealIdx];
          const newId = 'DEA' + Math.floor(Math.random() * 900 + 100);
          const cloned = {
            ...original,
            id: newId,
            claimedCount: 0,
            productCode: original.productCode + '-CLONE',
            productName: original.productName + ' (Copy)'
          };
          deals.push(cloned);
          setStorage('ds_deals', deals);
          return jsonResponse(cloned);
        }

        if (pathname.endsWith('/slots')) {
          const { slots, new_slots } = body;
          const targetSlots = slots !== undefined ? slots : new_slots;
          deals[dealIdx].slots = parseInt(targetSlots || '0');
          if (deals[dealIdx].slots > deals[dealIdx].claimedCount) {
            deals[dealIdx].active = true;
          }
          setStorage('ds_deals', deals);
          return jsonResponse(deals[dealIdx]);
        }

        deals[dealIdx] = { ...deals[dealIdx], ...body };
        setStorage('ds_deals', deals);
        return jsonResponse(deals[dealIdx]);
      }
    }

    // ── ORDERS APIS ──
    if (pathname === '/api/orders') {
      const orders = getStorage('ds_orders', []);
      const user = getCurrentUser();

      if (method === 'GET') {
        const q = searchParams.get('q')?.toLowerCase() || '';
        let filtered = user?.role === 'buyer' 
          ? orders.filter((o: any) => o.buyerId === user.id)
          : orders;

        if (q) {
          filtered = filtered.filter((o: any) => 
            o.orderNo.toLowerCase().includes(q) || 
            o.productName.toLowerCase().includes(q) || 
            o.id.toLowerCase().includes(q)
          );
        }
        return jsonResponse(filtered);
      }

      if (method === 'DELETE') {
        setStorage('ds_orders', []);
        const wallets = getStorage('ds_wallets', []);
        wallets.forEach((w: any) => {
          w.pendingCashback = 0.0;
          w.approvedCashback = 0.0;
          w.lockedCashback = 0.0;
          w.withdrawableCashback = 0.0;
          w.refundBalance = 0.0;
          w.totalWithdrawn = 0.0;
          w.lifetimeEarned = 0.0;
          w.lastUpdated = new Date().toISOString();
        });
        setStorage('ds_wallets', wallets);
        setStorage('ds_transactions', []);
        setStorage('ds_withdrawals', []);
        setStorage('ds_refunds', []);
        setStorage('ds_tickets', []);
        return jsonResponse({ success: true, message: 'All orders and transaction histories cleared successfully.' });
      }

      if (method === 'POST') {
        const { orderNo, productCode, orderName, platform, mediator, dealType, orderDate, amount, deduction } = body;
        
        // Check duplicate
        if (orders.find((o: any) => o.orderNo === orderNo)) {
          return jsonResponse({ detail: `Order ID ${orderNo} already exists` }, 400);
        }

        // Calculate Fees
        const deals = getStorage('ds_deals', []);
        const deal = deals.find((d: any) => d.productCode === productCode);
        if (!deal) {
          return jsonResponse({ detail: "Deal not found or has been deleted" }, 400);
        }
        if (!deal.active) {
          return jsonResponse({ detail: "This deal is currently paused and cannot accept submissions" }, 400);
        }

        let productName = deal.productName;
        if (typeof orderName === 'string' && orderName.trim()) {
          productName = orderName.trim();
        }
        let plat = deal.platform;
        let cashbackAmount = deal.cashback;
        let cashbackPct = Math.round((cashbackAmount / amount) * 10000) / 100;

        const processingFee = Math.round(amount * 0.05 * 100) / 100;
        const finalDeduction = deduction > 0 ? deduction : processingFee;
        const netAmount = Math.round((cashbackAmount - finalDeduction) * 100) / 100;

        const id = 'ORD' + Math.floor(Math.random() * 9000 + 1000);
        const newOrder = {
          id,
          orderNo,
          orderCode: 'ORD-' + Math.floor(Math.random() * 900000 + 100000),
          trackingNumber: 'TRK-' + Math.floor(Math.random() * 900000 + 100000),
          productName,
          productPrice: amount,
          quantity: 1,
          buyerId: user.id,
          cashbackPct,
          cashbackAmount,
          processingFee,
          deductionAmount: finalDeduction,
          netAmount,
          refundStatus: 'not_eligible',
          approvalStatus: 'pending_review',
          currentStatus: 'order_filled',
          orderDate,
          submittedDate: new Date().toISOString().split('T')[0],
          paidDate: null,
          platform: plat,
          priority: 'normal',
          screenshot: true,
        };

        orders.push(newOrder);
        setStorage('ds_orders', orders);

        // Update Wallet
        const wallets = getStorage('ds_wallets', []);
        const wIdx = wallets.findIndex((w: any) => w.userId === user.id);
        if (wIdx !== -1) {
          wallets[wIdx].pendingCashback = Math.round((wallets[wIdx].pendingCashback + netAmount) * 100) / 100;
          wallets[wIdx].lastUpdated = new Date().toISOString();
          setStorage('ds_wallets', wallets);
        }

        // Add Transaction
        const txs = getStorage('ds_transactions', []);
        txs.push({
          id: 'TX' + Math.floor(Math.random() * 90000 + 10000),
          walletId: 'WLT' + user.id.replace('USR', ''),
          orderId: id,
          amount: netAmount,
          type: 'credit',
          category: 'cashback_pending',
          status: 'pending',
          description: `Cashback pending for order ${orderNo}`,
          timestamp: new Date().toISOString()
        });
        setStorage('ds_transactions', txs);

        return jsonResponse({ success: true, order: newOrder });
      }
    }

    if (pathname === '/api/orders/bulk-action' && method === 'POST') {
      const { orderIds, action } = body;
      const orders = getStorage('ds_orders', []);
      const wallets = getStorage('ds_wallets', []);
      const txs = getStorage('ds_transactions', []);

      orderIds.forEach((id: string) => {
        const orderIdx = orders.findIndex((o: any) => o.id === id);
        if (orderIdx !== -1) {
          const o = orders[orderIdx];
          const oldStatus = o.currentStatus;
          
          if (action === 'mark_paid' && oldStatus !== 'paid') {
            o.currentStatus = 'paid';
            o.approvalStatus = 'approved';
            o.paidDate = new Date().toISOString().split('T')[0];

            // Transition pending to withdrawable
            const wIdx = wallets.findIndex((w: any) => w.userId === o.buyerId);
            if (wIdx !== -1) {
              wallets[wIdx].pendingCashback = Math.max(0, Math.round((wallets[wIdx].pendingCashback - o.netAmount) * 100) / 100);
              wallets[wIdx].withdrawableCashback = Math.round((wallets[wIdx].withdrawableCashback + o.netAmount) * 100) / 100;
              wallets[wIdx].approvedCashback = Math.round((wallets[wIdx].approvedCashback + o.netAmount) * 100) / 100;
              wallets[wIdx].lifetimeEarned = Math.round((wallets[wIdx].lifetimeEarned + o.netAmount) * 100) / 100;
              wallets[wIdx].lastUpdated = new Date().toISOString();
            }

            txs.push({
              id: 'TX' + Math.floor(Math.random() * 90000 + 10000),
              walletId: 'WLT' + o.buyerId.replace('USR', ''),
              orderId: o.id,
              amount: o.netAmount,
              type: 'credit',
              category: 'cashback_approved',
              status: 'completed',
              description: `Cashback approved for ${o.orderNo}`,
              timestamp: new Date().toISOString()
            });
          } else if (action === 'cancel' && oldStatus !== 'cancelled') {
            o.currentStatus = 'cancelled';
            
            // Deduct pending cashback
            const wIdx = wallets.findIndex((w: any) => w.userId === o.buyerId);
            if (wIdx !== -1) {
              wallets[wIdx].pendingCashback = Math.max(0, Math.round((wallets[wIdx].pendingCashback - o.netAmount) * 100) / 100);
              wallets[wIdx].lastUpdated = new Date().toISOString();
            }
          }
        }
      });

      setStorage('ds_orders', orders);
      setStorage('ds_wallets', wallets);
      setStorage('ds_transactions', txs);
      return jsonResponse({ success: true, updatedCount: orderIds.length });
    }

    if (pathname.startsWith('/api/orders/')) {
      const parts = pathname.replace('/api/orders/', '').split('/');
      const orderId = parts[0];
      const orders = getStorage('ds_orders', []);
      const orderIdx = orders.findIndex((o: any) => o.id === orderId);

      if (orderIdx === -1) return jsonResponse({ detail: 'Order not found' }, 404);
      const o = orders[orderIdx];

      const user = getCurrentUser();
      if (user && user.role === 'buyer' && o.buyerId !== user.id) {
        return jsonResponse({ detail: 'Order not found' }, 404);
      }

      if (method === 'GET' && parts[1] === 'timeline') {
        const logs = [
          { id: 'OSL001', orderId: orderId, fromStatus: 'submitted', toStatus: 'pending_review', note: 'Order submitted by buyer', timestamp: o.submittedDate || o.orderDate }
        ];
        if (o.currentStatus === 'paid') {
          logs.push({ id: 'OSL002', orderId: orderId, fromStatus: 'pending_review', toStatus: 'paid', note: 'Marked paid by admin', timestamp: o.paidDate || o.orderDate });
        } else if (o.currentStatus === 'cancelled') {
          logs.push({ id: 'OSL002', orderId: orderId, fromStatus: 'pending_review', toStatus: 'cancelled', note: 'Order cancelled', timestamp: o.orderDate });
        }
        return jsonResponse(logs);
      }

      if (method === 'GET' && parts[1] === 'fraud-check') {
        if (user && user.role === 'buyer') {
          return jsonResponse({ detail: 'Forbidden' }, 403);
        }
        return jsonResponse({
          status: 'success',
          riskLevel: 'low',
          checks: { ipCheck: 'pass', velocityCheck: 'pass', screenshotCheck: 'pass' }
        });
      }

      if (method === 'GET' && !parts[1]) {
        return jsonResponse(o);
      }

      if (method === 'PUT' || method === 'PATCH') {
        const oldStatus = o.currentStatus;
        const newStatus = body.currentStatus || body.status;

        // Transition logic
        if (newStatus && newStatus !== oldStatus) {
          const wallets = getStorage('ds_wallets', []);
          const txs = getStorage('ds_transactions', []);
          const wIdx = wallets.findIndex((w: any) => w.userId === o.buyerId);

          if (newStatus === 'paid' && oldStatus !== 'paid') {
            o.currentStatus = 'paid';
            o.approvalStatus = 'approved';
            o.paidDate = new Date().toISOString().split('T')[0];

            if (wIdx !== -1) {
              wallets[wIdx].pendingCashback = Math.max(0, Math.round((wallets[wIdx].pendingCashback - o.netAmount) * 100) / 100);
              wallets[wIdx].withdrawableCashback = Math.round((wallets[wIdx].withdrawableCashback + o.netAmount) * 100) / 100;
              wallets[wIdx].approvedCashback = Math.round((wallets[wIdx].approvedCashback + o.netAmount) * 100) / 100;
              wallets[wIdx].lifetimeEarned = Math.round((wallets[wIdx].lifetimeEarned + o.netAmount) * 100) / 100;
              wallets[wIdx].lastUpdated = new Date().toISOString();
            }

            txs.push({
              id: 'TX' + Math.floor(Math.random() * 90000 + 10000),
              walletId: 'WLT' + o.buyerId.replace('USR', ''),
              orderId: o.id,
              amount: o.netAmount,
              type: 'credit',
              category: 'cashback_approved',
              status: 'completed',
              description: `Cashback approved for ${o.orderNo}`,
              timestamp: new Date().toISOString()
            });
          } else if (newStatus === 'cancelled' && oldStatus !== 'cancelled') {
            o.currentStatus = 'cancelled';
            if (wIdx !== -1) {
              wallets[wIdx].pendingCashback = Math.max(0, Math.round((wallets[wIdx].pendingCashback - o.netAmount) * 100) / 100);
              wallets[wIdx].lastUpdated = new Date().toISOString();
            }
          } else {
            o.currentStatus = newStatus;
          }

          setStorage('ds_wallets', wallets);
          setStorage('ds_transactions', txs);
        }

        orders[orderIdx] = { ...o, ...body };
        setStorage('ds_orders', orders);
        return jsonResponse(orders[orderIdx]);
      }
    }

    // ── WALLET & TRANSACTIONS APIS ──
    if (pathname === '/api/wallet/transactions' && method === 'GET') {
      const user = getCurrentUser();
      const txs = getStorage('ds_transactions', []);
      const walletId = 'WLT' + user?.id.replace('USR', '');
      const filtered = txs.filter((t: any) => t.walletId === walletId);
      return jsonResponse(filtered);
    }

    if (pathname === '/api/withdrawals') {
      const withdrawals = getStorage('ds_withdrawals', []);
      const user = getCurrentUser();

      if (method === 'GET') {
        const filtered = user?.role === 'buyer'
          ? withdrawals.filter((w: any) => w.userId === user.id)
          : withdrawals;
        return jsonResponse(filtered);
      }

      if (method === 'POST') {
        const { amount, method: wMethod, accountDetails } = body;
        const wallets = getStorage('ds_wallets', []);
        const wIdx = wallets.findIndex((w: any) => w.userId === user.id);

        if (wIdx === -1 || wallets[wIdx].withdrawableCashback < amount) {
          return jsonResponse({ detail: 'Insufficient withdrawable balance' }, 400);
        }

        // Deduct from wallet
        wallets[wIdx].withdrawableCashback = Math.round((wallets[wIdx].withdrawableCashback - amount) * 100) / 100;
        wallets[wIdx].totalWithdrawn = Math.round(((wallets[wIdx].totalWithdrawn || 0) + amount) * 100) / 100;
        wallets[wIdx].lastUpdated = new Date().toISOString();
        setStorage('ds_wallets', wallets);

        // Add Withdrawal Request
        const newWth = {
          id: 'WTH' + Math.floor(Math.random() * 900 + 100),
          userId: user.id,
          userName: user.name,
          amount,
          method: wMethod,
          accountDetails,
          status: 'pending',
          createdAt: new Date().toISOString(),
        };
        withdrawals.push(newWth);
        setStorage('ds_withdrawals', withdrawals);

        // Add Transaction
        const txs = getStorage('ds_transactions', []);
        txs.push({
          id: 'TX' + Math.floor(Math.random() * 90000 + 10000),
          walletId: 'WLT' + user.id.replace('USR', ''),
          orderId: null,
          amount,
          type: 'debit',
          category: 'withdrawal_pending',
          status: 'pending',
          description: `Withdrawal payout request (${wMethod})`,
          timestamp: new Date().toISOString()
        });
        setStorage('ds_transactions', txs);

        return jsonResponse(newWth);
      }
    }

    if (pathname.startsWith('/api/withdrawals/') && (method === 'PUT' || method === 'PATCH')) {
      const wthId = pathname.replace('/api/withdrawals/', '');
      const withdrawals = getStorage('ds_withdrawals', []);
      const wIdx = withdrawals.findIndex((w: any) => w.id === wthId);

      if (wIdx === -1) return jsonResponse({ detail: 'Withdrawal not found' }, 404);

      const wth = withdrawals[wIdx];
      const newStatus = body.status;

      if (newStatus && newStatus !== wth.status) {
        wth.status = newStatus;
        if (newStatus === 'processed') {
          wth.processedAt = new Date().toISOString();
        } else if (newStatus === 'rejected') {
          // Refund withdrawable cashback
          const wallets = getStorage('ds_wallets', []);
          const walletIdx = wallets.findIndex((wl: any) => wl.userId === wth.userId);
          if (walletIdx !== -1) {
            wallets[walletIdx].withdrawableCashback = Math.round((wallets[walletIdx].withdrawableCashback + wth.amount) * 100) / 100;
            wallets[walletIdx].totalWithdrawn = Math.max(0, Math.round(((wallets[walletIdx].totalWithdrawn || 0) - wth.amount) * 100) / 100);
            wallets[walletIdx].lastUpdated = new Date().toISOString();
            setStorage('ds_wallets', wallets);
          }
        }
      }

      setStorage('ds_withdrawals', withdrawals);
      return jsonResponse(wth);
    }

    // ── REFUNDS APIS ──
    if (pathname === '/api/refunds') {
      const refunds = getStorage('ds_refunds', []);
      const user = getCurrentUser();

      if (method === 'GET') {
        const filtered = user?.role === 'buyer'
          ? refunds.filter((r: any) => r.userId === user.id)
          : refunds;
        return jsonResponse(filtered);
      }

      if (method === 'POST') {
        const { orderNo, reason, amount, upi } = body;
        const orders = getStorage('ds_orders', []);
        const order = orders.find((o: any) => o.orderNo === orderNo);

        if (!order) return jsonResponse({ detail: 'Order not found' }, 404);

        // Update Order
        order.currentStatus = 'under_review';
        order.refundStatus = 'pending';
        setStorage('ds_orders', orders);

        const newRefund = {
          id: 'REF' + Math.floor(Math.random() * 900 + 100),
          orderId: order.id,
          orderNo,
          userId: user.id,
          userName: user.name,
          reason,
          amount,
          upi,
          status: 'pending',
          submittedAt: new Date().toISOString()
        };

        refunds.push(newRefund);
        setStorage('ds_refunds', refunds);
        return jsonResponse(newRefund);
      }
    }

    if (pathname.startsWith('/api/refunds/') && (method === 'PUT' || method === 'PATCH')) {
      const refId = pathname.replace('/api/refunds/', '');
      const refunds = getStorage('ds_refunds', []);
      const refIdx = refunds.findIndex((r: any) => r.id === refId);

      if (refIdx === -1) return jsonResponse({ detail: 'Refund claim not found' }, 404);

      const r = refunds[refIdx];
      const newStatus = body.status;

      if (newStatus && newStatus !== r.status) {
        r.status = newStatus;
        const orders = getStorage('ds_orders', []);
        const orderIdx = orders.findIndex((o: any) => o.id === r.orderId);

        if (newStatus === 'resolved') {
          r.resolvedAt = new Date().toISOString();
          
          if (orderIdx !== -1) {
            orders[orderIdx].currentStatus = 'cancelled';
            orders[orderIdx].refundStatus = 'cleared';
          }

          // Credit refund balance
          const wallets = getStorage('ds_wallets', []);
          const wIdx = wallets.findIndex((wl: any) => wl.userId === r.userId);
          if (wIdx !== -1) {
            wallets[wIdx].refundBalance = Math.round((wallets[wIdx].refundBalance + r.amount) * 100) / 100;
            wallets[wIdx].lastUpdated = new Date().toISOString();
            setStorage('ds_wallets', wallets);
          }
        } else if (newStatus === 'rejected') {
          if (orderIdx !== -1) {
            orders[orderIdx].currentStatus = 'order_filled';
            orders[orderIdx].refundStatus = 'not_eligible';
          }
        }
        setStorage('ds_orders', orders);
      }

      setStorage('ds_refunds', refunds);
      return jsonResponse(r);
    }

    // ── SUPPORT TICKETS APIS ──
    if (pathname === '/api/tickets') {
      const tickets = getStorage('ds_tickets', []);
      const user = getCurrentUser();

      if (method === 'GET') {
        const filtered = user?.role === 'buyer'
          ? tickets.filter((t: any) => t.userId === user.id)
          : tickets;
        return jsonResponse(filtered);
      }

      if (method === 'POST') {
        const { subject, body: tBody, priority } = body;
        const newTicket = {
          id: 'TCK' + Math.floor(Math.random() * 900 + 100),
          userId: user.id,
          userName: user.name,
          subject,
          body: tBody,
          status: 'open',
          priority: priority || 'normal',
          createdAt: new Date().toISOString()
        };

        tickets.push(newTicket);
        setStorage('ds_tickets', tickets);
        return jsonResponse(newTicket);
      }
    }

    if (pathname.startsWith('/api/tickets/') && (method === 'PUT' || method === 'PATCH')) {
      const tckId = pathname.replace('/api/tickets/', '');
      const tickets = getStorage('ds_tickets', []);
      const tIdx = tickets.findIndex((t: any) => t.id === tckId);

      if (tIdx === -1) return jsonResponse({ detail: 'Support ticket not found' }, 404);

      tickets[tIdx] = { ...tickets[tIdx], ...body, updatedAt: new Date().toISOString() };
      setStorage('ds_tickets', tickets);
      return jsonResponse(tickets[tIdx]);
    }

    // ── USER PROFILE, SECURITY & ACTIVITY LOG APIS ──
    if (pathname === '/api/users/profile' && method === 'PUT') {
      const user = getCurrentUser();
      const users = getStorage('ds_users', []);
      const uIdx = users.findIndex((u: any) => u.id === user.id);

      if (uIdx !== -1) {
        users[uIdx] = { ...users[uIdx], ...body };
        setStorage('ds_users', users);
        return jsonResponse({ success: true, user: users[uIdx] });
      }
    }

    if (pathname === '/api/users/change-password' && method === 'POST') {
      const user = getCurrentUser();
      if (!user) return jsonResponse({ detail: 'Authentication required' }, 401);
      const { oldPassword, newPassword } = body;
      const users = getStorage('ds_users', []);
      const uIdx = users.findIndex((u: any) => u.id === user.id);

      if (uIdx === -1 || users[uIdx].password !== oldPassword) {
        return jsonResponse({ detail: 'Current password is incorrect' }, 400);
      }

      users[uIdx].password = newPassword;
      setStorage('ds_users', users);

      const logs = getStorage('ds_user_activity', []);
      logs.unshift({
        id: 'ACT' + Math.floor(Math.random() * 90000 + 10000),
        userId: user.id,
        action: 'Password Changed',
        details: 'Account security password updated',
        timestamp: new Date().toISOString()
      });
      setStorage('ds_user_activity', logs);

      return jsonResponse({ success: true, message: 'Password updated successfully' });
    }

    if (pathname === '/api/users/activity-logs' && method === 'GET') {
      const user = getCurrentUser();
      if (!user) return jsonResponse([]);
      const logs = getStorage('ds_user_activity', []);
      const userLogs = logs.filter((l: any) => l.userId === user.id);
      return jsonResponse(userLogs);
    }

    if (pathname === '/api/calculator/estimate' && method === 'POST') {
      const { price, cashbackPct, platformFeePct } = body;
      const numericPrice = parseFloat(price) || 0;
      const numericPct = parseFloat(cashbackPct) || 10;
      const feePct = parseFloat(platformFeePct) || 5;

      const grossCashback = (numericPrice * numericPct) / 100;
      const platformFee = (grossCashback * feePct) / 100;
      const netEarnings = Math.max(0, grossCashback - platformFee);
      const effectiveDiscount = numericPrice > 0 ? ((netEarnings / numericPrice) * 100).toFixed(2) : '0';

      return jsonResponse({
        purchasePrice: numericPrice,
        grossCashback: Math.round(grossCashback * 100) / 100,
        platformFee: Math.round(platformFee * 100) / 100,
        netCashback: Math.round(netEarnings * 100) / 100,
        effectiveDiscountPct: effectiveDiscount
      });
    }

    if (pathname === '/api/users') {
      const users = getStorage('ds_users', []);
      if (method === 'GET') {
        const role = searchParams.get('role');
        const filtered = role ? users.filter((u: any) => u.role === role) : users;
        return jsonResponse(filtered);
      }

      if (method === 'POST') {
        const { name, email, mobile, password, referral } = body;

        if (users.find((u: any) => u.email === email || u.mobile === mobile)) {
          return jsonResponse({ detail: 'User with this email or mobile already exists' }, 409);
        }

        const id = 'USR' + Math.floor(Math.random() * 900 + 100);
        const newUser = {
          id,
          name,
          email,
          mobile,
          password,
          role: 'buyer',
          status: 'active',
          joined: new Date().toISOString().split('T')[0],
          verified: true,
          referral: name.toUpperCase().replace(/\s/g, '').substring(0, 5) + Math.floor(Math.random() * 100),
          kycStatus: 'pending',
          vipTier: 'standard',
          avatarColor: ['rose', 'blue', 'amber', 'emerald', 'violet'][Math.floor(Math.random() * 5)],
          totalEarnings: 0.0,
        };

        users.push(newUser);
        setStorage('ds_users', users);

        // Add Wallet
        const wallets = getStorage('ds_wallets', []);
        wallets.push({
          id: 'WLT' + id.replace('USR', ''),
          userId: id,
          pendingCashback: 0.0,
          approvedCashback: 0.0,
          lockedCashback: 0.0,
          withdrawableCashback: 0.0,
          refundBalance: 0.0,
          lastUpdated: new Date().toISOString()
        });
        setStorage('ds_wallets', wallets);

        // Handle Referral tracking
        if (referral) {
          const referrer = users.find((u: any) => u.referral === referral);
          if (referrer) {
            const referrerWalletIdx = wallets.findIndex((w: any) => w.userId === referrer.id);
            if (referrerWalletIdx !== -1) {
              wallets[referrerWalletIdx].withdrawableCashback = Math.round((wallets[referrerWalletIdx].withdrawableCashback + 50.0) * 100) / 100;
              setStorage('ds_wallets', wallets);
            }
            
            const txs = getStorage('ds_transactions', []);
            txs.push({
              id: 'TX' + Math.floor(Math.random() * 90000 + 10000),
              walletId: 'WLT' + referrer.id.replace('USR', ''),
              amount: 50.0,
              type: 'credit',
              category: 'referral_bonus',
              status: 'completed',
              description: `Referral signup bonus for ${name}`,
              timestamp: new Date().toISOString()
            });
            setStorage('ds_transactions', txs);
          }
        }

        return jsonResponse(newUser);
      }
    }

    if (pathname.startsWith('/api/users/')) {
      const userId = pathname.replace('/api/users/', '');
      const users = getStorage('ds_users', []);
      const uIdx = users.findIndex((u: any) => u.id === userId);

      if (uIdx === -1) return jsonResponse({ detail: 'User not found' }, 404);

      if (method === 'PUT' || method === 'PATCH') {
        users[uIdx] = { ...users[uIdx], ...body };
        setStorage('ds_users', users);
        return jsonResponse(users[uIdx]);
      }
    }

    if (pathname === '/api/users/all' && method === 'GET') {
      return jsonResponse(getStorage('ds_users', []));
    }

    if (pathname.startsWith('/api/admin/impersonate/')) {
      const impId = pathname.replace('/api/admin/impersonate/', '');
      const users = getStorage('ds_users', []);
      const target = users.find((u: any) => u.id === impId);
      if (target) {
        sessionStorage.setItem('ds_session_user_id', target.id);
        return jsonResponse({ success: true, user: target });
      }
      return jsonResponse({ detail: 'User not found' }, 404);
    }

    // ── REFERRALS APIS ──
    if (pathname === '/api/referrals/my' && method === 'GET') {
      const user = getCurrentUser();
      const users = getStorage('ds_users', []);
      const referred = users.filter((u: any) => u.referrerId === user?.id);
      
      return jsonResponse({
        referralCode: user?.referral || 'NONE',
        totalReferredCount: referred.length,
        totalEarningAmount: referred.length * 50.0,
        referredUsers: referred.map((u: any) => ({
          name: u.name,
          joined: u.joined,
          status: 'Bonus Credited'
        }))
      });
    }

    // ── ANNOUNCEMENTS APIS ──
    if (pathname === '/api/announcements' && method === 'GET') {
      const activeOnly = searchParams.get('active_only') === 'true';
      const ann = getStorage('ds_announcements', []);
      return jsonResponse(activeOnly ? ann.filter((a: any) => a.active) : ann);
    }

    // ── AUDIT LOGS APIS ──
    if (pathname === '/api/audit-logs' && method === 'GET') {
      return jsonResponse(getStorage('ds_audit_logs', []));
    }

    // ── HEALTH CHECK APIS ──
    if (pathname === '/api/health' && method === 'GET') {
      return jsonResponse({ status: 'ok', timestamp: new Date().toISOString(), version: '2.0.0-mock' });
    }
    if (pathname === '/api/health/full' && method === 'GET') {
      return jsonResponse({
        status: 'green',
        checks: {
          database: { status: 'ok', latency_ms: 1 },
          redis: { status: 'ok', latency_ms: 1 },
          storage: { status: 'ok', usage_pct: 35 }
        },
        system: {
          cpu_usage_pct: 15,
          memory_usage_pct: 42,
          uptime_seconds: 86400
        }
      });
    }

    // ── STATS & ANALYTICS APIS ──
    if (pathname === '/api/stats' && method === 'GET') {
      const orders = getStorage('ds_orders', []);
      const users = getStorage('ds_users', []);
      const refunds = getStorage('ds_refunds', []);
      const deals = getStorage('ds_deals', []);
      const tickets = getStorage('ds_tickets', []);
      const withdrawals = getStorage('ds_withdrawals', []);

      const totalUsers = users.filter((u: any) => u.role === 'buyer').length;
      const totalOrders = orders.length;
      const totalRefunds = refunds.length;
      const pendingRefunds = refunds.filter((r: any) => r.status === 'pending').length;
      const paidOrders = orders.filter((o: any) => o.currentStatus === 'paid').length;
      const activeDeals = deals.filter((d: any) => d.active).length;
      const openTickets = tickets.filter((t: any) => t.status === 'open').length;
      const pendingWithdrawals = withdrawals.filter((w: any) => w.status === 'pending').length;

      let totalRevenue = 0.0;
      let totalPayout = 0.0;
      orders.forEach((o: any) => {
        totalRevenue += o.productPrice;
        if (o.currentStatus === 'paid') {
          totalPayout += o.netAmount;
        }
      });

      const platforms = orders.reduce((acc: any, curr: any) => {
        acc[curr.platform] = (acc[curr.platform] || 0) + 1;
        return acc;
      }, {});

      return jsonResponse({
        totalOrders,
        totalBuyers: totalUsers,
        totalRefunds,
        pendingRefunds,
        paidOrders,
        totalPayout: Math.round(totalPayout * 100) / 100,
        activeDeals,
        openTickets,
        pendingWithdrawals,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        platformBreakdown: platforms
      });
    }

    if (pathname === '/api/analytics/summary' && method === 'GET') {
      const orders = getStorage('ds_orders', []);
      const users = getStorage('ds_users', []);
      const refunds = getStorage('ds_refunds', []);
      const deals = getStorage('ds_deals', []);
      const tickets = getStorage('ds_tickets', []);
      const withdrawals = getStorage('ds_withdrawals', []);

      const totalOrders = orders.length;
      const paidOrders = orders.filter((o: any) => o.currentStatus === 'paid').length;
      const pendingOrders = orders.filter((o: any) => o.currentStatus === 'pending_review' || o.currentStatus === 'under_review').length;

      const activeBuyers = users.filter((u: any) => u.role === 'buyer' && u.status === 'active').length;
      const activeDeals = deals.filter((d: any) => d.active).length;
      const openTickets = tickets.filter((t: any) => t.status === 'open').length;

      let totalCashbackPaid = 0.0;
      orders.forEach((o: any) => {
        if (o.currentStatus === 'paid') {
          totalCashbackPaid += o.netAmount;
        }
      });

      let totalWithdrawals = 0.0;
      withdrawals.forEach((w: any) => {
        if (w.status === 'approved' || w.status === 'processed') {
          totalWithdrawals += w.amount;
        }
      });

      return jsonResponse({
        totalOrders,
        paidOrders,
        pendingOrders,
        totalCashbackPaid: Math.round(totalCashbackPaid * 100) / 100,
        totalWithdrawals: Math.round(totalWithdrawals * 100) / 100,
        activeBuyers,
        activeDeals,
        openTickets
      });
    }

    if (pathname === '/api/analytics/revenue' && method === 'GET') {
      const days = parseInt(searchParams.get('days') || '14');
      const orders = getStorage('ds_orders', []);
      const data = [];
      let totalRevenue = 0.0;
      let totalCashback = 0.0;

      const today = new Date();
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];

        const dayOrders = orders.filter((o: any) => o.orderDate === dateStr);
        const dayRevenue = dayOrders.reduce((acc: number, curr: any) => acc + curr.productPrice, 0);
        const dayCashback = dayOrders.reduce((acc: number, curr: any) => acc + curr.cashbackAmount, 0);

        data.push({
          date: dateStr,
          orders: dayOrders.length,
          revenue: Math.round(dayRevenue * 100) / 100,
          cashback: Math.round(dayCashback * 100) / 100
        });

        totalRevenue += dayRevenue;
        totalCashback += dayCashback;
      }

      // Calculate growth: compare last 7 days vs prior 7 days
      const last7 = data.slice(-7).reduce((acc: number, curr: any) => acc + curr.revenue, 0);
      const prior7 = data.length >= 14 
        ? data.slice(-14, -7).reduce((acc: number, curr: any) => acc + curr.revenue, 0)
        : last7;
      const growthPct = prior7 > 0 ? Math.round(((last7 - prior7) / prior7) * 1000) / 10 : 0.0;

      return jsonResponse({
        data,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalCashback: Math.round(totalCashback * 100) / 100,
        growthPct
      });
    }

    if (pathname === '/api/analytics/deals' && method === 'GET') {
      const deals = getStorage('ds_deals', []);
      const orders = getStorage('ds_orders', []);
      
      const result = deals.map((d: any) => {
        const ordersForDeal = orders.filter((o: any) => o.productCode === d.productCode);
        const paidForDeal = ordersForDeal.filter((o: any) => o.currentStatus === 'paid');
        
        return {
          dealId: d.id,
          productName: d.productName,
          platform: d.platform,
          totalOrders: ordersForDeal.length,
          paidOrders: paidForDeal.length,
          slotsRemaining: d.slots,
          cashback: d.cashback,
          active: d.active
        };
      });
      return jsonResponse(result);
    }

    // Default Fallback
    return jsonResponse({ detail: `Route ${method} ${path} not implemented.` }, 501);
  };

  const originalFetch = window.fetch;
  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    
    // Check if it is a local API request
    if (url.startsWith('/api/') || url.includes('/api/')) {
      const apiPath = url.substring(url.indexOf('/api/'));
      try {
        const response = await handleMockApi(apiPath, init);
        return response;
      } catch (err: any) {
        console.error('Mock API Error:', err);
        return new Response(JSON.stringify({ success: false, detail: err.message || 'Internal Server Error' }), {
          status: err.status || 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    return originalFetch(input, init);
  };
}
