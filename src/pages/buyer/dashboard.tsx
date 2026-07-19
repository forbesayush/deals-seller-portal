import React, { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import { useAuth } from '@/hooks/useAuth';
import { useWallet } from '@/hooks/useWallet';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { DealCard } from '@/components/DealCard';
import {
  Wallet, ShoppingBag, TrendingUp, Gift, Ticket, Bell,
  ArrowDownToLine, User, Star, Plus, Search, Filter,
  ChevronRight, Check, X, Loader2, AlertCircle, Copy,
  Clock, CheckCircle2, XCircle, RefreshCw, Send, ExternalLink,
  Tag, Megaphone, CreditCard, BarChart3, MessageCircle, Sparkles
} from 'lucide-react';

type BuyerTab = 'deals' | 'orders' | 'wallet' | 'withdraw' | 'tickets' | 'referral' | 'profile' | 'announcements';

function formatINR(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    paid: 'badge-emerald', order_filled: 'badge-blue', under_review: 'badge-amber',
    pending_review: 'badge-slate', cancelled: 'badge-rose', approved: 'badge-emerald',
    pending: 'badge-amber', rejected: 'badge-rose', open: 'badge-blue',
    resolved: 'badge-emerald', closed: 'badge-slate', in_progress: 'badge-amber',
  };
  const labels: Record<string, string> = {
    pending_review: 'Pending', order_filled: 'Order Filled', under_review: 'Under Review',
    paid: 'Paid', cancelled: 'Cancelled', approved: 'Approved', rejected: 'Rejected',
    open: 'Open', resolved: 'Resolved', in_progress: 'In Progress',
  };
  return (
    <span className={`badge ${map[status] || 'badge-slate'} text-[10px]`}>
      {labels[status] || status}
    </span>
  );
}

