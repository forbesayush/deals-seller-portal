import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useAuth } from '@/hooks/useAuth';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import {
  ShoppingBag, Users, ArrowDownToLine, BarChart3, TrendingUp,
  TrendingDown, Tag, Ticket, Wallet, RefreshCw, Clock,
  CheckCircle2, XCircle, AlertTriangle, Zap, Activity,
  FileText, Megaphone, Settings, ChevronRight, Plus,
  DollarSign, Star, Shield, Eye, Download
} from 'lucide-react';

function formatINR(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

function formatK(n: number) {
  if (n >= 1_00_000) return (n / 1_00_000).toFixed(1) + 'L';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    paid: 'badge-emerald', order_filled: 'badge-blue', under_review: 'badge-amber',
    pending_review: 'badge-slate', cancelled: 'badge-rose', approved: 'badge-emerald',
    pending: 'badge-amber', rejected: 'badge-rose', open: 'badge-blue',
    resolved: 'badge-emerald', active: 'badge-emerald', suspended: 'badge-rose',
  };
  const labels: Record<string, string> = {
    pending_review: 'Pending', order_filled: 'Filled', under_review: 'Reviewing',
    paid: 'Paid', cancelled: 'Cancelled', approved: 'Approved', rejected: 'Rejected',
    open: 'Open', resolved: 'Resolved', active: 'Active', suspended: 'Suspended',
    pending: 'Pending',
  };
  return <span className={`badge ${map[status] || 'badge-slate'} text-[10px]`}>{labels[status] || status}</span>;
}

interface StatCard {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  change?: number;
  color: string;
  bg: string;
  href?: string;
}

function DashStat({ card }: { card: StatCard }) {
  const Icon = card.icon;
  return (
    <div className="premium-card liquid-glass p-5 cursor-pointer hover:shadow-card-hover transition-all duration-200 group"
      onClick={() => card.href && (window.location.href = card.href)}>
      <div className="flex items-start justify-between">
        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${card.bg}`}>
          <Icon className={`w-5 h-5 ${card.color}`} />
        </div>
        {card.change !== undefined && (
          <div className={`flex items-center gap-0.5 text-xs font-bold ${card.change >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            {card.change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(card.change)}%
          </div>
        )}
      </div>
      <div className="mt-3">
        <p className="text-2xl font-extrabold font-mono tracking-tight">{card.value}</p>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">{card.label}</p>
        {card.sub && <p className="text-xs text-slate-400 mt-1">{card.sub}</p>}
      </div>
      {card.href && (
        <div className="mt-3 flex items-center gap-1 text-xs font-bold text-brand-600 dark:text-violet-400 opacity-0 group-hover:opacity-100 transition-opacity">
          View all <ChevronRight className="w-3 h-3" />
        </div>
      )}
    </div>
  );
}

