import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useAuth } from '@/hooks/useAuth';
import { 
  Search, ArrowLeft, RefreshCw, Sun, Moon, LogOut, Loader2, Check,
  XCircle, AlertCircle, Clock, ShieldAlert, CheckCircle, Download
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

export default function RefundHandler() {
  const { user, logout } = useAuth();
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Modals & Alerts
  const [selectedRefund, setSelectedRefund] = useState<Refund | null>(null);
  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

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
    fetchRefunds();
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

  // Helper: Calculate stage counts based on refund creation age
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
    // 1. Search Query
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

    // 2. Status Tab Filter
    if (statusFilter === 'all') return true;
    return r.status === statusFilter;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'resolved':
        return <span className="px-2.5 py-1 text-xs font-bold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 rounded-full border border-emerald-200/50 dark:border-emerald-900/30 uppercase">Resolved</span>;
      case 'rejected':
        return <span className="px-2.5 py-1 text-xs font-bold bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 rounded-full border border-rose-200/50 dark:border-rose-900/30 uppercase">Rejected</span>;
      case 'under_review':
        return <span className="px-2.5 py-1 text-xs font-bold bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 rounded-full border border-amber-200/50 dark:border-amber-900/30 uppercase">Under Review</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full border border-slate-200/50 dark:border-slate-800/50 uppercase">Pending</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <Head>
        <title>Refund Handler - deals.seller MIS</title>
      </Head>

      {/* Navigation Header */}
      <header className="glass-panel sticky top-0 z-40 border-b border-slate-200/50 dark:border-slate-800/50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a href="/admin/dashboard" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </a>
          <div>
            <h1 className="font-extrabold text-lg tracking-tight">Refund Handler</h1>
            <p className="text-xs text-slate-400 font-semibold tracking-wider uppercase">Enterprise MIS</p>
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

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        
        {/* Visual Timeline / Age Stages Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Urgent Review', time: '0 - 6hr', count: stageStats.fresh, color: 'border-emerald-500/30 text-emerald-600 bg-emerald-500/5' },
            { label: 'Standard Age', time: '6 - 24hr', count: stageStats.standard, color: 'border-blue-500/30 text-blue-600 bg-blue-500/5' },
            { label: 'Delayed Age', time: '24 - 36hr', count: stageStats.delayed, color: 'border-amber-500/30 text-amber-600 bg-amber-500/5' },
            { label: 'Escalated Age', time: '36hr+', count: stageStats.escalated, color: 'border-rose-500/30 text-rose-600 bg-rose-500/5 glow-active' },
            { label: 'Resolved Tasks', time: 'Completed', count: stageStats.resolved, color: 'border-slate-200 dark:border-slate-800 text-slate-400 bg-slate-100/5' }
          ].map((stage, idx) => (
            <div key={idx} className={`border rounded-2xl p-4 text-center ${stage.color} shadow-sm`}>
              <p className="text-[10px] font-bold uppercase tracking-wider opacity-75">{stage.label}</p>
              <p className="text-2xl font-black mt-1.5">{stage.count}</p>
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
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm px-9 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all shadow-sm"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-bold text-sm shadow-sm transition-all"
            >
              <Download className="w-4 h-4 text-emerald-500" />
              <span>Export Refunds CSV</span>
            </button>
            <button
              onClick={fetchRefunds}
              className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all shadow-sm"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
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
        <div className="glass-panel rounded-3xl overflow-hidden border border-slate-200/50 dark:border-slate-800/50 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/50 dark:bg-slate-900/30 text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-wider border-b border-slate-200/50 dark:border-slate-800/50">
                  <th className="py-4 px-6">Refund ID</th>
                  <th className="py-4 px-6">Order No</th>
                  <th className="py-4 px-6">Buyer Name</th>
                  <th className="py-4 px-6">Reason / Details</th>
                  <th className="py-4 px-6 text-right">Amount</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/50 dark:divide-slate-800/50 text-sm font-medium">
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
                    <tr key={refund.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors">
                      <td className="py-4 px-6">
                        <button
                          onClick={() => setSelectedRefund(refund)}
                          className="font-bold text-brand-600 hover:text-brand-700 dark:text-brand-400 hover:underline"
                        >
                          {refund.id}
                        </button>
                        <p className="text-[10px] text-slate-400 font-semibold">{refund.submittedAt.replace('T', ' ')}</p>
                      </td>
                      <td className="py-4 px-6 font-bold text-slate-800 dark:text-slate-100">
                        #{refund.orderNo}
                      </td>
                      <td className="py-4 px-6">
                        <p className="text-slate-800 dark:text-slate-200 font-bold">{refund.userName}</p>
                        <p className="text-[10px] text-slate-400 font-semibold uppercase">{refund.userId}</p>
                      </td>
                      <td className="py-4 px-6 max-w-xs truncate">
                        <p className="font-bold text-slate-700 dark:text-slate-300">{refund.reason}</p>
                        <p className="text-xs text-slate-400 font-medium italic truncate">{refund.description || 'No comment provided.'}</p>
                      </td>
                      <td className="py-4 px-6 text-right font-black text-slate-800 dark:text-slate-100">
                        ₹{refund.amount.toLocaleString()}
                      </td>
                      <td className="py-4 px-6">
                        {getStatusBadge(refund.status)}
                      </td>
                      <td className="py-4 px-6">
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
                                {actionLoading === refund.id ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : <Check className="w-4 h-4" />}
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(refund.id, 'rejected')}
                                disabled={actionLoading === refund.id}
                                className="p-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-lg transition-colors"
                                title="Reject Request"
                              >
                                {actionLoading === refund.id ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : <XCircle className="w-4 h-4" />}
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

      {/* Details Slide-Over */}
      {selectedRefund && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/40 backdrop-blur-xs transition-opacity duration-300">
          <div className="w-full max-w-lg h-full bg-white dark:bg-slate-900 shadow-glass border-l border-slate-200/50 dark:border-slate-800/50 p-8 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-300">
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
                  <XCircle className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              {/* Status Banner */}
              <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/30 p-4 rounded-2xl">
                <span className="text-sm font-bold text-slate-500">Processing Status</span>
                {getStatusBadge(selectedRefund.status)}
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
                  <p className="font-bold text-slate-600 dark:text-slate-350 mt-1 p-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-200/50 dark:border-slate-800/30 italic">
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
                <span className="text-2xl font-black text-emerald-500">₹{selectedRefund.amount.toFixed(2)}</span>
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
    </div>
  );
}
