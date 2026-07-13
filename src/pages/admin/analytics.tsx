import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks/useAuth';
import { BarChart2, Users, ShoppingBag, TrendingUp, IndianRupee, Ticket, Tag, RefreshCw, AlertTriangle } from 'lucide-react';

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

function StatCard({ icon: Icon, label, value, color, sub }: { icon: any; label: string; value: string | number; color: string; sub?: string }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/60 dark:border-slate-800/60 flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow">
      <div className={`rounded-xl p-3 ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
        <p className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function AdminAnalytics() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/analytics/summary');
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
        setLastUpdated(new Date().toLocaleTimeString());
      }
    } catch (e) {
      console.error('Failed to fetch analytics', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !['admin', 'super_admin', 'manager'].includes(user?.role || ''))) {
      router.push('/login');
      return;
    }
    if (isAuthenticated) fetchAnalytics();
  }, [authLoading, isAuthenticated, user]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(fetchAnalytics, 60000);
    return () => clearInterval(interval);
  }, [isAuthenticated, fetchAnalytics]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-400">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <BarChart2 className="w-6 h-6 text-brand-500" />
              Analytics Dashboard
            </h1>
            <p className="text-sm text-slate-400 mt-1">Live platform KPIs and business metrics</p>
          </div>
          <div className="flex items-center gap-3">
            {lastUpdated && <span className="text-xs text-slate-400">Updated {lastUpdated}</span>}
            <button onClick={fetchAnalytics} className="flex items-center gap-1.5 px-3 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold text-xs transition-colors">
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
            <button onClick={() => router.push('/admin/dashboard')} className="px-3 py-2 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 rounded-xl transition-colors">
              ← Dashboard
            </button>
          </div>
        </div>

        {analytics && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={ShoppingBag} label="Total Orders" value={analytics.totalOrders.toLocaleString()} color="bg-indigo-500" />
            <StatCard icon={TrendingUp} label="Paid Orders" value={analytics.paidOrders.toLocaleString()} color="bg-emerald-500" sub={`${analytics.pendingOrders} pending review`} />
            <StatCard icon={IndianRupee} label="Cashback Paid" value={`₹${analytics.totalCashbackPaid.toLocaleString()}`} color="bg-brand-500" />
            <StatCard icon={IndianRupee} label="Withdrawals" value={`₹${analytics.totalWithdrawals.toLocaleString()}`} color="bg-amber-500" />
            <StatCard icon={Users} label="Active Buyers" value={analytics.activeBuyers.toLocaleString()} color="bg-violet-500" />
            <StatCard icon={Tag} label="Active Deals" value={analytics.activeDeals.toLocaleString()} color="bg-cyan-500" />
            <StatCard icon={Ticket} label="Open Tickets" value={analytics.openTickets.toLocaleString()} color={analytics.openTickets > 10 ? 'bg-rose-500' : 'bg-slate-500'} />
            <StatCard
              icon={BarChart2}
              label="Order Fill Rate"
              value={analytics.totalOrders > 0 ? `${Math.round((analytics.paidOrders / analytics.totalOrders) * 100)}%` : 'N/A'}
              color="bg-pink-500"
              sub="Paid / Total Orders"
            />
          </div>
        )}

        {analytics && analytics.openTickets > 5 && (
          <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-2xl text-sm text-amber-700 dark:text-amber-400">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span><strong>{analytics.openTickets} open support tickets</strong> need attention. Visit the <button onClick={() => router.push('/admin/tickets')} className="underline font-bold">Tickets desk</button>.</span>
          </div>
        )}
      </div>
    </div>
  );
}
