import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useAuth } from '@/hooks/useAuth';
import { DashboardWidget } from '@/components/DashboardWidget';
import { Users, ShoppingBag, FileSpreadsheet, RefreshCw, LogOut, Sun, Moon, Search, SlidersHorizontal } from 'lucide-react';

interface StatsState {
  totalOrders: number;
  totalBuyers: number;
  totalRefunds: number;
  pendingRefunds: number;
  paidOrders: number;
  totalPayout: number;
}

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState<StatsState | null>(null);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();
      if (res.ok) {
        setStats(data);
      }
    } catch (e) {
      console.error("Error loading statistics", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    setDarkMode(document.documentElement.classList.contains('dark'));
  }, []);

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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <Head>
        <title>Admin Panel - deals.seller MIS</title>
      </Head>

      {/* Navigation Header */}
      <header className="glass-panel sticky top-0 z-40 border-b border-slate-200/50 dark:border-slate-800/50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-brand-600 to-indigo-600 rounded-xl flex items-center justify-center text-white font-extrabold shadow-sm">
            AG
          </div>
          <div>
            <h1 className="font-extrabold text-lg tracking-tight">deals.seller</h1>
            <p className="text-xs text-slate-400 font-semibold tracking-wider uppercase">Enterprise MIS</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Global Search bar */}
          <div className="relative hidden md:block">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search orders, buyers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-sm px-9 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 w-64 transition-all"
            />
          </div>

          <button
            onClick={toggleDarkMode}
            className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 transition-colors"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-500" />}
          </button>

          <div className="flex items-center gap-3 border-l border-slate-200 dark:border-slate-800 pl-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{user?.name || 'Administrator'}</p>
              <p className="text-xs text-slate-400 font-semibold uppercase">{user?.role || 'Admin'}</p>
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

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        
        {/* Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight">Overview Dashboard</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Real-time statistics, calculations, and wallet ledger summary.</p>
          </div>
          <button
            onClick={fetchStats}
            className="self-start md:self-auto flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold text-sm shadow-sm transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Sync Stats</span>
          </button>
        </div>

        {/* Dashboard Widgets Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <DashboardWidget
            title="Total Placed Orders"
            value={loading ? '...' : stats?.totalOrders || 0}
            icon="🛍️"
            trend="+12%"
            trendType="up"
            colorClass="from-blue-500 to-indigo-500"
          />
          <DashboardWidget
            title="Total Active Buyers"
            value={loading ? '...' : stats?.totalBuyers || 0}
            icon="👥"
            trend="+5%"
            trendType="up"
            colorClass="from-violet-500 to-purple-500"
          />
          <DashboardWidget
            title="Resolved Payouts"
            value={loading ? '...' : `₹${stats?.totalPayout.toLocaleString()}`}
            icon="💳"
            trend="+18%"
            trendType="up"
            colorClass="from-emerald-500 to-teal-500"
          />
          <DashboardWidget
            title="Pending Refunds"
            value={loading ? '...' : stats?.pendingRefunds || 0}
            icon="🔄"
            trend="-3%"
            trendType="down"
            colorClass="from-rose-500 to-pink-500"
          />
        </div>

        {/* Action Panel Menu */}
        <div className="glass-panel rounded-3xl p-6 shadow-sm border border-slate-200/50 dark:border-slate-800/50">
          <h3 className="font-extrabold text-lg tracking-tight mb-4 flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-brand-500" />
            <span>Admin Management Modules</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <a
              href="/admin/orders"
              className="flex items-center gap-4 p-4 rounded-2xl bg-white/70 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 hover:border-brand-500 dark:hover:border-brand-500/50 shadow-sm transition-all hover:scale-[1.01]"
            >
              <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950/50 rounded-xl flex items-center justify-center text-indigo-500 text-lg font-bold">
                📦
              </div>
              <div className="text-left">
                <p className="font-bold text-sm">Order Manager</p>
                <p className="text-xs text-slate-400 mt-0.5">Edit status, CSV imports</p>
              </div>
            </a>

            <a
              href="/admin/refunds"
              className="flex items-center gap-4 p-4 rounded-2xl bg-white/70 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 hover:border-brand-500 dark:hover:border-brand-500/50 shadow-sm transition-all hover:scale-[1.01]"
            >
              <div className="w-10 h-10 bg-rose-50 dark:bg-rose-950/50 rounded-xl flex items-center justify-center text-rose-500 text-lg font-bold">
                🔄
              </div>
              <div className="text-left">
                <p className="font-bold text-sm">Refund Handler</p>
                <p className="text-xs text-slate-400 mt-0.5">Approve or reject wallet credits</p>
              </div>
            </a>

            <a
              href="/admin/users"
              className="flex items-center gap-4 p-4 rounded-2xl bg-white/70 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 hover:border-brand-500 dark:hover:border-brand-500/50 shadow-sm transition-all hover:scale-[1.01]"
            >
              <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-950/50 rounded-xl flex items-center justify-center text-emerald-500 text-lg font-bold">
                👥
              </div>
              <div className="text-left">
                <p className="font-bold text-sm">Buyer Accounts</p>
                <p className="text-xs text-slate-400 mt-0.5">Freeze, verify, audit profiles</p>
              </div>
            </a>

            <a
              href="/admin/audit-logs"
              className="flex items-center gap-4 p-4 rounded-2xl bg-white/70 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 hover:border-brand-500 dark:hover:border-brand-500/50 shadow-sm transition-all hover:scale-[1.01]"
            >
              <div className="w-10 h-10 bg-amber-50 dark:bg-amber-950/50 rounded-xl flex items-center justify-center text-amber-500 text-lg font-bold">
                📝
              </div>
              <div className="text-left">
                <p className="font-bold text-sm">System Audit Logs</p>
                <p className="text-xs text-slate-400 mt-0.5">Trace user actions & IP tracks</p>
              </div>
            </a>

            <a
              href="/admin/deals"
              className="flex items-center gap-4 p-4 rounded-2xl bg-white/70 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 hover:border-brand-500 dark:hover:border-brand-500/50 shadow-sm transition-all hover:scale-[1.01]"
            >
              <div className="w-10 h-10 bg-brand-50 dark:bg-brand-950/50 rounded-xl flex items-center justify-center text-brand-500 text-lg font-bold">
                🔥
              </div>
              <div className="text-left">
                <p className="font-bold text-sm">Live Deals Manager</p>
                <p className="text-xs text-slate-400 mt-0.5">Add, edit active/inactive deals</p>
              </div>
            </a>

            <a
              href="/admin/withdrawals"
              className="flex items-center gap-4 p-4 rounded-2xl bg-white/70 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 hover:border-brand-500 dark:hover:border-brand-500/50 shadow-sm transition-all hover:scale-[1.01]"
            >
              <div className="w-10 h-10 bg-blue-50 dark:bg-blue-950/50 rounded-xl flex items-center justify-center text-blue-500 text-lg font-bold">
                💸
              </div>
              <div className="text-left">
                <p className="font-bold text-sm">Payout Requests</p>
                <p className="text-xs text-slate-400 mt-0.5">Review UPI withdrawal requests</p>
              </div>
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