function WalletCard({ wallet }: { wallet: any }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {[
        { label: 'Pending', value: wallet?.pendingCashback || 0, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/30' },
        { label: 'Approved', value: wallet?.approvedCashback || 0, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/30' },
        { label: 'Withdrawable', value: wallet?.withdrawableCashback || 0, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
        { label: 'Refund Balance', value: wallet?.refundBalance || 0, color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-950/30' },
        { label: 'Total Earned', value: wallet?.lifetimeEarned || 0, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-950/30' },
      ].map(item => (
        <div key={item.label} className={`rounded-2xl p-4 ${item.bg} animate-fade-up`}>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{item.label}</p>
          <p className={`text-xl font-extrabold mt-1 ${item.color}`}>{formatINR(item.value)}</p>
        </div>
      ))}
    </div>
  );
}

export default function BuyerDashboard() {
  const { user, logout } = useAuth();
  const { wallet, fetchWallet } = useWallet();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState<BuyerTab>('deals');

  // Deals state (Feature 1)
  const [deals, setDeals] = useState<any[]>([]);
  const [dealsLoading, setDealsLoading] = useState(true);
  const [dealSearch, setDealSearch] = useState('');
  const [dealPlatform, setDealPlatform] = useState('All');
  const [dealCategory, setDealCategory] = useState('All');
  const [selectedDeal, setSelectedDeal] = useState<any>(null); // Feature 2: Deal Detail Modal

  // Orders state (Feature 3)
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderSearch, setOrderSearch] = useState('');

  // Wallet & Transactions (Feature 4 & 5)
  const [transactions, setTransactions] = useState<any[]>([]);
  const [txnLoading, setTxnLoading] = useState(false);

  // Withdrawal (Feature 6)
  const [withdrawUpi, setWithdrawUpi] = useState(user?.upi || '');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawMsg, setWithdrawMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [myWithdrawals, setMyWithdrawals] = useState<any[]>([]);

  // Tickets (Feature 7)
  const [tickets, setTickets] = useState<any[]>([]);
  const [ticketTitle, setTicketTitle] = useState('');
  const [ticketDesc, setTicketDesc] = useState('');
  const [ticketCategory, setTicketCategory] = useState('general');
  const [ticketLoading, setTicketLoading] = useState(false);
  const [ticketMsg, setTicketMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Profile (Feature 8)
  const [editProfile, setEditProfile] = useState(false);
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profileUpi, setProfileUpi] = useState(user?.upi || '');
  const [profileBio, setProfileBio] = useState(user?.bio || '');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Referral (Feature 9)
  const [referralStats, setReferralStats] = useState<any>(null);
  const [referralCopied, setReferralCopied] = useState(false);

  // Announcements (Feature 10)
  const [announcements, setAnnouncements] = useState<any[]>([]);

  // Order submission (Feature 3 - wizard)
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [orderNo, setOrderNo] = useState('');
  const [orderAmount, setOrderAmount] = useState('');
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderMsg, setOrderMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const toggleDark = () => {
    const isDark = !darkMode;
    setDarkMode(isDark);
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  };

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') { setDarkMode(true); document.documentElement.classList.add('dark'); }
    fetchDeals();
    fetchWallet();
    fetchAnnouncements();
    fetchOrders();
    fetchTransactions();
    fetchWithdrawals();
    fetchTickets();
    fetchReferral();
  }, []);

  const fetchDeals = async () => {
    setDealsLoading(true);
    try {
      let url = '/api/deals?';
      if (dealSearch) url += `q=${encodeURIComponent(dealSearch)}&`;
      if (dealPlatform !== 'All') url += `platform=${encodeURIComponent(dealPlatform)}&`;
      if (dealCategory !== 'All') url += `category=${encodeURIComponent(dealCategory)}&`;
      const res = await fetch(url);
      if (res.ok) setDeals(await res.json());
    } catch { /* silent */ } finally { setDealsLoading(false); }
  };

  useEffect(() => { fetchDeals(); }, [dealSearch, dealPlatform, dealCategory]);

  const fetchOrders = async () => {
    setOrdersLoading(true);
    try {
      const res = await fetch('/api/orders');
      if (res.ok) setOrders(await res.json());
    } catch { /* silent */ } finally { setOrdersLoading(false); }
  };

  const fetchTransactions = async () => {
    setTxnLoading(true);
    try {
      const res = await fetch('/api/wallet/transactions');
      if (res.ok) setTransactions(await res.json());
    } catch { /* silent */ } finally { setTxnLoading(false); }
  };

  const fetchWithdrawals = async () => {
    try {
      const res = await fetch('/api/withdrawals');
      if (res.ok) setMyWithdrawals(await res.json());
    } catch { /* silent */ }
  };

  const fetchTickets = async () => {
    try {
      const res = await fetch('/api/tickets');
      if (res.ok) setTickets(await res.json());
    } catch { /* silent */ }
  };

  const fetchReferral = async () => {
    try {
      const res = await fetch('/api/referrals/my');
      if (res.ok) setReferralStats(await res.json());
    } catch { /* silent */ }
  };

  const fetchAnnouncements = async () => {
    try {
      const res = await fetch('/api/announcements?active_only=true');
      if (res.ok) setAnnouncements(await res.json());
    } catch { /* silent */ }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!withdrawUpi || !withdrawAmount) { setWithdrawMsg({ type: 'error', text: 'Fill all fields' }); return; }
    const amt = parseFloat(withdrawAmount);
    if (isNaN(amt) || amt < 100) { setWithdrawMsg({ type: 'error', text: 'Minimum withdrawal is ₹100' }); return; }
    setWithdrawLoading(true);
    try {
      const res = await fetch('/api/withdrawals', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ upi: withdrawUpi, amount: amt }),
      });
      const data = await res.json();
      if (res.ok) {
        setWithdrawMsg({ type: 'success', text: `Withdrawal of ${formatINR(amt)} requested!` });
        setWithdrawAmount('');
        fetchWithdrawals();
        fetchWallet();
      } else {
        setWithdrawMsg({ type: 'error', text: data.detail || 'Failed' });
      }
    } catch { setWithdrawMsg({ type: 'error', text: 'Error submitting request' }); }
    finally { setWithdrawLoading(false); }
  };

  const handleTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketTitle || !ticketDesc) { setTicketMsg({ type: 'error', text: 'Fill all required fields' }); return; }
    setTicketLoading(true);
    try {
      const res = await fetch('/api/tickets', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: ticketTitle, description: ticketDesc, category: ticketCategory }),
      });
      if (res.ok) {
        setTicketMsg({ type: 'success', text: 'Ticket submitted! We will get back to you soon.' });
        setTicketTitle(''); setTicketDesc('');
        fetchTickets();
      } else {
        const d = await res.json();
        setTicketMsg({ type: 'error', text: d.detail || 'Failed' });
      }
    } catch { setTicketMsg({ type: 'error', text: 'Network error' }); }
    finally { setTicketLoading(false); }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    try {
      const res = await fetch('/api/users/profile', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: profileName, upi: profileUpi, bio: profileBio }),
      });
      if (res.ok) {
        setProfileMsg({ type: 'success', text: 'Profile updated!' });
        setEditProfile(false);
      } else {
        const d = await res.json();
        setProfileMsg({ type: 'error', text: d.detail || 'Failed' });
      }
    } catch { setProfileMsg({ type: 'error', text: 'Network error' }); }
    finally { setProfileLoading(false); }
  };

  const handleCopyReferral = () => {
    navigator.clipboard.writeText(referralStats?.referralLink || '');
    setReferralCopied(true);
    setTimeout(() => setReferralCopied(false), 2000);
  };

  const handleClaimDeal = (deal: any) => {
    setSelectedDeal(deal);
    setShowOrderForm(true);
    setActiveTab('orders');
  };

  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDeal || !orderNo || !orderAmount) { setOrderMsg({ type: 'error', text: 'Fill all required fields' }); return; }
    setOrderLoading(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderNo, productCode: selectedDeal.productCode,
          platform: selectedDeal.platform, mediator: 'Self',
          dealType: selectedDeal.dealType || 'cashback',
          orderDate: new Date().toISOString().split('T')[0],
          amount: parseFloat(orderAmount), deduction: 0, screenshot: false,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setOrderMsg({ type: 'success', text: `Order submitted! Code: ${data.orderCode}` });
        setOrderNo(''); setOrderAmount(''); setSelectedDeal(null); setShowOrderForm(false);
        fetchOrders(); fetchWallet();
      } else {
        setOrderMsg({ type: 'error', text: data.detail || 'Failed' });
      }
    } catch { setOrderMsg({ type: 'error', text: 'Network error' }); }
    finally { setOrderLoading(false); }
  };

  // Chatbot State & Handlers
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'assistant', content: string }[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  useEffect(() => {
    if (user && chatHistory.length === 0) {
      setChatHistory([
        { role: 'assistant', content: `Hi ${user.name}! I'm your Deals Seller AI assistant. How can I help you with your cashback deals or orders today?` }
      ]);
    }
  }, [user, chatHistory.length]);

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const userMsg = chatInput;
    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', content: userMsg }]);
    setChatLoading(true);
    setChatError(null);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg,
          history: chatHistory
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.response) {
          setChatHistory(prev => [...prev, { role: 'assistant', content: data.response }]);
        } else {
          setChatError(data.detail || 'Could not fetch response from assistant.');
        }
      } else {
        const err = await res.json();
        setChatError(err.detail || 'Error communicating with assistant.');
      }
    } catch (err: any) {
      setChatError(err.message || 'Failed to connect to local Ollama assistant.');
    } finally {
      setChatLoading(false);
    }
  };

  const filteredOrders = orders.filter(o =>
    o.orderNo?.toLowerCase().includes(orderSearch.toLowerCase()) ||
    o.productName?.toLowerCase().includes(orderSearch.toLowerCase()) ||
    o.orderCode?.toLowerCase().includes(orderSearch.toLowerCase())
  );

  const platforms = ['All', ...Array.from(new Set(deals.map(d => d.platform)))];
  const categories = ['All', ...Array.from(new Set(deals.map(d => d.category).filter(Boolean)))];
  const featuredDeals = deals.filter(d => d.featured);
  const displayDeals = deals;

  const tabs: { id: BuyerTab; icon: React.ElementType; label: string; count?: number }[] = [
    { id: 'deals', icon: Tag, label: 'Deals', count: deals.length },
    { id: 'orders', icon: ShoppingBag, label: 'Orders', count: orders.length },
    { id: 'wallet', icon: Wallet, label: 'Wallet' },
    { id: 'withdraw', icon: ArrowDownToLine, label: 'Withdraw' },
    { id: 'tickets', icon: Ticket, label: 'Support', count: tickets.filter(t => t.status === 'open').length },
    { id: 'referral', icon: Gift, label: 'Referrals' },
    { id: 'announcements', icon: Bell, label: 'Announce', count: announcements.length },
    { id: 'profile', icon: User, label: 'Profile' },
  ];

  return (
    <>
      <Head>
        <title>My Dashboard — Deals Seller Portal</title>
        <meta name="description" content="Browse live deals, track your orders, manage your wallet, and earn cashback." />
      </Head>

      <div className="min-h-screen flex" style={{ background: 'var(--color-bg)' }}>
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} darkMode={darkMode} />

        <div className="flex-1 flex flex-col min-h-screen transition-all duration-300"
          style={{ marginLeft: sidebarCollapsed ? 72 : 260 }}>
          <Header
            title="Buyer Dashboard"
            darkMode={darkMode}
            onToggleDark={toggleDark}
            sidebarCollapsed={sidebarCollapsed}
          />

          <main className="flex-1 p-6 pt-[88px]">
            {/* Welcome Card */}
            <div className="premium-card card-accent-violet mb-6 p-5 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>Welcome back 👋</p>
                <h2 className="text-2xl font-extrabold mt-0.5">{user?.name}</h2>
                <div className="flex items-center gap-3 mt-2">
                  <span className="badge badge-violet">{user?.vipTier || 'Standard'} Member</span>
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {user?.role === 'buyer' ? 'Buyer Portal' : user?.role}
                  </span>
                </div>
              </div>
              <div className="text-right hidden sm:block">
                <p className="text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>Total Withdrawable</p>
                <p className="text-3xl font-extrabold text-emerald-500">{formatINR(wallet?.withdrawableCashback || 0)}</p>
                <button
                  onClick={() => setActiveTab('withdraw')}
                  className="btn btn-success btn-sm mt-2"
                >
                  <ArrowDownToLine className="w-3 h-3" /> Withdraw
                </button>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex items-center gap-1 overflow-x-auto pb-2 mb-6 scrollbar-thin">
              {tabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all duration-200 ${
                      activeTab === tab.id
                        ? 'bg-brand-600 text-white shadow-md'
                        : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                    {tab.count !== undefined && tab.count > 0 && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                      }`}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* ─── TAB: DEALS (Feature 1 + 2) ─── */}
            {activeTab === 'deals' && (
              <div className="animate-fade-up">
                {/* Featured Deals */}
                {featuredDeals.length > 0 && (
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                      <h3 className="font-extrabold text-sm uppercase tracking-wider">Featured Deals</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {featuredDeals.map(deal => (
                        <DealCard key={deal.id} deal={deal} onClaim={handleClaimDeal} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Search & Filters */}
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text" placeholder="Search deals..."
                      value={dealSearch} onChange={e => setDealSearch(e.target.value)}
                      className="input pl-9 text-sm"
                    />
                  </div>
                  <select value={dealPlatform} onChange={e => setDealPlatform(e.target.value)} className="select text-sm w-auto">
                    {platforms.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <select value={dealCategory} onChange={e => setDealCategory(e.target.value)} className="select text-sm w-auto">
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <button onClick={fetchDeals} className="btn btn-ghost btn-sm">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>

                {/* All Deals Grid */}
                {dealsLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="skeleton rounded-2xl h-64" />
                    ))}
                  </div>
                ) : displayDeals.length === 0 ? (
                  <div className="text-center py-16">
                    <Tag className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                    <p className="font-bold text-slate-400">No deals found</p>
                    <p className="text-sm text-slate-300 dark:text-slate-600 mt-1">Try adjusting your filters</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {displayDeals.map(deal => (
                      <DealCard key={deal.id} deal={deal} onClaim={handleClaimDeal} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ─── TAB: ORDERS (Feature 3) ─── */}
            {activeTab === 'orders' && (
              <div className="animate-fade-up">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-extrabold text-lg">My Orders</h3>
                  <button onClick={() => setShowOrderForm(!showOrderForm)} className="btn btn-primary btn-sm">
                    <Plus className="w-4 h-4" /> New Order
                  </button>
                </div>

                {/* Order Submission Form */}
                {showOrderForm && (
                  <div className="premium-card card-accent-violet p-5 mb-5 animate-fade-up">
                    <h4 className="font-bold mb-4">Submit New Order</h4>
                    {selectedDeal && (
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-brand-50 dark:bg-brand-950/20 mb-4 border border-brand-200 dark:border-brand-900">
                        <Tag className="w-4 h-4 text-brand-600" />
                        <div>
                          <p className="text-sm font-bold">{selectedDeal.productName}</p>
                          <p className="text-xs text-slate-400">{selectedDeal.platform} · Cashback: {formatINR(selectedDeal.cashback)}</p>
                        </div>
                        <button onClick={() => setSelectedDeal(null)} className="ml-auto text-slate-400 hover:text-slate-600">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    <form onSubmit={handleOrderSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="section-label">Order Number *</label>
                        <input value={orderNo} onChange={e => setOrderNo(e.target.value)} placeholder="e.g. 402-1234567-8901234" className="input" required />
                      </div>
                      <div>
                        <label className="section-label">Amount Paid (₹) *</label>
                        <input type="number" value={orderAmount} onChange={e => setOrderAmount(e.target.value)} placeholder="1299" className="input" required />
                      </div>
                      {!selectedDeal && (
                        <div className="sm:col-span-2">
                          <label className="section-label">Select Deal *</label>
                          <select className="select" onChange={e => {
                            const d = deals.find(d => d.id === e.target.value);
                            setSelectedDeal(d || null);
                          }}>
                            <option value="">-- Select a deal --</option>
                            {deals.map(d => <option key={d.id} value={d.id}>{d.productName} ({d.platform})</option>)}
                          </select>
                        </div>
                      )}
                      <div className="sm:col-span-2">
                        {orderMsg && (
                          <div className={`p-3 rounded-xl text-sm mb-3 ${orderMsg.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600' : 'bg-rose-50 dark:bg-rose-950/30 text-rose-600'}`}>
                            {orderMsg.text}
                          </div>
                        )}
                        <div className="flex gap-2">
                          <button type="submit" disabled={orderLoading} className="btn btn-primary flex-1">
                            {orderLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : <><Send className="w-4 h-4" /> Submit Order</>}
                          </button>
                          <button type="button" onClick={() => { setShowOrderForm(false); setSelectedDeal(null); setOrderMsg(null); }} className="btn btn-ghost">Cancel</button>
                        </div>
                      </div>
                    </form>
                  </div>
                )}

                {/* Orders Search */}
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text" placeholder="Search orders by number, product, code..."
                    value={orderSearch} onChange={e => setOrderSearch(e.target.value)}
                    className="input pl-9"
                  />
                </div>

                {/* Orders Table */}
                <div className="premium-card overflow-hidden">
                  {ordersLoading ? (
                    <div className="p-6 space-y-3">
                      {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-12 rounded-xl" />)}
                    </div>
                  ) : filteredOrders.length === 0 ? (
                    <div className="text-center py-12">
                      <ShoppingBag className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                      <p className="font-bold text-slate-400">No orders yet</p>
                      <button onClick={() => { setActiveTab('deals'); }} className="btn btn-primary btn-sm mt-3">Browse Deals</button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Order No</th>
                            <th>Product</th>
                            <th>Amount</th>
                            <th>Cashback</th>
                            <th>Status</th>
                            <th>Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredOrders.map(order => (
                            <tr key={order.id}>
                              <td>
                                <div>
                                  <p className="font-mono text-xs font-bold">{order.orderNo}</p>
                                  <p className="text-[10px] text-slate-400">{order.orderCode}</p>
                                </div>
                              </td>
                              <td>
                                <p className="text-sm font-semibold line-clamp-1">{order.productName}</p>
                                <p className="text-xs text-slate-400">{order.platform}</p>
                              </td>
                              <td className="font-bold text-sm">{formatINR(order.productPrice)}</td>
                              <td className="font-bold text-sm text-emerald-600">{formatINR(order.cashbackAmount)}</td>
                              <td><StatusBadge status={order.currentStatus} /></td>
                              <td className="text-xs text-slate-400">{order.orderDate}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ─── TAB: WALLET (Feature 4 + 5) ─── */}
            {activeTab === 'wallet' && (
              <div className="animate-fade-up space-y-6">
                <WalletCard wallet={wallet} />

                <div className="premium-card card-accent-emerald overflow-hidden">
                  <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-border)' }}>
                    <h3 className="font-extrabold">Transaction History</h3>
                    <button onClick={() => window.open('/api/wallet/statement.csv')} className="btn btn-ghost btn-sm">
                      Export CSV
                    </button>
                  </div>
                  {txnLoading ? (
                    <div className="p-4 space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-12 rounded-xl" />)}</div>
                  ) : transactions.length === 0 ? (
                    <div className="text-center py-10">
                      <BarChart3 className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                      <p className="font-bold text-slate-400">No transactions yet</p>
                    </div>
                  ) : (
                    <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                      {transactions.map(txn => (
                        <div key={txn.id} className="flex items-center gap-4 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${txn.type === 'credit' ? 'bg-emerald-100 dark:bg-emerald-950/30' : 'bg-rose-100 dark:bg-rose-950/30'}`}>
                            {txn.type === 'credit'
                              ? <TrendingUp className="w-4 h-4 text-emerald-600" />
                              : <ArrowDownToLine className="w-4 h-4 text-rose-500" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">{txn.description || txn.category}</p>
                            <p className="text-xs text-slate-400">{txn.timestamp?.slice(0, 16)?.replace('T', ' ')}</p>
                          </div>
                          <div className="text-right">
                            <p className={`font-extrabold text-sm ${txn.type === 'credit' ? 'text-emerald-600' : 'text-rose-500'}`}>
                              {txn.type === 'credit' ? '+' : '-'}{formatINR(txn.amount)}
                            </p>
                            <StatusBadge status={txn.status} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ─── TAB: WITHDRAW (Feature 6) ─── */}
            {activeTab === 'withdraw' && (
              <div className="animate-fade-up grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="premium-card card-accent-emerald p-5">
                  <h3 className="font-extrabold mb-1">Request Withdrawal</h3>
                  <p className="text-sm mb-5" style={{ color: 'var(--color-text-muted)' }}>
                    Available: <span className="font-bold text-emerald-600">{formatINR(wallet?.withdrawableCashback || 0)}</span>
                  </p>
                  {withdrawMsg && (
                    <div className={`p-3 rounded-xl text-sm mb-4 ${withdrawMsg.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600' : 'bg-rose-50 dark:bg-rose-950/30 text-rose-600'}`}>
                      {withdrawMsg.text}
                    </div>
                  )}
                  <form onSubmit={handleWithdraw} className="space-y-4">
                    <div>
                      <label className="section-label">UPI ID *</label>
                      <input value={withdrawUpi} onChange={e => setWithdrawUpi(e.target.value)} placeholder="yourname@upi" className="input" required />
                    </div>
                    <div>
                      <label className="section-label">Amount (₹) *</label>
                      <input type="number" min="100" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} placeholder="Min ₹100" className="input" required />
                    </div>
                    <button type="submit" disabled={withdrawLoading} className="btn btn-success w-full">
                      {withdrawLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</> : <><Send className="w-4 h-4" /> Submit Request</>}
                    </button>
                  </form>
                </div>

                <div className="premium-card overflow-hidden">
                  <div className="p-4 border-b font-extrabold" style={{ borderColor: 'var(--color-border)' }}>Withdrawal History</div>
                  {myWithdrawals.length === 0 ? (
                    <div className="text-center py-10">
                      <CreditCard className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                      <p className="font-bold text-slate-400">No withdrawals yet</p>
                    </div>
                  ) : (
                    <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                      {myWithdrawals.map(w => (
                        <div key={w.id} className="flex items-center gap-3 px-4 py-3">
                          <div>
                            <p className="text-sm font-bold">{formatINR(w.amount)}</p>
                            <p className="text-xs text-slate-400">{w.upi}</p>
                          </div>
                          <div className="ml-auto text-right">
                            <StatusBadge status={w.status} />
                            <p className="text-[10px] text-slate-400 mt-1">{w.createdAt?.slice(0, 10)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ─── TAB: TICKETS (Feature 7) ─── */}
            {activeTab === 'tickets' && (
              <div className="animate-fade-up grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="premium-card card-accent-violet p-5">
                  <h3 className="font-extrabold mb-1">New Support Ticket</h3>
                  <p className="text-sm mb-5" style={{ color: 'var(--color-text-muted)' }}>We typically respond within 24 hours.</p>
                  {ticketMsg && (
                    <div className={`p-3 rounded-xl text-sm mb-4 ${ticketMsg.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600' : 'bg-rose-50 dark:bg-rose-950/30 text-rose-600'}`}>
                      {ticketMsg.text}
                    </div>
                  )}
                  <form onSubmit={handleTicket} className="space-y-4">
                    <div>
                      <label className="section-label">Category</label>
                      <select value={ticketCategory} onChange={e => setTicketCategory(e.target.value)} className="select">
                        <option value="general">General</option>
                        <option value="payout">Payout Issue</option>
                        <option value="cashback">Cashback Query</option>
                        <option value="order">Order Problem</option>
                        <option value="account">Account Issue</option>
                      </select>
                    </div>
                    <div>
                      <label className="section-label">Subject *</label>
                      <input value={ticketTitle} onChange={e => setTicketTitle(e.target.value)} placeholder="Brief description of your issue" className="input" required />
                    </div>
                    <div>
                      <label className="section-label">Details *</label>
                      <textarea value={ticketDesc} onChange={e => setTicketDesc(e.target.value)} placeholder="Describe your issue in detail..." rows={4} className="input resize-none" required />
                    </div>
                    <button type="submit" disabled={ticketLoading} className="btn btn-primary w-full">
                      {ticketLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : <><Send className="w-4 h-4" /> Submit Ticket</>}
                    </button>
                  </form>
                </div>

                <div className="premium-card overflow-hidden">
                  <div className="p-4 border-b font-extrabold" style={{ borderColor: 'var(--color-border)' }}>My Tickets</div>
                  {tickets.length === 0 ? (
                    <div className="text-center py-10">
                      <Ticket className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                      <p className="font-bold text-slate-400">No tickets raised yet</p>
                    </div>
                  ) : (
                    <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                      {tickets.map(t => (
                        <div key={t.id} className="px-4 py-3">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-bold">{t.title}</p>
                            <StatusBadge status={t.status} />
                          </div>
                          <p className="text-xs text-slate-400 mt-1 line-clamp-2">{t.description}</p>
                          {t.reply && (
                            <div className="mt-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800 text-xs">
                              <span className="font-bold text-brand-600">Admin reply: </span>{t.reply}
                            </div>
                          )}
                          <p className="text-[10px] text-slate-300 dark:text-slate-600 mt-1">{t.createdAt?.slice(0, 10)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ─── TAB: REFERRAL (Feature 9) ─── */}
            {activeTab === 'referral' && (
              <div className="animate-fade-up">
                <div className="premium-card card-accent-violet p-6 mb-6 text-center">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center mx-auto mb-4 shadow-glow-violet">
                    <Gift className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-extrabold mb-2">Earn ₹50 per referral!</h3>
                  <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
                    Share your unique link and earn ₹50 cashback for every friend who joins.
                  </p>

                  <div className="flex items-center gap-2 max-w-md mx-auto mb-6">
                    <input
                      readOnly
                      value={referralStats?.referralLink || `Loading...`}
                      className="input text-sm font-mono flex-1"
                    />
                    <button
                      onClick={handleCopyReferral}
                      className={`btn btn-sm ${referralCopied ? 'btn-success' : 'btn-primary'}`}
                    >
                      {referralCopied ? <><Check className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy</>}
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto">
                    {[
                      { val: referralStats?.totalReferrals || 0, label: 'Referrals' },
                      { val: `₹${referralStats?.totalEarned || 0}`, label: 'Total Earned' },
                      { val: user?.referral || '—', label: 'Your Code' },
                    ].map(s => (
                      <div key={s.label} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                        <p className="text-xl font-extrabold text-brand-600 dark:text-violet-400">{s.val}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ─── TAB: ANNOUNCEMENTS (Feature 10) ─── */}
            {activeTab === 'announcements' && (
              <div className="animate-fade-up space-y-4">
                {announcements.length === 0 ? (
                  <div className="text-center py-16">
                    <Megaphone className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                    <p className="font-bold text-slate-400">No announcements right now</p>
                  </div>
                ) : announcements.map(ann => {
                  const colors: Record<string, string> = {
                    urgent: 'card-accent-rose border-l-4 border-l-rose-400',
                    info: 'card-accent-navy border-l-4 border-l-blue-400',
                    normal: 'card-accent-violet',
                  };
                  return (
                    <div key={ann.id} className={`premium-card p-5 ${colors[ann.priority] || colors.normal}`}>
                      <div className="flex items-center gap-2 mb-2">
                        {ann.priority === 'urgent' && <span className="badge badge-rose">🔴 Urgent</span>}
                        {ann.priority === 'info' && <span className="badge badge-blue">ℹ️ Info</span>}
                        {ann.priority === 'normal' && <span className="badge badge-violet">📢 Announcement</span>}
                        <span className="text-xs text-slate-400 ml-auto">{ann.createdAt?.slice(0, 10)}</span>
                      </div>
                      <h4 className="font-extrabold text-base mb-1">{ann.title}</h4>
                      <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{ann.body}</p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ─── TAB: PROFILE (Feature 8) ─── */}
            {activeTab === 'profile' && (
              <div className="animate-fade-up max-w-lg">
                <div className="premium-card card-accent-violet p-6">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white text-2xl font-extrabold shadow-glow-violet">
                      {user?.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-xl font-extrabold">{user?.name}</h3>
                      <p className="text-sm text-slate-400">{user?.email}</p>
                      <div className="flex gap-2 mt-1">
                        <span className="badge badge-violet">{user?.vipTier || 'Standard'}</span>
                        <span className="badge badge-emerald">{user?.kycStatus || 'Pending'} KYC</span>
                      </div>
                    </div>
                  </div>

                  {profileMsg && (
                    <div className={`p-3 rounded-xl text-sm mb-4 ${profileMsg.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600' : 'bg-rose-50 dark:bg-rose-950/30 text-rose-600'}`}>
                      {profileMsg.text}
                    </div>
                  )}

                  <form onSubmit={handleSaveProfile} className="space-y-4">
                    <div>
                      <label className="section-label">Full Name</label>
                      <input value={profileName} onChange={e => setProfileName(e.target.value)} className="input" />
                    </div>
                    <div>
                      <label className="section-label">UPI ID</label>
                      <input value={profileUpi} onChange={e => setProfileUpi(e.target.value)} placeholder="yourname@upi" className="input" />
                    </div>
                    <div>
                      <label className="section-label">Bio</label>
                      <textarea value={profileBio} onChange={e => setProfileBio(e.target.value)} placeholder="Tell us about yourself" rows={3} className="input resize-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                        <p className="section-label mb-1">Mobile</p>
                        <p className="font-semibold">{user?.mobile || 'Not set'}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                        <p className="section-label mb-1">Member Since</p>
                        <p className="font-semibold">{user?.joined}</p>
                      </div>
                    </div>
                    <button type="submit" disabled={profileLoading} className="btn btn-primary w-full">
                      {profileLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : 'Save Profile'}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Deal Detail Modal (Feature 2) */}
      {selectedDeal && !showOrderForm && (
        <div className="modal-backdrop" onClick={() => setSelectedDeal(null)}>
          <div className="modal-content p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-extrabold text-lg">Deal Details</h3>
              <button onClick={() => setSelectedDeal(null)} className="btn btn-ghost btn-sm"><X className="w-4 h-4" /></button>
            </div>
            <DealCard deal={selectedDeal} onClaim={handleClaimDeal} />
            {selectedDeal.description && (
              <div className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800">
                <p className="section-label">Description</p>
                <p className="text-sm mt-1">{selectedDeal.description}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating AI Chatbot Widget */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        {chatOpen && (
          <div className="w-80 sm:w-96 h-[450px] mb-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 transform scale-100 origin-bottom-right">
            {/* Chatbot Header */}
            <div className="bg-gradient-to-r from-brand-600 to-indigo-650 dark:from-violet-700 dark:to-indigo-900 text-white px-4 py-3.5 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-300 fill-amber-300 animate-pulse" />
                <div>
                  <h4 className="font-extrabold text-xs leading-none">Deals Assistant</h4>
                  <span className="text-[10px] text-brand-100 flex items-center gap-1 mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Online · Local Ollama
                  </span>
                </div>
              </div>
              <button onClick={() => setChatOpen(false)} className="text-white/80 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Chatbot Messages */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 max-h-[340px]">
              {chatHistory.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs shadow-sm whitespace-pre-wrap leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-brand-600 text-white rounded-tr-none'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none border border-slate-150 dark:border-slate-850'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-2xl rounded-tl-none px-4 py-3 text-xs border border-slate-150 dark:border-slate-850 flex items-center gap-1.5">
                    <Loader2 className="w-3 h-3 animate-spin text-brand-500" /> Thinking...
                  </div>
                </div>
              )}

              {chatError && (
                <div className="p-2.5 text-rose-500 bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-900/30 rounded-xl text-[11px] leading-tight font-semibold">
                  {chatError}
                </div>
              )}
            </div>

            {/* Chatbot Input */}
            <form onSubmit={handleSendChatMessage} className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="Ask me about your cashback or deals..."
                className="flex-1 input px-3 py-2 text-xs rounded-xl"
                disabled={chatLoading}
              />
              <button
                type="submit"
                disabled={chatLoading || !chatInput.trim()}
                className="btn btn-primary rounded-xl px-3 flex items-center justify-center shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        )}

        {/* Floating Bubble Button */}
        <button
          onClick={() => setChatOpen(!chatOpen)}
          className="w-14 h-14 rounded-full bg-gradient-to-tr from-brand-600 to-indigo-650 dark:from-violet-600 dark:to-indigo-750 text-white shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-200 border border-brand-400/20"
        >
          {chatOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <MessageCircle className="w-6 h-6" />
          )}
        </button>
      </div>
    </>
  );
}
