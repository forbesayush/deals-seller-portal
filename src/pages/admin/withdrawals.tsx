import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useAuth } from '@/hooks/useAuth';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { RefreshCw, CheckCircle2, XCircle, Loader2, Check, X, CreditCard, ArrowDownToLine } from 'lucide-react';

interface Withdrawal {
  id: string;
  userId: string;
  upi: string;
  amount: number;
  status: string;
  createdAt: string;
  processedAt: string | null;
}

function formatINR(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    approved: 'badge-emerald',
    rejected: 'badge-rose',
    pending: 'badge-amber',
  };
  return <span className={`badge ${map[status] || 'badge-slate'} text-[10px] uppercase`}>{status}</span>;
}

export default function AdminWithdrawals() {
  const { user } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const toggleDark = () => {
    const isDark = !darkMode;
    setDarkMode(isDark);
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  };

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
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') { setDarkMode(true); document.documentElement.classList.add('dark'); }
    fetchWithdrawals();
  }, []);

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
    <>
      <Head>
        <title>Payout Requests — Admin Panel</title>
      </Head>

      <div className="min-h-screen flex" style={{ background: 'var(--color-bg)' }}>
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} darkMode={darkMode} />

        <div className="flex-1 flex flex-col min-h-screen transition-all duration-300"
          style={{ marginLeft: sidebarCollapsed ? 72 : 260 }}>
          <Header title="Payout Manager" darkMode={darkMode} onToggleDark={toggleDark} sidebarCollapsed={sidebarCollapsed} />

          <main className="flex-1 p-6 pt-[88px] space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="page-title flex items-center gap-2">
                  <CreditCard className="w-6 h-6 text-brand-600 dark:text-violet-400" />
                  Withdrawal Requests
                </h1>
                <p className="page-subtitle">Process pending user payout transfers</p>
              </div>
              <button onClick={fetchWithdrawals} className="btn btn-ghost btn-sm">
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
            <div className="premium-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Request ID</th>
                      <th>User ID</th>
                      <th>UPI Address</th>
                      <th className="text-right">Amount</th>
                      <th>Status</th>
                      <th>Submitted At</th>
                      <th className="text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
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
                        <tr key={wth.id}>
                          <td className="text-xs font-mono font-bold text-slate-500">{wth.id}</td>
                          <td className="font-bold">{wth.userId}</td>
                          <td className="text-xs font-mono text-indigo-500 dark:text-indigo-400">{wth.upi}</td>
                          <td className="text-right font-extrabold text-slate-800 dark:text-slate-200">
                            {formatINR(wth.amount)}
                          </td>
                          <td>
                            <StatusBadge status={wth.status} />
                          </td>
                          <td className="text-xs text-slate-400">{new Date(wth.createdAt).toLocaleString()}</td>
                          <td>
                            <div className="flex justify-center gap-2">
                              {wth.status === 'pending' ? (
                                <>
                                  <button
                                    onClick={() => handleReviewWithdrawal(wth.id, 'approved')}
                                    disabled={actionLoading !== null}
                                    className="p-1 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg transition-all"
                                    title="Approve Payout"
                                  >
                                    {actionLoading === wth.id ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Check className="w-4 h-4" />
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
                                      <X className="w-4 h-4" />
                                    )}
                                  </button>
                                </>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-semibold">Processed</span>
                              )}
                            </div>
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
      </div>
    </>
  );
}
