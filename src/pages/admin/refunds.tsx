import React, { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import { useAuth } from '@/hooks/useAuth';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import {
  Search, RefreshCw, Download, CheckCircle2, XCircle, AlertCircle,
  Clock, ShieldAlert, CheckCircle, Loader2, Check, X, ChevronRight,
  ArrowDownToLine, DollarSign
} from 'lucide-react';

interface Refund {
  id: string;
  orderId: string | null;
  orderNo: string;
  userId: string;
  userName: string;
  reason: string;
  description: string | null;
  upi: string | null;
  amount: number;
  status: string; // pending, under_review, resolved, rejected
  submittedAt: string; // ISO string
  reviewedAt: string | null;
  resolvedAt: string | null;
}

function formatINR(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    resolved: 'badge-emerald',
    rejected: 'badge-rose',
    under_review: 'badge-amber',
    pending: 'badge-slate',
  };
  const labels: Record<string, string> = {
    resolved: 'Resolved',
    rejected: 'Rejected',
    under_review: 'Under Review',
    pending: 'Pending',
  };
  return <span className={`badge ${map[status] || 'badge-slate'} text-[10px] uppercase`}>{labels[status] || status}</span>;
}

export default function RefundHandler() {
  const { user } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals & Alerts
  const [selectedRefund, setSelectedRefund] = useState<Refund | null>(null);
  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const toggleDark = () => {
    const isDark = !darkMode;
    setDarkMode(isDark);
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  };

  const fetchRefunds = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/refunds');
      const data = await res.json();
      if (res.ok) {
        setRefunds(data);
      }
    } catch (e) {
      console.error("Error loading refunds", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') { setDarkMode(true); document.documentElement.classList.add('dark'); }
    fetchRefunds();
  }, []);

  const handleUpdateStatus = async (refundId: string, newStatus: string) => {
    setActionLoading(refundId);
    setAlertMsg(null);
    try {
      const res = await fetch(`/api/refunds/${refundId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (res.ok) {
        setAlertMsg({ type: 'success', text: `Refund request is now ${newStatus.replace('_', ' ')}.` });
        if (selectedRefund?.id === refundId) {
          setSelectedRefund(data);
        }
        fetchRefunds();
      } else {
        setAlertMsg({ type: 'error', text: data.detail || 'Failed to update refund status.' });
      }
    } catch (e) {
      setAlertMsg({ type: 'error', text: 'Network error updating refund.' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleExport = () => {
    window.open('/api/reports/export?type=refunds&format=csv', '_blank');
  };

  const getStageStats = () => {
    let fresh = 0;      // 0 - 6 hours
    let standard = 0;   // 6 - 24 hours
    let delayed = 0;    // 24 - 36 hours
    let escalated = 0;  // 36+ hours
    let resolved = 0;   // resolved / rejected

    const now = new Date().getTime();

    refunds.forEach(r => {
      if (r.status === 'resolved' || r.status === 'rejected') {
        resolved++;
        return;
      }

      const submittedTime = new Date(r.submittedAt).getTime();
      const ageHours = (now - submittedTime) / (1000 * 60 * 60);

      if (ageHours <= 6) fresh++;
      else if (ageHours <= 24) standard++;
      else if (ageHours <= 36) delayed++;
      else escalated++;
    });

    return { fresh, standard, delayed, escalated, resolved };
  };

  const stageStats = getStageStats();

  const filteredRefunds = refunds.filter(r => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const match =
        r.orderNo.toLowerCase().includes(query) ||
        r.userName.toLowerCase().includes(query) ||
        r.reason.toLowerCase().includes(query) ||
        r.userId.toLowerCase().includes(query) ||
        (r.upi && r.upi.toLowerCase().includes(query));
      if (!match) return false;
    }
    if (statusFilter === 'all') return true;
    return r.status === statusFilter;
  });

  return (
    <>
      <Head>
        <title>Refund Handler — Admin Portal</title>
      </Head>

      <div className="min-h-screen flex" style={{ background: 'var(--color-bg)' }}>
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} darkMode={darkMode} />

        <div className="flex-1 flex flex-col min-h-screen transition-all duration-300"
          style={{ marginLeft: sidebarCollapsed ? 72 : 260 }}>
          <Header title="Refund Handler" darkMode={darkMode} onToggleDark={toggleDark} sidebarCollapsed={sidebarCollapsed} />

          <main className="flex-1 p-6 pt-[88px] space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="page-title">Refund & Claim Handler</h1>
                <p className="page-subtitle">{refunds.length} total claims</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={handleExport} className="btn btn-secondary btn-sm">
                  <Download className="w-4 h-4 text-emerald-500" /> Export CSV
                </button>
                <button onClick={fetchRefunds} className="btn btn-ghost btn-sm">
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Visual Timeline / Age Stages Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { label: 'Urgent Review', time: '0 - 6hr', count: stageStats.fresh, color: 'card-accent-emerald text-emerald-600 dark:text-emerald-400' },
                { label: 'Standard Age', time: '6 - 24hr', count: stageStats.standard, color: 'card-accent-navy text-blue-600 dark:text-blue-400' },
                { label: 'Delayed Age', time: '24 - 36hr', count: stageStats.delayed, color: 'card-accent-amber text-amber-500' },
                { label: 'Escalated Age', time: '36hr+', count: stageStats.escalated, color: 'card-accent-rose text-rose-500 glow-active' },
                { label: 'Resolved Tasks', time: 'Completed', count: stageStats.resolved, color: 'text-slate-400 dark:text-slate-500' }
              ].map((stage, idx) => (
                <div key={idx} className={`premium-card p-4 text-center ${stage.color}`}>
                  <p className="text-[10px] font-bold uppercase tracking-wider opacity-75">{stage.label}</p>
                  <p className="text-2xl font-black mt-1">{stage.count}</p>
                  <p className="text-[9px] font-semibold opacity-60 mt-1">{stage.time}</p>
                </div>
              ))}
            </div>

            {/* Actions Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by order ID, buyer name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input pl-9"
                />
              </div>
            </div>

            {/* Feedback Alert */}
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

            {/* Status Filters */}
            <div className="flex gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
              {[
                { id: 'all', label: 'All Requests' },
                { id: 'pending', label: 'Pending Claims' },
                { id: 'under_review', label: 'Under Review' },
                { id: 'resolved', label: 'Resolved (Paid)' },
                { id: 'rejected', label: 'Rejected' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                    statusFilter === tab.id
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Table layout */}
            <div className="premium-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Refund ID</th>
                      <th>Order No</th>
                      <th>Buyer Name</th>
                      <th>Reason / Details</th>
                      <th className="text-right">Amount</th>
                      <th>Status</th>
                      <th className="text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400">
                          <div className="flex items-center justify-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
                            <span>Fetching payout claims...</span>
                          </div>
                        </td>
                      </tr>
                    ) : filteredRefunds.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400">
                          No refund requests found.
                        </td>
                      </tr>
                    ) : (
                      filteredRefunds.map(refund => (
                        <tr key={refund.id}>
                          <td>
                            <button
                              onClick={() => setSelectedRefund(refund)}
                              className="font-bold text-brand-600 hover:text-brand-700 dark:text-brand-400 hover:underline"
                            >
                              {refund.id}
                            </button>
                            <p className="text-[10px] text-slate-400 font-semibold">{refund.submittedAt.replace('T', ' ')}</p>
                          </td>
                          <td className="font-bold text-slate-800 dark:text-slate-100">
                            #{refund.orderNo}
                          </td>
                          <td>
                            <p className="text-slate-800 dark:text-slate-200 font-bold">{refund.userName}</p>
                            <p className="text-[10px] text-slate-400 font-semibold uppercase">{refund.userId}</p>
                          </td>
                          <td className="max-w-xs truncate">
                            <p className="font-bold text-slate-700 dark:text-slate-300">{refund.reason}</p>
                            <p className="text-xs text-slate-400 font-medium italic truncate">{refund.description || 'No comment provided.'}</p>
                          </td>
                          <td className="text-right font-black text-slate-800 dark:text-slate-100">
                            {formatINR(refund.amount)}
                          </td>
                          <td>
                            <StatusBadge status={refund.status} />
                          </td>
                          <td>
                            <div className="flex items-center justify-center gap-1.5">
                              {refund.status === 'pending' && (
                                <button
                                  onClick={() => handleUpdateStatus(refund.id, 'under_review')}
                                  disabled={actionLoading === refund.id}
                                  className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/20 dark:hover:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg text-xs font-bold transition-colors"
                                >
                                  Review
                                </button>
                              )}
                              {refund.status !== 'resolved' && refund.status !== 'rejected' && (
                                <>
                                  <button
                                    onClick={() => handleUpdateStatus(refund.id, 'resolved')}
                                    disabled={actionLoading === refund.id}
                                    className="p-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:hover:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg transition-colors"
                                    title="Resolve & Pay"
                                  >
                                    {actionLoading === refund.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                  </button>
                                  <button
                                    onClick={() => handleUpdateStatus(refund.id, 'rejected')}
                                    disabled={actionLoading === refund.id}
                                    className="p-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-lg transition-colors"
                                    title="Reject Request"
                                  >
                                    {actionLoading === refund.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                                  </button>
                                </>
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

      {/* Details Slide-Over */}
      {selectedRefund && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/40 backdrop-blur-xs transition-opacity duration-300" onClick={() => setSelectedRefund(null)}>
          <div className="w-full max-w-lg h-full bg-white dark:bg-slate-900 shadow-glass border-l border-slate-200/50 dark:border-slate-800/50 p-8 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-300" onClick={e => e.stopPropagation()}>
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
                <div>
                  <h3 className="font-extrabold text-lg text-slate-800 dark:text-slate-100">Refund Payout Details</h3>
                  <p className="text-xs text-slate-400 font-semibold uppercase">ID: {selectedRefund.id}</p>
                </div>
                <button
                  onClick={() => setSelectedRefund(null)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              {/* Status Banner */}
              <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/30 p-4 rounded-2xl">
                <span className="text-sm font-bold text-slate-500">Processing Status</span>
                <StatusBadge status={selectedRefund.status} />
              </div>

              {/* Grid Information */}
              <div className="grid grid-cols-2 gap-6 text-sm font-medium">
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Parent Order No</p>
                  <p className="font-bold text-slate-800 dark:text-slate-100 mt-1">#{selectedRefund.orderNo}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">UPI Address for Transfer</p>
                  <p className="font-bold text-brand-600 dark:text-brand-400 mt-1">{selectedRefund.upi || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Buyer Name</p>
                  <p className="font-bold text-slate-800 dark:text-slate-100 mt-1">{selectedRefund.userName}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Buyer Account Code</p>
                  <p className="font-bold text-slate-800 dark:text-slate-100 mt-1">{selectedRefund.userId}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Refund Reason</p>
                  <p className="font-bold text-slate-800 dark:text-slate-100 mt-1">{selectedRefund.reason}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Additional Description</p>
                  <p className="font-bold text-slate-600 dark:text-slate-300 mt-1 p-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-200/50 dark:border-slate-800/30 italic">
                    {selectedRefund.description || 'No additional commentary supplied by user.'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Submission Date</p>
                  <p className="font-bold text-slate-800 dark:text-slate-100 mt-1">{selectedRefund.submittedAt.replace('T', ' ')}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Resolved Date</p>
                  <p className="font-bold text-slate-800 dark:text-slate-100 mt-1">{selectedRefund.resolvedAt ? selectedRefund.resolvedAt.replace('T', ' ') : 'Not yet resolved'}</p>
                </div>
              </div>

              {/* Total payout */}
              <div className="bg-slate-50 dark:bg-slate-800/20 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-5 flex justify-between items-center">
                <span className="text-sm font-extrabold text-slate-700 dark:text-slate-300">Total Refund Claim Payout</span>
                <span className="text-2xl font-black text-emerald-500">{formatINR(selectedRefund.amount)}</span>
              </div>
            </div>

            {/* Actions footer */}
            <div className="border-t border-slate-200 dark:border-slate-800 pt-6 flex items-center justify-end gap-3">
              {selectedRefund.status !== 'resolved' && selectedRefund.status !== 'rejected' && (
                <>
                  {selectedRefund.status === 'pending' && (
                    <button
                      onClick={() => handleUpdateStatus(selectedRefund.id, 'under_review')}
                      disabled={actionLoading === selectedRefund.id}
                      className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-sm transition-all"
                    >
                      Put Under Review
                    </button>
                  )}
                  <button
                    onClick={() => handleUpdateStatus(selectedRefund.id, 'rejected')}
                    disabled={actionLoading === selectedRefund.id}
                    className="px-4 py-2.5 border border-rose-200 hover:bg-rose-50 dark:border-rose-900/30 dark:hover:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-xl font-bold text-sm transition-all"
                  >
                    Reject Claim
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(selectedRefund.id, 'resolved')}
                    disabled={actionLoading === selectedRefund.id}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-all shadow-md shadow-emerald-200 dark:shadow-none"
                  >
                    Approve & Credit Wallet
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
