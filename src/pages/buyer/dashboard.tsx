import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useAuth } from '@/hooks/useAuth';
import { useWallet } from '@/hooks/useWallet';
import { 
  CreditCard, History, Send, ShieldAlert, LogOut, Sun, Moon, 
  DollarSign, Search, Clock, CheckCircle2, AlertCircle, XCircle, Loader2
} from 'lucide-react';

interface Order {
  id: string;
  orderNo: string;
  orderCode: string;
  trackingNumber: string | null;
  productName: string;
  productPrice: number;
  quantity: number;
  buyerId: string;
  cashbackPct: number;
  cashbackAmount: number;
  processingFee: number;
  deductionAmount: number;
  netAmount: number;
  refundStatus: string | null;
  approvalStatus: string;
  currentStatus: string;
  orderDate: string;
  submittedDate: string | null;
  paidDate: string | null;
  screenshot: boolean;
}

export default function BuyerDashboard() {
  const { user, logout } = useAuth();
  const { wallet, transactions, fetchWallet, fetchTransactions } = useWallet();
  const [darkMode, setDarkMode] = useState(false);
  
  // Tab control
  const [activeTab, setActiveTab] = useState<'orders' | 'transactions'>('orders');

  // Submit new order form states
  const [orderNo, setOrderNo] = useState('');
  const [productCode, setProductCode] = useState('AMZ001');
  const [amount, setAmount] = useState('');
  const [orderSuccess, setOrderSuccess] = useState('');
  const [orderError, setOrderError] = useState('');
  const [orderLoading, setOrderLoading] = useState(false);

  // Buyer orders list states
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [orderSearchQuery, setOrderSearchQuery] = useState('');

  // Live Deals catalog state
  const [deals, setDeals] = useState<any[]>([]);
  const [loadingDeals, setLoadingDeals] = useState(true);

  // Profile Edit modal states
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profileEmail, setProfileEmail] = useState(user?.email || '');
  const [profileMobile, setProfileMobile] = useState(user?.mobile || '');
  const [profileUpi, setProfileUpi] = useState(user?.upi || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Withdraw requests modal states
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [withdrawUpi, setWithdrawUpi] = useState(user?.upi || '');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawMsg, setWithdrawMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [withdrawList, setWithdrawList] = useState<any[]>([]);

  // Deals catalog search & filter states
  const [dealSearchQuery, setDealSearchQuery] = useState('');
  const [dealCategoryFilter, setDealCategoryFilter] = useState('All');

  // Notifications dropdown states
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  const fetchDeals = async () => {
    setLoadingDeals(true);
    try {
      const res = await fetch('/api/deals');
      const data = await res.json();
      if (res.ok) {
        setDeals(data);
        if (data.length > 0) {
          setProductCode(data[0].productCode);
        }
      }
    } catch (e) {
      console.error("Failed to load deals catalog", e);
    } finally {
      setLoadingDeals(false);
    }
  };

  const fetchOrders = async () => {
    setOrdersLoading(true);
    try {
      const res = await fetch('/api/orders');
      const data = await res.json();
      if (res.ok) {
        setOrders(data);
      }
    } catch (e) {
      console.error("Failed to load user orders list", e);
    } finally {
      setOrdersLoading(false);
    }
  };

  const fetchWithdrawals = async () => {
    try {
      const res = await fetch('/api/withdrawals');
      const data = await res.json();
      if (res.ok) {
        setWithdrawList(data);
      }
    } catch (e) {
      console.error("Failed to load withdrawals list", e);
    }
  };

  const loadNotifications = () => {
    const list: any[] = [];
    orders.forEach(o => {
      if (o.currentStatus === 'paid') {
        list.push({ id: `paid-${o.id}`, text: `Order #${o.orderNo} has been marked as Paid!`, date: o.paidDate || 'recently' });
      } else if (o.currentStatus === 'cancelled') {
        list.push({ id: `cancel-${o.id}`, text: `Order #${o.orderNo} was cancelled.`, date: 'recently' });
      } else if (o.currentStatus === 'under_review') {
        list.push({ id: `review-${o.id}`, text: `Order #${o.orderNo} is under review.`, date: 'recently' });
      }
      if (o.refundStatus === 'approved') {
        list.push({ id: `ref-app-${o.id}`, text: `Refund for Order #${o.orderNo} approved.`, date: 'recently' });
      } else if (o.refundStatus === 'rejected') {
        list.push({ id: `ref-rej-${o.id}`, text: `Refund for Order #${o.orderNo} was rejected.`, date: 'recently' });
      }
    });
    setNotifications(list.slice(0, 5));
  };

  useEffect(() => {
    fetchWallet();
    fetchTransactions();
    fetchOrders();
    fetchDeals();
    fetchWithdrawals();
    setDarkMode(document.documentElement.classList.contains('dark'));
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [orders]);

  useEffect(() => {
    if (user) {
      setProfileName(user.name || '');
      setProfileEmail(user.email || '');
      setProfileMobile(user.mobile || '');
      setProfileUpi(user.upi || '');
      setWithdrawUpi(user.upi || '');
    }
  }, [user]);

  // Refund request modal states
  const [requestingRefundOrder, setRequestingRefundOrder] = useState<Order | null>(null);
  const [refundReason, setRefundReason] = useState('Delayed Cashback Credit');
  const [refundDescription, setRefundDescription] = useState('');
  const [refundUpi, setRefundUpi] = useState('');
  const [refundLoading, setRefundLoading] = useState(false);
  const [refundMsg, setRefundMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNo || !amount) {
      setOrderError('Please fill in Order No and Amount');
      return;
    }
    setOrderError('');
    setOrderSuccess('');
    setOrderLoading(true);

    // Auto-detect platform based on catalog prefix or list
    const selectedDeal = deals.find(d => d.productCode === productCode);
    const detectedPlatform = selectedDeal ? selectedDeal.platform : (productCode.startsWith('FLK') ? 'Flipkart' : (productCode.startsWith('BLK') ? 'Blinkit' : 'Amazon'));

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderNo,
          productCode,
          platform: detectedPlatform,
          mediator: 'Direct',
          dealType: 'Review',
          orderDate: new Date().toISOString().split('T')[0],
          amount: parseFloat(amount),
          deduction: 0.0,
          screenshot: true
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setOrderSuccess(`Order submitted successfully! Assigned code: ${data.orderCode}`);
        setOrderNo('');
        setAmount('');
        // Refresh dashboard metrics & lists
        fetchWallet();
        fetchTransactions();
        fetchOrders();
      } else {
        setOrderError(data.detail || 'Failed to submit order');
      }
    } catch (err) {
      setOrderError('Connection issue. Failed to submit order.');
    } finally {
      setOrderLoading(false);
    }
  };

  const handleRefundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestingRefundOrder || !refundUpi) return;
    setRefundLoading(true);
    setRefundMsg(null);

    try {
      const res = await fetch('/api/refunds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderNo: requestingRefundOrder.orderNo,
          amount: requestingRefundOrder.netAmount,
          reason: refundReason,
          description: refundDescription,
          upi: refundUpi
        })
      });
      const data = await res.json();
      if (res.ok) {
        setRefundMsg({ type: 'success', text: `Refund request submitted successfully for Order #${requestingRefundOrder.orderNo}.` });
        // Clean form states
        setRefundDescription('');
        setRefundUpi('');
        // Sync layout data
        fetchWallet();
        fetchTransactions();
        fetchOrders();
        // Close modal shortly
        setTimeout(() => {
          setRequestingRefundOrder(null);
          setRefundMsg(null);
        }, 2000);
      } else {
        setRefundMsg({ type: 'error', text: data.detail || 'Failed to submit refund claim.' });
      }
    } catch (err) {
      setRefundMsg({ type: 'error', text: 'Connection issue. Failed to submit refund.' });
    } finally {
      setRefundLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      const res = await fetch('/api/users/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profileName,
          email: profileEmail,
          mobile: profileMobile,
          upi: profileUpi
        })
      });
      const data = await res.json();
      if (res.ok) {
        setProfileMsg({ type: 'success', text: 'Profile updated successfully.' });
        setTimeout(() => {
          setIsProfileOpen(false);
          setProfileMsg(null);
          window.location.reload();
        }, 1500);
      } else {
        setProfileMsg({ type: 'error', text: data.detail || 'Failed to update profile.' });
      }
    } catch (err) {
      setProfileMsg({ type: 'error', text: 'Network error updating profile.' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!withdrawUpi || !withdrawAmount) {
      setWithdrawMsg({ type: 'error', text: 'Please fill in UPI Address and Amount.' });
      return;
    }
    setWithdrawLoading(true);
    setWithdrawMsg(null);
    try {
      const res = await fetch('/api/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          upi: withdrawUpi,
          amount: parseFloat(withdrawAmount)
        })
      });
      const data = await res.json();
      if (res.ok) {
        setWithdrawMsg({ type: 'success', text: `Withdrawal request for ₹${withdrawAmount} submitted.` });
        setWithdrawAmount('');
        fetchWallet();
        fetchWithdrawals();
        setTimeout(() => {
          setIsWithdrawOpen(false);
          setWithdrawMsg(null);
        }, 2000);
      } else {
        setWithdrawMsg({ type: 'error', text: data.detail || 'Failed to request withdrawal.' });
      }
    } catch (err) {
      setWithdrawMsg({ type: 'error', text: 'Network error submitting request.' });
    } finally {
      setWithdrawLoading(false);
    }
  };

  const toggleDarkMode = () => {
    if (darkMode) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setDarkMode(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setDarkMode(true);
    }
  };

  const getOrderStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 rounded-md border border-emerald-100 dark:border-emerald-900/30 uppercase">Paid</span>;
      case 'cancelled':
        return <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400 rounded-md border border-rose-100 dark:border-rose-900/30 uppercase">Cancelled</span>;
      case 'under_review':
        return <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400 rounded-md border border-amber-100 dark:border-amber-900/30 uppercase">Under Review</span>;
      case 'order_filled':
        return <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400 rounded-md border border-blue-100 dark:border-blue-900/30 uppercase">Filled</span>;
      default:
        return <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 rounded-md border border-slate-200 dark:border-slate-850 uppercase">Pending</span>;
    }
  };

  const getRefundStatusPill = (status: string | null) => {
    if (!status || status === 'not_eligible') return null;
    switch (status) {
      case 'pending':
        return <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/10 text-amber-500 rounded-full">Refund: Pending</span>;
      case 'cleared':
        return <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-500/10 text-emerald-500 rounded-full">Refund: Cleared</span>;
      case 'rejected':
        return <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-500/10 text-rose-500 rounded-full">Refund: Rejected</span>;
      default:
        return null;
    }
  };

  // Filter buyer claims list based on query input
  const filteredOrders = orders.filter(o => {
    if (!orderSearchQuery) return true;
    const query = orderSearchQuery.toLowerCase();
    return (
      o.orderNo.toLowerCase().includes(query) ||
      o.productName.toLowerCase().includes(query) ||
      o.productCode.toLowerCase().includes(query)
    );
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <Head>
        <title>Buyer Portal - deals.seller MIS</title>
      </Head>

      {/* Header */}
      <header className="glass-panel sticky top-0 z-40 border-b border-slate-200/50 dark:border-slate-800/50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-brand-600 to-indigo-600 rounded-xl flex items-center justify-center text-white font-extrabold shadow-sm">
            AG
          </div>
          <div>
            <h1 className="font-extrabold text-lg tracking-tight">deals.seller</h1>
            <p className="text-xs text-slate-400 font-semibold tracking-wider uppercase">Buyer Portal</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setIsNotifOpen(!isNotifOpen);
                setIsProfileOpen(false);
                setIsWithdrawOpen(false);
              }}
              className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 transition-colors relative"
              title="Recent Activities"
            >
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-500 rounded-full animate-pulse"></span>
              <span className="text-xs">🔔</span>
            </button>
            {isNotifOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-glass p-4 space-y-3 z-50 text-left">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400">Recent Activities</h4>
                {notifications.length === 0 ? (
                  <p className="text-xs text-slate-500 py-2 text-center">No recent activities</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {notifications.map(n => (
                      <div key={n.id} className="p-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/50 rounded-xl text-xs">
                        <p className="text-slate-700 dark:text-slate-300 font-semibold">{n.text}</p>
                        <span className="text-[10px] text-slate-400 font-mono mt-1 block">{n.date}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Profile Settings Trigger */}
          <button
            onClick={() => {
              setIsProfileOpen(true);
              setIsNotifOpen(false);
              setIsWithdrawOpen(false);
            }}
            className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 transition-colors"
            title="Profile Settings"
          >
            <span className="text-xs">⚙️</span>
          </button>

          <button
            onClick={toggleDarkMode}
            className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 transition-colors"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-500" />}
          </button>

          <div className="flex items-center gap-3 border-l border-slate-200 dark:border-slate-800 pl-4">
            <div className="text-right">
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{user?.name || 'Buyer Account'}</p>
              <p className="text-xs text-slate-400 font-semibold uppercase">{user?.role || 'Buyer'}</p>
            </div>
            <button
              onClick={logout}
              className="p-2.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-500 border border-slate-200/50 dark:border-slate-800/50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Content Container */}
      <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Cols: Wallet & Tabs Panel */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Wallet cards */}
          <div className="glass-panel rounded-3xl p-6 shadow-sm border border-slate-200/50 dark:border-slate-800/50">
            <h3 className="font-extrabold text-lg tracking-tight mb-6 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-brand-500" />
              <span>Seller Wallet Balance</span>
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="bg-gradient-to-tr from-brand-600 to-indigo-600 text-white rounded-2xl p-5 shadow-sm relative overflow-hidden group">
                <div className="absolute right-[-10px] bottom-[-10px] w-20 h-20 bg-white/10 rounded-full group-hover:scale-120 transition-transform duration-500" />
                <p className="text-xs uppercase tracking-wider font-semibold opacity-75">Withdrawable</p>
                <h4 className="text-3xl font-extrabold mt-2">₹{wallet?.withdrawableCashback?.toLocaleString() || '0.00'}</h4>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-[10px] opacity-75 font-semibold">Cleared Cashback</span>
                  <button
                    onClick={() => {
                      setIsWithdrawOpen(true);
                      setIsProfileOpen(false);
                      setIsNotifOpen(false);
                    }}
                    className="px-2 py-1 bg-white/20 hover:bg-white/30 text-white rounded-lg font-bold text-[9px] uppercase tracking-wider transition-all z-10"
                  >
                    Withdraw
                  </button>
                </div>
              </div>

              <div className="bg-white/80 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-brand-500/30 rounded-2xl p-5 shadow-sm relative overflow-hidden group transition-all duration-350 hover:shadow-md">
                <div className="absolute right-[-10px] bottom-[-10px] w-16 h-16 bg-brand-500/5 dark:bg-brand-500/10 rounded-full group-hover:scale-150 transition-all duration-500" />
                <p className="text-xs uppercase tracking-wider font-semibold text-slate-400">Pending</p>
                <h4 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 mt-2">₹{wallet?.pendingCashback?.toLocaleString() || '0.00'}</h4>
                <p className="text-[10px] text-slate-400 mt-4 font-semibold">Awaiting Review</p>
              </div>

              <div className="bg-white/80 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-rose-500/30 rounded-2xl p-5 shadow-sm relative overflow-hidden group transition-all duration-350 hover:shadow-md">
                <div className="absolute right-[-10px] bottom-[-10px] w-16 h-16 bg-rose-500/5 dark:bg-rose-500/10 rounded-full group-hover:scale-150 transition-all duration-500" />
                <p className="text-xs uppercase tracking-wider font-semibold text-slate-400">Refund Wallet</p>
                <h4 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 mt-2">₹{wallet?.refundBalance?.toLocaleString() || '0.00'}</h4>
                <p className="text-[10px] text-slate-400 mt-4 font-semibold">Processed Refunds</p>
              </div>
            </div>
          </div>

          {/* Dynamic Active Deals list without scroll */}
          <div className="glass-panel rounded-3xl p-6 shadow-sm border border-slate-200/50 dark:border-slate-800/50 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="font-extrabold text-lg tracking-tight flex items-center gap-2">
                <span>🔥 Active Deals Catalog</span>
                <span className="text-[10px] bg-brand-100 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                  Live
                </span>
              </h3>

              {/* Deal Search Input */}
              <div className="relative w-full sm:w-60">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search deals catalog..."
                  value={dealSearchQuery}
                  onChange={(e) => setDealSearchQuery(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs px-8 py-1.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            {/* Deal Category filter tabs */}
            {!loadingDeals && deals.length > 0 && (
              <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-none border-b border-slate-100 dark:border-slate-800">
                {dealCategories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setDealCategoryFilter(cat)}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all shrink-0 ${
                      dealCategoryFilter === cat
                        ? 'bg-brand-600 text-white shadow-sm'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-450 dark:text-slate-400'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}

            {loadingDeals ? (
              <div className="py-8 text-center text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin mx-auto text-brand-500 mb-2" />
                <p className="text-xs font-semibold">Syncing active catalog...</p>
              </div>
            ) : filteredDeals.length === 0 ? (
              <div className="py-8 text-center text-slate-400 font-medium">
                No active deals matched your search/filter.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {filteredDeals.map(d => {
                  let platformColor = "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-350";
                  if (d.platform.toLowerCase() === 'amazon') platformColor = "bg-amber-50 text-amber-800 border border-amber-100/50 dark:bg-amber-950/20 dark:text-amber-300 dark:border-amber-900/30";
                  if (d.platform.toLowerCase() === 'flipkart') platformColor = "bg-blue-50 text-blue-800 border border-blue-100/50 dark:bg-blue-950/20 dark:text-blue-300 dark:border-blue-900/30";
                  if (d.platform.toLowerCase() === 'blinkit') platformColor = "bg-emerald-50 text-emerald-800 border border-emerald-100/50 dark:bg-emerald-950/20 dark:text-emerald-300 dark:border-emerald-900/30";

                  const lowSlots = d.slots <= 2;

                  return (
                    <button
                      key={d.id}
                      onClick={() => {
                        setProductCode(d.productCode);
                        setAmount(d.price.toString());
                        const form = document.querySelector('form');
                        if (form) {
                          form.scrollIntoView({ behavior: 'smooth' });
                        }
                      }}
                      className="flex flex-col items-start p-4 bg-white/70 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 hover:border-brand-500 dark:hover:border-brand-500/50 shadow-sm text-left hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 rounded-2xl w-full relative"
                    >
                      <div className="flex items-center justify-between w-full mb-2">
                        <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${platformColor}`}>
                          {d.platform}
                        </span>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md ${
                          lowSlots 
                            ? 'text-rose-500 bg-rose-50 dark:bg-rose-950/30 animate-pulse font-extrabold border border-rose-100/50 dark:border-rose-900/20' 
                            : 'text-slate-500 bg-slate-100 dark:bg-slate-800'
                        }`}>
                          {d.slots} slots {lowSlots && '🔥'}
                        </span>
                      </div>
                      <p className="font-extrabold text-sm text-slate-850 dark:text-slate-200 line-clamp-1 w-full animate-fade-in" title={d.productName}>
                        {d.productName}
                      </p>
                      <div className="flex items-center justify-between w-full mt-0.5">
                        <span className="text-[10px] text-slate-400 font-mono">{d.productCode}</span>
                        <span className="text-[10px] text-brand-500 font-semibold">{d.category || 'General'}</span>
                      </div>
                      <div className="flex items-baseline gap-2 mt-4 pt-2 border-t border-slate-100 dark:border-slate-800/80 w-full">
                        <span className="text-sm font-black text-brand-600 dark:text-brand-400">₹{d.price.toLocaleString()}</span>
                        <span className="text-[10px] text-emerald-500 font-bold">₹{d.cashback.toLocaleString()} back</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Interactive tabs details panel */}
          <div className="glass-panel rounded-3xl p-6 shadow-sm border border-slate-200/50 dark:border-slate-800/50 space-y-6">
            <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2">
              <button
                onClick={() => setActiveTab('orders')}
                className={`pb-4 px-4 font-extrabold text-sm border-b-2 transition-all ${
                  activeTab === 'orders'
                    ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                    : 'border-transparent text-slate-400 hover:text-slate-650 dark:hover:text-slate-200'
                }`}
              >
                My Order Claims
              </button>
              <button
                onClick={() => setActiveTab('transactions')}
                className={`pb-4 px-4 font-extrabold text-sm border-b-2 transition-all ${
                  activeTab === 'transactions'
                    ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                    : 'border-transparent text-slate-400 hover:text-slate-650 dark:hover:text-slate-200'
                }`}
              >
                Wallet Transactions
              </button>
            </div>

            {/* Display tab content */}
            {activeTab === 'orders' ? (
              <div className="space-y-4">
                {/* Search orders */}
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search my claims..."
                    value={orderSearchQuery}
                    onChange={(e) => setOrderSearchQuery(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs px-9 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all shadow-sm"
                  />
                </div>

                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                  {ordersLoading ? (
                    <div className="text-center py-12 text-slate-400">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto text-brand-500 mb-2" />
                      <p className="font-semibold text-xs">Loading your order claims...</p>
                    </div>
                  ) : filteredOrders.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 font-medium">No order claims found.</div>
                  ) : (
                    filteredOrders.map((order) => (
                      <div key={order.id} className="p-4 bg-white/70 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md transition-shadow space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-bold text-sm text-slate-850 dark:text-slate-100 flex items-center gap-2">
                              <span>Order #{order.orderNo}</span>
                              <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-md font-semibold">{order.platform}</span>
                            </p>
                            <p className="text-xs text-slate-400 font-semibold mt-0.5">{order.productName}</p>
                          </div>
                          <div className="text-right flex flex-col items-end gap-1">
                            <p className="font-black text-sm text-brand-600 dark:text-brand-400">₹{order.netAmount.toLocaleString()}</p>
                            <span className="text-[10px] text-slate-400 font-semibold">{order.orderDate}</span>
                          </div>
                        </div>

                        {/* Billing Breakdown */}
                        <div className="bg-slate-50 dark:bg-slate-900/40 rounded-xl p-3 text-[11px] space-y-1 text-slate-500 border border-slate-100 dark:border-slate-800/50">
                          <div className="flex justify-between">
                            <span>Cashback Amount ({order.cashbackPct}%)</span>
                            <span className="font-semibold text-slate-750 dark:text-slate-300">₹{order.cashbackAmount.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-rose-500">
                            <span>Deduction Fee Cut</span>
                            <span className="font-semibold">-₹{order.deductionAmount.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between border-t border-slate-200/50 dark:border-slate-800/50 pt-1 font-bold text-brand-600 dark:text-brand-400">
                            <span>Net Payout</span>
                            <span>₹{order.netAmount.toLocaleString()}</span>
                          </div>
                        </div>

                        {/* Status Bar */}
                        <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-900 pt-3">
                          <div className="flex items-center gap-2">
                            {getOrderStatusBadge(order.currentStatus)}
                            {getRefundStatusPill(order.refundStatus)}
                          </div>
                          
                          {/* Refund Action */}
                          {(!order.refundStatus || order.refundStatus === 'not_eligible' || order.refundStatus === 'rejected') && (
                            <button
                              onClick={() => setRequestingRefundOrder(order)}
                              className="px-2.5 py-1 text-xs font-bold bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-900/30 text-rose-500 rounded-lg transition-colors border border-rose-100 dark:border-rose-900/30"
                            >
                              Request Refund
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                {transactions.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 font-medium">No transactions recorded yet.</div>
                ) : (
                  transactions.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between p-4 bg-white/70 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                          tx.type === 'credit' 
                            ? 'bg-emerald-50 text-emerald-500 dark:bg-emerald-950/30' 
                            : 'bg-rose-50 text-rose-500 dark:bg-rose-950/30'
                        }`}>
                          {tx.type === 'credit' ? '+' : '-'}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-slate-800 dark:text-slate-200">{tx.description || 'Transaction'}</p>
                          <p className="text-xs text-slate-400 font-medium mt-0.5">{tx.timestamp.replace('T', ' ')}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-extrabold text-sm ${tx.type === 'credit' ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {tx.type === 'credit' ? '+' : '-'} ₹{tx.amount.toLocaleString()}
                        </p>
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-full mt-1 inline-block uppercase">
                          {tx.category.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Submit Order Form */}
        <div className="space-y-8">
          <div className="glass-panel rounded-3xl p-6 shadow-sm border border-slate-200/50 dark:border-slate-800/50">
            <h3 className="font-extrabold text-lg tracking-tight mb-6 flex items-center gap-2">
              <Send className="w-5 h-5 text-brand-500" />
              <span>Submit New Order</span>
            </h3>

            {orderSuccess && (
              <div className="mb-4 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 p-4 rounded-xl text-sm border border-emerald-100 dark:border-emerald-950/50">
                {orderSuccess}
              </div>
            )}
            {orderError && (
              <div className="mb-4 flex items-center gap-3 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 p-4 rounded-xl text-sm border border-rose-100 dark:border-rose-950/50">
                <ShieldAlert className="w-5 h-5 flex-shrink-0" />
                <span>{orderError}</span>
              </div>
            )}

            <form onSubmit={handleOrderSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Order Number</label>
                <input
                  type="text"
                  value={orderNo}
                  onChange={(e) => setOrderNo(e.target.value)}
                  placeholder="e.g. 402-0025862-2109921"
                  className="w-full px-4 py-3 bg-white/70 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Product Catalog Code</label>
                <select
                  value={productCode}
                  onChange={(e) => setProductCode(e.target.value)}
                  className="w-full px-4 py-3 bg-white/70 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                >
                  {deals.map(d => (
                    <option key={d.id} value={d.productCode}>
                      {d.productName} ({d.productCode}) - Price: ₹{d.price.toLocaleString()}
                    </option>
                  ))}
                  {deals.length === 0 && (
                    <>
                      <option value="AMZ001">boAt wireless Earphones (AMZ001) - Price: ₹1,299</option>
                      <option value="AMZ002">Noise Smartwatch (AMZ002) - Price: ₹2,499</option>
                      <option value="FLK001">Redmi 13C 4G (FLK001) - Price: ₹8,999</option>
                      <option value="BLK001">Amul Butter (BLK001) - Price: ₹290</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Order Amount Paid</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 1299"
                  className="w-full px-4 py-3 bg-white/70 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={orderLoading}
                className="w-full py-3.5 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
              >
                {orderLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Submit Order Claim</span>}
              </button>
            </form>
          </div>

          {/* Referral Program Widget */}
          <div className="glass-panel rounded-3xl p-6 shadow-sm border border-slate-200/50 dark:border-slate-800/50 space-y-4">
            <h3 className="font-extrabold text-lg tracking-tight flex items-center gap-2">
              <span>🎁 Refer & Earn Rewards</span>
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Refer a friend to deals.seller! When they register, you will get an instant <strong className="text-emerald-500">₹50.00 withdrawable cash credit</strong> to your wallet.
            </p>
            <div className="space-y-2.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Your Referral Link</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={typeof window !== 'undefined' ? `${window.location.origin}/register?ref=${user?.referral || ''}` : `http://localhost:3000/register?ref=${user?.referral || ''}`}
                    className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-[11px] px-3 py-2 rounded-xl focus:outline-none"
                  />
                  <button
                    onClick={() => {
                      const link = typeof window !== 'undefined' ? `${window.location.origin}/register?ref=${user?.referral || ''}` : '';
                      navigator.clipboard.writeText(link);
                      alert('Referral link copied to clipboard!');
                    }}
                    className="px-3 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold text-[10px] uppercase shrink-0 transition-colors"
                  >
                    Copy
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-slate-450 font-semibold">Your Referral Code</span>
                <span className="font-extrabold text-indigo-500 font-mono select-all bg-indigo-50 dark:bg-indigo-950/20 px-2 py-0.5 rounded-md">{user?.referral || 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Request Refund Modal */}
      {requestingRefundOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-glass border border-slate-200/50 dark:border-slate-800/50">
            <h3 className="font-extrabold text-lg text-slate-800 dark:text-slate-100 mb-2">Submit Payout Refund Claim</h3>
            <p className="text-xs text-slate-400 font-semibold mb-6">Filing refund request for Order: <strong>#{requestingRefundOrder.orderNo}</strong> (Total Payout value: ₹{requestingRefundOrder.netAmount})</p>
            
            {refundMsg && (
              <div className={`mb-4 p-4 rounded-xl text-sm border flex items-center gap-2 ${
                refundMsg.type === 'success' 
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-950/50' 
                  : 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-950/50'
              }`}>
                <span>{refundMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleRefundSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Reason for Refund</label>
                <select
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full px-4 py-3 bg-white/70 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                >
                  <option value="Delayed Cashback Credit">Delayed Cashback Credit</option>
                  <option value="Incorrect Payout Calculation">Incorrect Payout Calculation</option>
                  <option value="Wrong Product Delivered">Wrong Product Delivered</option>
                  <option value="Item Returned / Refund Requested">Item Returned / Refund Requested</option>
                  <option value="Other / Support Appeal">Other / Support Appeal</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Your UPI ID for payout transfer</label>
                <input
                  type="text"
                  required
                  value={refundUpi}
                  onChange={(e) => setRefundUpi(e.target.value)}
                  placeholder="e.g. ayush@upi"
                  className="w-full px-4 py-3 bg-white/70 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Additional Description</label>
                <textarea
                  value={refundDescription}
                  onChange={(e) => setRefundDescription(e.target.value)}
                  placeholder="Tell us what went wrong (optional)..."
                  className="w-full px-4 py-3 bg-white/70 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm h-24"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setRequestingRefundOrder(null); setRefundMsg(null); }}
                  className="px-4 py-2 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={refundLoading || !refundUpi}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-650 text-white rounded-xl font-bold text-sm transition-all shadow-md shadow-rose-100 dark:shadow-none flex items-center justify-center gap-2"
                >
                  {refundLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Submit Refund Claim</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Profile Settings Modal */}
      {isProfileOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-glass border border-slate-200/50 dark:border-slate-800/50">
            <h3 className="font-extrabold text-lg text-slate-800 dark:text-slate-100 mb-2">Profile Settings</h3>
            <p className="text-xs text-slate-400 font-semibold mb-6">Manage your buyer information and preferred UPI address.</p>

            {profileMsg && (
              <div className={`mb-4 p-4 rounded-xl text-sm border ${
                profileMsg.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-950/50'
                  : 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-950/50'
              }`}>
                <span>{profileMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Full Name</label>
                <input
                  type="text"
                  required
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full px-4 py-3 bg-white/70 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
                <input
                  type="email"
                  required
                  value={profileEmail}
                  onChange={(e) => setProfileEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-white/70 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Mobile Number</label>
                <input
                  type="text"
                  value={profileMobile}
                  onChange={(e) => setProfileMobile(e.target.value)}
                  className="w-full px-4 py-3 bg-white/70 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Preferred UPI ID</label>
                <input
                  type="text"
                  placeholder="e.g. user@upi"
                  value={profileUpi}
                  onChange={(e) => setProfileUpi(e.target.value)}
                  className="w-full px-4 py-3 bg-white/70 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setIsProfileOpen(false); setProfileMsg(null); }}
                  className="px-4 py-2 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-200 text-white rounded-xl font-bold text-sm transition-all"
                >
                  {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Withdraw Requests Modal */}
      {isWithdrawOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-glass border border-slate-200/50 dark:border-slate-800/50 flex flex-col max-h-[90vh]">
            <div className="overflow-y-auto pr-1 space-y-6">
              <div>
                <h3 className="font-extrabold text-lg text-slate-800 dark:text-slate-100 mb-1">Request Cashback Payout</h3>
                <p className="text-xs text-slate-400 font-semibold">Available Balance: <strong className="text-emerald-500">₹{wallet?.withdrawableCashback?.toLocaleString() || '0.00'}</strong></p>
              </div>

              {withdrawMsg && (
                <div className={`p-4 rounded-xl text-sm border ${
                  withdrawMsg.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-950/50'
                    : 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-950/50'
                }`}>
                  <span>{withdrawMsg.text}</span>
                </div>
              )}

              <form onSubmit={handleWithdrawSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">UPI Address for Transfer</label>
                  <input
                    type="text"
                    required
                    value={withdrawUpi}
                    onChange={(e) => setWithdrawUpi(e.target.value)}
                    placeholder="e.g. user@upi"
                    className="w-full px-4 py-3 bg-white/70 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Withdrawal Amount (₹)</label>
                  <input
                    type="number"
                    required
                    max={wallet?.withdrawableCashback || 0}
                    min={1}
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="e.g. 500"
                    className="w-full px-4 py-3 bg-white/70 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none text-sm"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => { setIsWithdrawOpen(false); setWithdrawMsg(null); }}
                    className="px-4 py-2 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={withdrawLoading || !withdrawAmount || parseFloat(withdrawAmount) > (wallet?.withdrawableCashback || 0)}
                    className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-250 text-white rounded-xl font-bold text-sm transition-all"
                  >
                    {withdrawLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Request Payout'}
                  </button>
                </div>
              </form>

              {/* Historic Payouts */}
              <div className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400">Withdrawal History</h4>
                {withdrawList.length === 0 ? (
                  <p className="text-xs text-slate-500 py-1">No withdrawal history found.</p>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {withdrawList.map(w => (
                      <div key={w.id} className="flex justify-between items-center p-2.5 bg-slate-550 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/50 rounded-xl text-xs">
                        <div>
                          <p className="font-bold text-slate-700 dark:text-slate-350">₹{w.amount.toLocaleString()} to UPI</p>
                          <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">{new Date(w.createdAt).toLocaleString()}</span>
                        </div>
                        <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                          w.status === 'approved'
                            ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400'
                            : w.status === 'rejected'
                            ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400'
                            : 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400'
                        }`}>
                          {w.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
