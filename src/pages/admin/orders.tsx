import React, { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import { useAuth } from '@/hooks/useAuth';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import {
  Search, RefreshCw, Download, CheckCircle2, XCircle, DollarSign,
  AlertTriangle, Filter, Edit3, Eye, BarChart3, Loader2,
  ChevronDown, Check, X, Clock, ShoppingBag, Plus, Send
} from 'lucide-react';

function formatINR(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    paid: 'badge-emerald', order_filled: 'badge-blue', under_review: 'badge-amber',
    pending_review: 'badge-slate', cancelled: 'badge-rose', approved: 'badge-emerald',
    pending: 'badge-amber', rejected: 'badge-rose',
  };
  const labels: Record<string, string> = {
    pending_review: 'Pending', order_filled: 'Filled', under_review: 'Reviewing',
    paid: 'Paid', cancelled: 'Cancelled', approved: 'Approved', rejected: 'Rejected', pending: 'Pending',
  };
  return <span className={`badge ${map[status] || 'badge-slate'} text-[10px]`}>{labels[status] || status}</span>;
}

const STATUS_OPTIONS = [
  { val: 'pending_review', label: 'Pending Review' },
  { val: 'order_filled', label: 'Order Filled' },
  { val: 'under_review', label: 'Under Review' },
  { val: 'approved', label: 'Approved' },
  { val: 'paid', label: 'Paid' },
  { val: 'cancelled', label: 'Cancelled' },
];

