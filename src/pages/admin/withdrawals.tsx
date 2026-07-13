import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, RefreshCw, LogOut, Sun, Moon, CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface Withdrawal {
  id: string;
  userId: string;
  upi: string;
  amount: number;
  status: string;
  createdAt: string;
  processedAt: string | null;
}

export default function AdminWithdrawals() {
  const { user, logout } = useAuth();
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const fetchWithdrawals = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/withdrawals');
      const data = await res.json();
      if (res.ok) {
        setWithdrawals(data);
      }
    } catch (e) {
      console.error("Error loading withdrawals", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWithdrawals();
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

  const handleReviewWithdrawal = async (wthId: string, status: 'approved' | 'rejected') => {
    setActionLoading(wthId);
    setAlertMsg(null);
    try {
      const res = await fetch(`/api/withdrawals/${wthId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (res.ok) {
        setAlertMsg({ type: 'success', text: `Withdrawal request successfully ${status}.` });
        fetchWithdrawals();
      } else {
        setAlertMsg({ type: 'error', text: data.detail || 'Failed to review withdrawal.' });
      }
    } catch (e) {
      setAlertMsg({ type: 'error', text: 'Network error processing withdrawal.' });
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <Head>
        <title>Payout Requests - Admin Panel</title>
      </Head>

      {/* Navigation Header */}
      <header className="glass-panel sticky top-0 z-40 border-b border-slate-200/50 dark:border-slate-800/50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a
            href="/admin/dashboard"
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 text-slate-500 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </a>
          <div>
            <h1 className="font-extrabold text-lg tracking-tight">Payout Manager</h1>
            <p className="text-xs text-slate-400 font-semibold uppercase">Manage UPI Withdrawal Claims</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight">Withdrawal Requests</h2>
            <p className="text-xs text-slate-400 font-semibold mt-1">Deduct cleared user balances, pending UPI transfers.</p>
          </div>
          <button
            onClick={fetchWithdrawals}
            className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {alertMsg && (
          <div className={`p-4 rounded-xl text-sm border flex items-center justify-between ${
            alertMsg.type === 'success' 
              ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-950/50' 
              : 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-950/50'
          }`}>
            <span>{alertMsg.text}</span>
            <button onClick={() => setAlertMsg(null)} className="text-xs font-bold uppercase tracking-wider opacity-70 hover:opacity-100">Dismiss</button>
          </div>
        )}

        {/* Data Table */}
        <div className="glass-panel rounded-3xl overflow-hidden border border-slate-200/50 dark:border-slate-800/50 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/50 dark:bg-slate-900/30 text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-wider border-b border-slate-200/50 dark:border-slate-800/50">
                  <th className="py-4 px-6">Request ID</th>
                  <th className="py-4 px-6">User ID</th>
                  <th className="py-4 px-6">UPI Address</th>
                  <th className="py-4 px-6 text-right">Amount</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6">Submitted At</th>
                  <th className="py-4 px-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/50 dark:divide-slate-800/50 text-sm font-medium">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
                        <span>Loading withdrawal database...</span>
                      </div>
                    </td>
                  </tr>
                ) : withdrawals.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No withdrawal requests submitted.
                    </td>
                  </tr>
                ) : (
                  withdrawals.map(wth => (
                    <tr key={wth.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors">
                      <td className="py-4 px-6 text-xs font-mono font-bold text-slate-500">{wth.id}</td>
                      <td className="py-4 px-6 font-bold">{wth.userId}</td>
                      <td className="py-4 px-6 text-xs font-mono text-indigo-500 dark:text-indigo-400">{wth.upi}</td>
                      <td className="py-4 px-6 text-right font-extrabold text-slate-700 dark:text-slate-200">
                        ₹{wth.amount.toLocaleString()}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                          wth.status === 'approved'
                            ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400'
                            : wth.status === 'rejected'
                            ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400'
                            : 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400'
                        }`}>
                          {wth.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-xs text-slate-400">{new Date(wth.createdAt).toLocaleString()}</td>
                      <td className="py-4 px-6 text-center">
                        {wth.status === 'pending' ? (
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => handleReviewWithdrawal(wth.id, 'approved')}
                              disabled={actionLoading !== null}
                              className="p-1 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg transition-all"
                              title="Approve Payout"
                            >
                              {actionLoading === wth.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <CheckCircle className="w-4 h-4" />
                              )}
                            </button>
                            <button
                              onClick={() => handleReviewWithdrawal(wth.id, 'rejected')}
                              disabled={actionLoading !== null}
                              className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-all"
                              title="Reject & Revert Funds"
                            >
                              {actionLoading === wth.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <XCircle className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-semibold">Processed</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
