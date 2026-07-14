import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks/useAuth';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import {
  BarChart3, Users, ShoppingBag, TrendingUp, DollarSign,
  Ticket, Tag, RefreshCw, AlertTriangle, ArrowLeft,
  TrendingDown, Activity, ChevronRight
} from 'lucide-react';

interface Analytics {
  totalOrders: number;
  paidOrders: number;
  pendingOrders: number;
  totalCashbackPaid: number;
  totalWithdrawals: number;
  activeBuyers: number;
  activeDeals: number;
  openTickets: number;
}

function formatINR(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

export default function AdminAnalytics() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [revenueData, setRevenueData] = useState<any>(null);
  const [dealsData, setDealsData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const toggleDark = () => {
    const isDark = !darkMode;
    setDarkMode(isDark);
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  };

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const [resSummary, resRevenue, resDeals] = await Promise.all([
        fetch('/api/analytics/summary'),
        fetch('/api/analytics/revenue?days=14'),
        fetch('/api/analytics/deals')
      ]);

      if (resSummary.ok) setAnalytics(await resSummary.json());
      if (resRevenue.ok) setRevenueData(await resRevenue.json());
      if (resDeals.ok) setDealsData(await resDeals.json());

      setLastUpdated(new Date().toLocaleTimeString());
    } catch (e) {
      console.error('Failed to fetch analytics', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') { setDarkMode(true); document.documentElement.classList.add('dark'); }
    if (isAuthenticated) fetchAnalytics();
  }, [isAuthenticated, fetchAnalytics]);

  return (
    <>
      <Head>
        <title>Intelligence & Analytics — Admin Portal</title>
      </Head>

      <div className="min-h-screen flex" style={{ background: 'var(--color-bg)' }}>
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} darkMode={darkMode} />

        <div className="flex-1 flex flex-col min-h-screen transition-all duration-300"
          style={{ marginLeft: sidebarCollapsed ? 72 : 260 }}>
          <Header title="Intelligence" darkMode={darkMode} onToggleDark={toggleDark} sidebarCollapsed={sidebarCollapsed} />

          <main className="flex-1 p-6 pt-[88px] space-y-6 animate-fade-up">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="page-title flex items-center gap-2">
                  <BarChart3 className="w-6 h-6 text-brand-600 dark:text-violet-400" />
                  Analytics Hub
                </h1>
                <p className="page-subtitle">Live platform KPIs and business metrics</p>
              </div>
              <div className="flex items-center gap-3">
                {lastUpdated && <span className="text-xs text-slate-400">Updated {lastUpdated}</span>}
                <button onClick={fetchAnalytics} className="btn btn-primary btn-sm">
                  <RefreshCw className="w-3.5 h-3.5" />
                  Refresh
                </button>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}
              </div>
            ) : (
              <>
                {/* Stats Grid */}
                {analytics && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { icon: ShoppingBag, label: "Total Orders", value: analytics.totalOrders.toLocaleString(), color: "bg-indigo-500", bg: "card-accent-navy" },
                      { icon: TrendingUp, label: "Paid Orders", value: analytics.paidOrders.toLocaleString(), color: "bg-emerald-500", bg: "card-accent-emerald", sub: `${analytics.pendingOrders} pending` },
                      { icon: DollarSign, label: "Cashback Paid", value: formatINR(analytics.totalCashbackPaid), color: "bg-brand-500", bg: "card-accent-violet" },
                      { icon: DollarSign, label: "Withdrawals", value: formatINR(analytics.totalWithdrawals), color: "bg-amber-500", bg: "card-accent-amber" },
                      { icon: Users, label: "Active Buyers", value: analytics.activeBuyers.toLocaleString(), color: "bg-violet-500", bg: "" },
                      { icon: Tag, label: "Active Deals", value: analytics.activeDeals.toLocaleString(), color: "bg-cyan-500", bg: "" },
                      { icon: Ticket, label: "Open Tickets", value: analytics.openTickets.toLocaleString(), color: analytics.openTickets > 10 ? "bg-rose-500" : "bg-slate-500", bg: analytics.openTickets > 10 ? "card-accent-rose animate-pulse" : "" },
                      {
                        icon: BarChart3,
                        label: "Order Fill Rate",
                        value: analytics.totalOrders > 0 ? `${Math.round((analytics.paidOrders / analytics.totalOrders) * 100)}%` : 'N/A',
                        color: "bg-pink-500",
                        bg: "",
                        sub: "Paid / Total Orders"
                      }
                    ].map(card => {
                      const Icon = card.icon;
                      return (
                        <div key={card.label} className={`premium-card p-5 ${card.bg}`}>
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${card.color} mb-3`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <p className="text-2xl font-extrabold font-mono">{card.value}</p>
                          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">{card.label}</p>
                          {card.sub && <p className="text-[10px] text-slate-400 mt-0.5">{card.sub}</p>}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Open Ticket Alert */}
                {analytics && analytics.openTickets > 5 && (
                  <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-2xl text-sm text-amber-700 dark:text-amber-400 animate-slide-in">
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                    <span><strong>{analytics.openTickets} open support tickets</strong> need attention. Visit the <button onClick={() => router.push('/admin/tickets')} className="underline font-bold">Tickets desk</button>.</span>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Revenue Trend Chart */}
                  <div className="lg:col-span-2 premium-card p-5">
                    <h3 className="font-extrabold text-base mb-4">Daily Revenue (Last 14 Days)</h3>
                    {revenueData ? (
                      <>
                        <div className="flex items-end gap-1.5 h-48 mb-2">
                          {(revenueData.data || []).map((d: any, i: number) => {
                            const max = Math.max(...(revenueData.data || []).map((x: any) => x.revenue)) || 1;
                            const pct = (d.revenue / max) * 100;
                            return (
                              <div key={i} className="flex-1 flex flex-col justify-end group relative" title={`${d.date}: ${formatINR(d.revenue)}`}>
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10 bg-slate-800 text-white text-[10px] font-bold py-1 px-2 rounded whitespace-nowrap shadow-md">
                                  {formatINR(d.revenue)}
                                </div>
                                <div
                                  className="rounded-t-md bg-gradient-to-t from-brand-600 to-indigo-400 dark:from-violet-600 dark:to-brand-400 opacity-80 hover:opacity-100 transition-all duration-200 cursor-pointer"
                                  style={{ height: `${Math.max(pct, 3)}%` }}
                                />
                              </div>
                            );
                          })}
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400 mt-2">
                          {(revenueData.data || []).map((d: any, i: number) => (
                            <span key={d.date} className={i % 2 === 0 ? '' : 'hidden sm:inline'}>{d.date.slice(5)}</span>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-12 text-slate-400">No revenue data available</div>
                    )}
                  </div>

                  {/* Deal performance metrics */}
                  <div className="premium-card p-5 overflow-hidden">
                    <h3 className="font-extrabold text-base mb-4">Top Performing Deals</h3>
                    <div className="space-y-3">
                      {dealsData.slice(0, 5).map(deal => {
                        const rate = deal.totalOrders > 0 ? Math.round((deal.paidOrders / deal.totalOrders) * 100) : 0;
                        return (
                          <div key={deal.dealId} className="flex items-center justify-between text-xs py-2 border-b dark:border-slate-800 last:border-0">
                            <div className="min-w-0 flex-1 pr-3">
                              <p className="font-bold truncate">{deal.productName}</p>
                              <p className="text-[10px] text-slate-400">{deal.platform} · {deal.totalOrders} claims</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-emerald-500">{rate}% Fill</p>
                              <p className="text-[10px] text-slate-400">{deal.slotsRemaining} slots</p>
                            </div>
                          </div>
                        );
                      })}
                      {dealsData.length === 0 && (
                        <p className="text-xs text-slate-400 text-center py-8">No live deals to track</p>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </main>
        </div>
      </div>
    </>
  );
}