function MiniChart({ data }: { data: number[] }) {
  if (!data.length) return null;
  const max = Math.max(...data) || 1;
  return (
    <div className="flex items-end gap-0.5 h-10">
      {data.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm bg-brand-400 dark:bg-violet-500 opacity-75 hover:opacity-100 transition-opacity"
          style={{ height: `${(v / max) * 100}%`, minHeight: 2 }}
          title={String(v)}
        />
      ))}
    </div>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  // Feature 11: Real-time stats
  const [stats, setStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Feature 12: Analytics summary
  const [analytics, setAnalytics] = useState<any>(null);

  // Feature 13: Revenue chart (last 14 days)
  const [revenueData, setRevenueData] = useState<any>(null);
  const [revenueLoading, setRevenueLoading] = useState(true);

  // Feature 14: Recent orders
  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  // Feature 15: Deal performance
  const [dealPerf, setDealPerf] = useState<any[]>([]);

  // Feature 16: Recent users
  const [recentUsers, setRecentUsers] = useState<any[]>([]);

  // Feature 17: Recent tickets
  const [recentTickets, setRecentTickets] = useState<any[]>([]);

  // Feature 18: System health
  const [health, setHealth] = useState<any>(null);

  // Feature 19: Announcements
  const [announcements, setAnnouncements] = useState<any[]>([]);

  // Feature 20: Refunds (recent)
  const [recentRefunds, setRecentRefunds] = useState<any[]>([]);

  const toggleDark = () => {
    const isDark = !darkMode;
    setDarkMode(isDark);
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  };

  const fetchAll = async () => {
    setStatsLoading(true);
    setRevenueLoading(true);
    await Promise.all([
      fetch('/api/stats').then(r => r.json()).then(d => setStats(d)).catch(() => {}),
      fetch('/api/analytics/summary').then(r => r.json()).then(d => setAnalytics(d)).catch(() => {}),
      fetch('/api/analytics/revenue?days=14').then(r => r.json()).then(d => setRevenueData(d)).catch(() => {}),
      fetch('/api/orders?q=').then(r => r.json()).then(d => setRecentOrders(Array.isArray(d) ? d.slice(0, 8) : [])).catch(() => {}),
      fetch('/api/analytics/deals').then(r => r.json()).then(d => setDealPerf(Array.isArray(d) ? d.slice(0, 5) : [])).catch(() => {}),
      fetch('/api/users/all').then(r => r.json()).then(d => setRecentUsers(Array.isArray(d) ? d.slice(0, 5) : [])).catch(() => {}),
      fetch('/api/tickets').then(r => r.json()).then(d => setRecentTickets(Array.isArray(d) ? d.slice(0, 5) : [])).catch(() => {}),
      fetch('/api/health/full').then(r => r.json()).then(d => setHealth(d)).catch(() => {}),
      fetch('/api/announcements?active_only=true').then(r => r.json()).then(d => setAnnouncements(Array.isArray(d) ? d : [])).catch(() => {}),
      fetch('/api/refunds').then(r => r.json()).then(d => setRecentRefunds(Array.isArray(d) ? d.slice(0, 5) : [])).catch(() => {}),
    ]);
    setStatsLoading(false);
    setRevenueLoading(false);
  };

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') { setDarkMode(true); document.documentElement.classList.add('dark'); }
    fetchAll();
  }, []);

  const statCards: StatCard[] = [
    { icon: ShoppingBag, label: 'Total Orders', value: stats?.totalOrders || 0, change: 12, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-950/40', href: '/admin/orders' },
    { icon: Users, label: 'Total Buyers', value: stats?.totalBuyers || 0, change: 8, color: 'text-violet-600', bg: 'bg-violet-100 dark:bg-violet-950/40', href: '/admin/users' },
    { icon: Tag, label: 'Active Deals', value: stats?.activeDeals || 0, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-950/40', href: '/admin/deals' },
    { icon: DollarSign, label: 'Total Payout', value: formatINR(stats?.totalPayout || 0), change: 5, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-950/40' },
    { icon: ArrowDownToLine, label: 'Pending Refunds', value: stats?.pendingRefunds || 0, color: 'text-rose-600', bg: 'bg-rose-100 dark:bg-rose-950/40', href: '/admin/refunds' },
    { icon: Wallet, label: 'Withdrawals Pending', value: stats?.pendingWithdrawals || 0, color: 'text-indigo-600', bg: 'bg-indigo-100 dark:bg-indigo-950/40', href: '/admin/withdrawals' },
    { icon: Ticket, label: 'Open Tickets', value: stats?.openTickets || 0, color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-950/40', href: '/admin/tickets' },
    { icon: CheckCircle2, label: 'Paid Orders', value: stats?.paidOrders || 0, color: 'text-teal-600', bg: 'bg-teal-100 dark:bg-teal-950/40', href: '/admin/orders' },
  ];

  const revenueChart = revenueData?.data?.map((d: any) => d.revenue) || [];

  return (
    <>
      <Head>
        <title>Admin Dashboard — Deals Seller Portal</title>
        <meta name="description" content="Admin dashboard for managing deals, orders, users, refunds, and analytics." />
      </Head>

      <div className="min-h-screen flex" style={{ background: 'var(--color-bg)' }}>
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} darkMode={darkMode} />

        <div className="flex-1 flex flex-col min-h-screen transition-all duration-300"
          style={{ marginLeft: sidebarCollapsed ? 72 : 260 }}>
          <Header
            title="Command Center"
            darkMode={darkMode}
            onToggleDark={toggleDark}
            sidebarCollapsed={sidebarCollapsed}
          />

          <main className="relative flex-1 p-6 pt-[88px] space-y-6 overflow-hidden">
            <div className="pointer-events-none absolute inset-0 -z-10">
              <div className="absolute -top-16 -left-16 w-80 h-80 rounded-full bg-violet-400/25 blur-3xl dark:bg-violet-500/20" />
              <div className="absolute top-24 right-[-90px] w-96 h-96 rounded-full bg-cyan-300/20 blur-3xl dark:bg-cyan-500/15" />
            </div>
            {/* Welcome + Quick Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-extrabold">
                  Good day, <span className="gradient-text">{user?.name?.split(' ')[0]}</span> 👋
                </h1>
                <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
                  {health?.status === 'healthy' ? '🟢 All systems operational' : '⚠️ Check system health'} · {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button onClick={fetchAll} className="btn btn-ghost btn-sm">
                  <RefreshCw className="w-4 h-4" /> Refresh
                </button>
                <a href="/admin/orders" className="btn btn-secondary btn-sm">
                  <ShoppingBag className="w-4 h-4" /> Orders
                </a>
                <a href="/admin/deals" className="btn btn-primary btn-sm">
                  <Plus className="w-4 h-4" /> New Deal
                </a>
                <button onClick={() => window.open('/api/reports/export?type=orders&format=csv')} className="btn btn-ghost btn-sm">
                  <Download className="w-4 h-4" /> Export
                </button>
              </div>
            </div>

            {/* ── Feature 11: Stats Grid ── */}
            {statsLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton rounded-2xl h-28" />)}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {statCards.map(card => <DashStat key={card.label} card={card} />)}
              </div>
            )}

            {/* ── Feature 12/13: Revenue Chart + Analytics ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 premium-card liquid-glass card-accent-violet p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-extrabold text-base">Revenue Overview</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Last 14 days · Daily revenue trend</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-extrabold">{formatINR(revenueData?.totalRevenue || 0)}</p>
                    <p className={`text-xs font-bold flex items-center gap-0.5 justify-end ${(revenueData?.growthPct || 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {(revenueData?.growthPct || 0) >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {revenueData?.growthPct || 0}% vs prev 7d
                    </p>
                  </div>
                </div>

                {revenueLoading ? (
                  <div className="skeleton h-32 rounded-xl" />
                ) : (
                  <>
                    <div className="flex items-end gap-1 h-32 mb-2">
                      {(revenueData?.data || []).map((d: any, i: number) => {
                        const max = Math.max(...(revenueData?.data || []).map((x: any) => x.revenue)) || 1;
                        const pct = (d.revenue / max) * 100;
                        return (
                          <div key={i} className="flex-1 flex flex-col justify-end" title={`${d.date}: ${formatINR(d.revenue)}`}>
                            <div
                              className="rounded-t-sm bg-gradient-to-t from-brand-600 to-indigo-400 opacity-80 hover:opacity-100 transition-all duration-200 cursor-pointer"
                              style={{ height: `${Math.max(pct, 2)}%` }}
                            />
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400">
                      {(revenueData?.data || []).filter((_: any, i: number) => i % 2 === 0).map((d: any) => (
                        <span key={d.date}>{d.date.slice(5)}</span>
                      ))}
                    </div>
                  </>
                )}

                <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
                  <div>
                    <p className="text-xs text-slate-400">Total Revenue</p>
                    <p className="font-extrabold text-sm">{formatINR(revenueData?.totalRevenue || 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Total Cashback</p>
                    <p className="font-extrabold text-sm text-emerald-500">{formatINR(revenueData?.totalCashback || 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Growth</p>
                    <p className={`font-extrabold text-sm ${(revenueData?.growthPct || 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {revenueData?.growthPct || 0}%
                    </p>
                  </div>
                </div>
              </div>

              {/* Feature 14: System Health Card */}
              <div className="premium-card liquid-glass card-accent-emerald p-5">
                <h3 className="font-extrabold mb-4">System Health</h3>
                <div className="space-y-3">
                  {[
                    { label: 'Status', value: health?.status || '...', color: health?.status === 'healthy' ? 'text-emerald-500' : 'text-rose-500' },
                    { label: 'DB Size', value: health?.dbSizeKb ? `${health.dbSizeKb} KB` : '...', color: 'text-blue-500' },
                    { label: 'Total Users', value: health?.totalUsers || '...', color: 'text-violet-500' },
                    { label: 'Active Sessions', value: health?.activeSessions || 0, color: 'text-amber-500' },
                    { label: 'Open Tickets', value: health?.openTickets || 0, color: 'text-rose-500' },
                    { label: 'Pending Withdrawals', value: health?.pendingWithdrawals || 0, color: 'text-indigo-500' },
                    { label: 'Version', value: health?.version || '3.0.0', color: 'text-slate-400' },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between text-sm">
                      <span className="text-slate-500 dark:text-slate-400">{item.label}</span>
                      <span className={`font-bold ${item.color}`}>{item.value}</span>
                    </div>
                  ))}
                </div>

                <a href="/admin/audit-logs" className="btn btn-ghost btn-sm w-full mt-4">
                  <Shield className="w-4 h-4" /> View Audit Logs
                </a>
              </div>
            </div>

            {/* ── Feature 15: Deal Performance + Feature 16: Recent Users ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Deal Performance */}
              <div className="premium-card liquid-glass overflow-hidden">
                <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-border)' }}>
                  <h3 className="font-extrabold">Deal Performance</h3>
                  <a href="/admin/deals" className="text-xs text-brand-600 dark:text-violet-400 font-bold hover:underline flex items-center gap-1">
                    All deals <ChevronRight className="w-3 h-3" />
                  </a>
                </div>
                {dealPerf.length === 0 ? (
                  <div className="text-center py-8">
                    <Tag className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">No deal data yet</p>
                  </div>
                ) : (
                  <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                    {dealPerf.map(d => (
                      <div key={d.dealId} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <div className="w-8 h-8 rounded-xl bg-brand-100 dark:bg-brand-950/40 flex items-center justify-center flex-shrink-0">
                          <Tag className="w-3.5 h-3.5 text-brand-600 dark:text-violet-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{d.productName}</p>
                          <p className="text-xs text-slate-400">{d.platform} · {d.totalOrders} orders · {d.slotsRemaining} slots left</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-bold text-emerald-500 text-sm">{formatINR(d.cashback)}</p>
                          <span className={`text-[10px] font-bold ${d.active ? 'text-emerald-500' : 'text-slate-400'}`}>
                            {d.active ? '● Live' : '○ Paused'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Users */}
              <div className="premium-card liquid-glass overflow-hidden">
                <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-border)' }}>
                  <h3 className="font-extrabold">Recent Users</h3>
                  <a href="/admin/users" className="text-xs text-brand-600 dark:text-violet-400 font-bold hover:underline flex items-center gap-1">
                    All users <ChevronRight className="w-3 h-3" />
                  </a>
                </div>
                {recentUsers.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">No users yet</p>
                  </div>
                ) : (
                  <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                    {recentUsers.map(u => (
                      <div key={u.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-500 to-indigo-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {u.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold">{u.name}</p>
                          <p className="text-xs text-slate-400 truncate">{u.email}</p>
                        </div>
                        <StatusBadge status={u.status} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ── Feature 17: Recent Orders + Feature 18/19: Tickets & Announcements ── */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* Recent Orders */}
              <div className="xl:col-span-2 premium-card liquid-glass overflow-hidden">
                <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-border)' }}>
                  <h3 className="font-extrabold">Recent Orders</h3>
                  <a href="/admin/orders" className="text-xs text-brand-600 dark:text-violet-400 font-bold hover:underline flex items-center gap-1">
                    View all <ChevronRight className="w-3 h-3" />
                  </a>
                </div>
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Order</th>
                        <th>Product</th>
                        <th>Amount</th>
                        <th>Cashback</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentOrders.length === 0 ? (
                        <tr><td colSpan={5} className="text-center py-8 text-slate-400">No orders yet</td></tr>
                      ) : recentOrders.map(o => (
                        <tr key={o.id}>
                          <td>
                            <p className="font-mono text-xs font-bold">{o.orderNo?.slice(0, 20)}...</p>
                            <p className="text-[10px] text-slate-400">{o.orderDate}</p>
                          </td>
                          <td>
                            <p className="text-sm font-semibold line-clamp-1">{o.productName}</p>
                            <p className="text-xs text-slate-400">{o.platform}</p>
                          </td>
                          <td className="font-bold text-sm">{formatINR(o.productPrice)}</td>
                          <td className="font-bold text-sm text-emerald-600">{formatINR(o.cashbackAmount)}</td>
                          <td><StatusBadge status={o.currentStatus} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Tickets & Announcements */}
              <div className="space-y-4">
                <div className="premium-card liquid-glass overflow-hidden">
                  <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-border)' }}>
                    <h3 className="font-extrabold text-sm">Open Tickets</h3>
                    <a href="/admin/tickets" className="text-xs text-brand-600 dark:text-violet-400 font-bold">View all</a>
                  </div>
                  {recentTickets.filter(t => t.status === 'open').length === 0 ? (
                    <div className="text-center py-6">
                      <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-1" />
                      <p className="text-xs text-slate-400">No open tickets 🎉</p>
                    </div>
                  ) : (
                    <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                      {recentTickets.filter(t => t.status === 'open').slice(0, 3).map(t => (
                        <div key={t.id} className="px-4 py-3">
                          <p className="text-xs font-bold line-clamp-1">{t.title}</p>
                          <p className="text-[10px] text-slate-400">{t.category} · {t.createdAt?.slice(0, 10)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="premium-card liquid-glass overflow-hidden">
                  <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-border)' }}>
                    <h3 className="font-extrabold text-sm">Announcements</h3>
                    <a href="/admin/announcements" className="text-xs text-brand-600 dark:text-violet-400 font-bold">Manage</a>
                  </div>
                  {announcements.length === 0 ? (
                    <div className="text-center py-6">
                      <Megaphone className="w-6 h-6 text-slate-300 dark:text-slate-600 mx-auto mb-1" />
                      <p className="text-xs text-slate-400">No active announcements</p>
                    </div>
                  ) : (
                    <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                      {announcements.slice(0, 3).map(a => (
                        <div key={a.id} className="px-4 py-3">
                          <div className="flex items-center gap-1 mb-0.5">
                            {a.priority === 'urgent' && <span className="badge badge-rose text-[9px]">Urgent</span>}
                            {a.priority !== 'urgent' && <span className="badge badge-blue text-[9px]">Active</span>}
                          </div>
                          <p className="text-xs font-bold">{a.title}</p>
                          <p className="text-[10px] text-slate-400 line-clamp-1">{a.body}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Feature 20: Recent Refunds ── */}
            <div className="premium-card liquid-glass card-accent-rose overflow-hidden">
              <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-border)' }}>
                <h3 className="font-extrabold">Recent Refund Requests</h3>
                <a href="/admin/refunds" className="text-xs text-brand-600 dark:text-violet-400 font-bold hover:underline flex items-center gap-1">
                  All refunds <ChevronRight className="w-3 h-3" />
                </a>
              </div>
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Order No</th>
                      <th>Buyer</th>
                      <th>Reason</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Submitted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentRefunds.length === 0 ? (
                      <tr><td colSpan={6} className="text-center py-8 text-slate-400">No refund requests</td></tr>
                    ) : recentRefunds.map(r => (
                      <tr key={r.id}>
                        <td className="font-mono text-xs font-bold">{r.orderNo}</td>
                        <td className="text-sm font-semibold">{r.userName}</td>
                        <td className="text-sm text-slate-500 line-clamp-1">{r.reason}</td>
                        <td className="font-bold text-rose-500">{formatINR(r.amount)}</td>
                        <td><StatusBadge status={r.status} /></td>
                        <td className="text-xs text-slate-400">{r.submittedAt?.slice(0, 10)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer navigation */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pb-4">
              {[
                { href: '/admin/orders', icon: ShoppingBag, label: 'Manage Orders', desc: 'View, filter, bulk actions' },
                { href: '/admin/users', icon: Users, label: 'Manage Users', desc: 'Suspend, verify, impersonate' },
                { href: '/admin/deals', icon: Tag, label: 'Manage Deals', desc: 'Create, edit, clone deals' },
                { href: '/admin/analytics', icon: BarChart3, label: 'Analytics', desc: 'Revenue charts & reports' },
              ].map(item => {
                const Icon = item.icon;
                return (
                  <a key={item.href} href={item.href} className="premium-card liquid-glass p-4 hover:shadow-card-hover transition-all group">
                    <Icon className="w-5 h-5 text-brand-600 dark:text-violet-400 mb-2" />
                    <p className="font-bold text-sm group-hover:text-brand-600 dark:group-hover:text-violet-400 transition-colors">{item.label}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
                  </a>
                );
              })}
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