export default function AdminOrders() {
  const { user } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selected, setSelected] = useState<string[]>([]);

  const [editOrder, setEditOrder] = useState<any | null>(null);
  const [editStatus, setEditStatus] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  const [showFraud, setShowFraud] = useState(false);
  const [fraudData, setFraudData] = useState<any | null>(null);
  const [fraudLoading, setFraudLoading] = useState(false);

  const [bulkAction, setBulkAction] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkMsg, setBulkMsg] = useState('');

  const toggleDark = () => {
    const isDark = !darkMode;
    setDarkMode(isDark);
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  };

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/orders?q=${encodeURIComponent(searchQuery)}`);
      if (res.ok) {
        let data = await res.json();
        if (statusFilter !== 'All') data = data.filter((o: any) => o.currentStatus === statusFilter);
        setOrders(data);
      }
    } catch { /* silent */ } finally { setLoading(false); }
  }, [searchQuery, statusFilter]);

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') { setDarkMode(true); document.documentElement.classList.add('dark'); }
    fetchOrders();
  }, [fetchOrders]);

  const handleUpdateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editOrder) return;
    setEditLoading(true);
    try {
      const res = await fetch(`/api/orders/${editOrder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentStatus: editStatus, notes: editNote }),
      });
      if (res.ok) { setEditOrder(null); fetchOrders(); }
    } catch { /* silent */ } finally { setEditLoading(false); }
  };

  const handleFraudCheck = async (order: any) => {
    setFraudLoading(true);
    setFraudData(null);
    setShowFraud(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/fraud-check`);
      if (res.ok) setFraudData(await res.json());
    } catch { /* silent */ } finally { setFraudLoading(false); }
  };

  const handleBulkAction = async () => {
    if (!selected.length || !bulkAction) return;
    setBulkLoading(true);
    try {
      const res = await fetch('/api/orders/bulk-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds: selected, action: bulkAction }),
      });
      const data = await res.json();
      setBulkMsg(data.message || 'Done!');
      setSelected([]);
      fetchOrders();
    } catch { setBulkMsg('Error'); } finally { setBulkLoading(false); }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm('⚠️ WARNING: Are you absolutely sure you want to delete ALL orders and clear the transaction history? This cannot be undone.')) {
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/orders', { method: 'DELETE' });
      if (res.ok) {
        alert('All orders and transaction history deleted successfully.');
        fetchOrders();
      } else {
        alert('Failed to delete orders.');
      }
    } catch {
      alert('Network error while deleting orders.');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const toggleSelectAll = () => {
    setSelected(selected.length === orders.length ? [] : orders.map(o => o.id));
  };

  const statusCounts = STATUS_OPTIONS.reduce((acc, s) => ({
    ...acc,
    [s.val]: orders.filter(o => o.currentStatus === s.val).length
  }), {} as Record<string, number>);

  return (
    <>
      <Head>
        <title>Orders Management — Admin Portal</title>
      </Head>

      <div className="min-h-screen flex" style={{ background: 'var(--color-bg)' }}>
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} darkMode={darkMode} />

        <div className="flex-1 flex flex-col min-h-screen transition-all duration-300"
          style={{ marginLeft: sidebarCollapsed ? 72 : 260 }}>
          <Header title="Orders" darkMode={darkMode} onToggleDark={toggleDark} sidebarCollapsed={sidebarCollapsed} />

          <main className="flex-1 p-6 pt-[88px]">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h1 className="page-title">Order Management</h1>
                <p className="page-subtitle">{orders.length} total orders</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={fetchOrders} className="btn btn-ghost btn-sm" title="Refresh"><RefreshCw className="w-4 h-4" /></button>
                <button onClick={handleDeleteAll} className="btn btn-rose btn-sm flex items-center gap-1.5" style={{ backgroundColor: '#f43f5e', color: '#fff' }} title="Delete All Orders">
                  <XCircle className="w-4 h-4" /> Delete All
                </button>
                <button onClick={() => window.open('/api/reports/export?type=orders&format=csv')} className="btn btn-ghost btn-sm">
                  <Download className="w-4 h-4" /> Export
                </button>
                <button onClick={() => window.open('/api/reports/export?type=orders&format=excel')} className="btn btn-secondary btn-sm">
                  <Download className="w-4 h-4" /> Excel
                </button>
              </div>
            </div>

            {/* Status Filter Chips */}
            <div className="flex flex-wrap gap-2 mb-5">
              {[{ val: 'All', label: `All (${orders.length})` }, ...STATUS_OPTIONS.map(s => ({ val: s.val, label: `${s.label} (${statusCounts[s.val] || 0})` }))].map(s => (
                <button
                  key={s.val}
                  onClick={() => setStatusFilter(s.val)}
                  className={`btn btn-sm rounded-full ${statusFilter === s.val ? 'bg-brand-600 text-white' : 'btn-ghost'}`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Bulk Actions Bar */}
            {selected.length > 0 && (
              <div className="premium-card p-3 mb-4 flex items-center gap-3 animate-slide-in border-l-4 border-brand-500">
                <span className="text-sm font-bold">{selected.length} selected</span>
                <select
                  value={bulkAction}
                  onChange={e => setBulkAction(e.target.value)}
                  className="select text-sm w-auto"
                >
                  <option value="">Choose action...</option>
                  <option value="approve">Approve</option>
                  <option value="mark_paid">Mark as Paid</option>
                  <option value="reject">Reject</option>
                  <option value="cancel">Cancel</option>
                </select>
                <button onClick={handleBulkAction} disabled={!bulkAction || bulkLoading} className="btn btn-primary btn-sm">
                  {bulkLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Apply
                </button>
                <button onClick={() => setSelected([])} className="btn btn-ghost btn-sm"><X className="w-4 h-4" /></button>
                {bulkMsg && <span className="text-xs text-emerald-600 font-semibold">{bulkMsg}</span>}
              </div>
            )}

            {/* Search */}
            <div className="relative mb-5">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text" placeholder="Search by order no, product, status, buyer ID..."
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="input pl-9"
              />
            </div>

            {/* Orders Table */}
            <div className="premium-card overflow-hidden">
              {loading ? (
                <div className="p-6 space-y-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-14 rounded-xl" />)}</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th className="w-10">
                          <input type="checkbox" className="rounded accent-brand-600" checked={selected.length === orders.length && orders.length > 0} onChange={toggleSelectAll} />
                        </th>
                        <th>Order No</th>
                        <th>Buyer</th>
                        <th>Product</th>
                        <th>Amount</th>
                        <th>Cashback</th>
                        <th>Status</th>
                        <th>Date</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.length === 0 ? (
                        <tr><td colSpan={9} className="text-center py-10 text-slate-400">No orders found</td></tr>
                      ) : orders.map(order => (
                        <tr key={order.id}>
                          <td>
                            <input type="checkbox" className="rounded accent-brand-600" checked={selected.includes(order.id)} onChange={() => toggleSelect(order.id)} />
                          </td>
                          <td>
                            <div>
                              <p className="font-mono text-xs font-bold">{order.orderNo?.slice(0, 22)}</p>
                              <p className="text-[10px] text-slate-400">{order.orderCode}</p>
                            </div>
                          </td>
                          <td className="text-xs text-slate-500">{order.buyerId}</td>
                          <td>
                            <p className="text-sm font-semibold line-clamp-1">{order.productName}</p>
                            <p className="text-xs text-slate-400">{order.platform}</p>
                          </td>
                          <td className="font-bold text-sm">{formatINR(order.productPrice)}</td>
                          <td className="font-bold text-emerald-600 text-sm">{formatINR(order.cashbackAmount)}</td>
                          <td><StatusBadge status={order.currentStatus} /></td>
                          <td className="text-xs text-slate-400">{order.orderDate}</td>
                          <td>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => { setEditOrder(order); setEditStatus(order.currentStatus); setEditNote(''); }}
                                className="btn btn-ghost btn-sm px-2" title="Edit Status"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleFraudCheck(order)}
                                className="btn btn-ghost btn-sm px-2 text-amber-500" title="Fraud Check"
                              >
                                <AlertTriangle className="w-3.5 h-3.5" />
                              </button>
                              <a
                                href={`/api/orders/${order.id}/timeline`}
                                target="_blank"
                                className="btn btn-ghost btn-sm px-2" title="View Timeline"
                              >
                                <Clock className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* Edit Order Status Modal */}
      {editOrder && (
        <div className="modal-backdrop" onClick={() => setEditOrder(null)}>
          <div className="modal-content max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <h3 className="font-extrabold text-lg mb-1">Update Order</h3>
              <p className="text-sm text-slate-400 mb-4">Order: <code className="font-mono">{editOrder.orderNo}</code></p>
              <form onSubmit={handleUpdateOrder} className="space-y-4">
                <div>
                  <label className="section-label">New Status</label>
                  <select value={editStatus} onChange={e => setEditStatus(e.target.value)} className="select">
                    {STATUS_OPTIONS.map(s => <option key={s.val} value={s.val}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="section-label">Admin Note</label>
                  <textarea value={editNote} onChange={e => setEditNote(e.target.value)} rows={3} className="input resize-none" placeholder="Optional note for audit trail..." />
                </div>
                <div className="flex gap-2">
                  <button type="submit" disabled={editLoading} className="btn btn-primary flex-1">
                    {editLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Updating...</> : <><Check className="w-4 h-4" /> Update</>}
                  </button>
                  <button type="button" onClick={() => setEditOrder(null)} className="btn btn-ghost">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Fraud Check Modal */}
      {showFraud && (
        <div className="modal-backdrop" onClick={() => setShowFraud(false)}>
          <div className="modal-content max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-extrabold text-lg">🔍 Fraud Check</h3>
                <button onClick={() => setShowFraud(false)}><X className="w-4 h-4 text-slate-400" /></button>
              </div>
              {fraudLoading ? (
                <div className="text-center py-6"><Loader2 className="w-8 h-8 animate-spin text-brand-600 mx-auto" /></div>
              ) : fraudData ? (
                <div>
                  <div className={`p-4 rounded-xl mb-4 ${fraudData.isFlagged ? 'bg-rose-50 dark:bg-rose-950/30 border border-rose-200' : 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200'}`}>
                    <div className="flex items-center gap-2">
                      {fraudData.isFlagged ? <AlertTriangle className="w-5 h-5 text-rose-500" /> : <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                      <p className={`font-bold ${fraudData.isFlagged ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {fraudData.isFlagged ? 'Potential Fraud Detected' : 'Order Looks Clean'}
                      </p>
                    </div>
                  </div>
                  {fraudData.fraudFlags?.length > 0 && (
                    <div className="space-y-2">
                      <p className="section-label">Fraud Flags</p>
                      {fraudData.fraudFlags.map((flag: string, i: number) => (
                        <div key={i} className="flex items-center gap-2 text-sm text-rose-600">
                          <AlertTriangle className="w-3.5 h-3.5" /> {flag}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
