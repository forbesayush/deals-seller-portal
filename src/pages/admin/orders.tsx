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

  // Batch Export by Order Code State
  const [batchCode, setBatchCode] = useState('');
  const [batchOrders, setBatchOrders] = useState<any[] | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchMsg, setBatchMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  // Bulk Order Import State
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<any | null>(null);

  const handleLoadBatchOrders = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setBatchMsg(null);
    const clean = batchCode.trim();
    if (!clean) {
      setBatchMsg({ type: 'error', text: 'Please enter an Order Code.' });
      setBatchOrders(null);
      return;
    }

    setBatchLoading(true);
    try {
      const res = await fetch('/api/admin/orders/by-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderCode: clean }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.count === 0) {
          setBatchMsg({ type: 'error', text: data.message || `No orders found for Order Code "${clean}".` });
          setBatchOrders([]);
        } else {
          setBatchOrders(data.orders);
          setBatchMsg({ type: 'success', text: `Found ${data.count} order(s) for Order Code "${clean}".` });
        }
      } else {
        setBatchMsg({ type: 'error', text: data.detail || 'Failed to search' });
        setBatchOrders([]);
      }
    } catch {
      setBatchMsg({ type: 'error', text: 'Network error occurred.' });
      setBatchOrders([]);
    } finally { setBatchLoading(false); }
  };

  const handleBulkImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importText.trim()) return;
    setImportLoading(true);
    setImportResult(null);

    let parsedOrders: any[] = [];
    try {
      const trimmed = importText.trim();
      if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        const raw = JSON.parse(trimmed);
        parsedOrders = Array.isArray(raw) ? raw : [raw];
      } else {
        const lines = trimmed.split('\n').map(l => l.trim()).filter(Boolean);
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const isHeader = headers.includes('orderno') || headers.includes('order_no') || headers.includes('code');
        const startIdx = isHeader ? 1 : 0;

        for (let i = startIdx; i < lines.length; i++) {
          const cols = lines[i].split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
          if (cols.length >= 2) {
            parsedOrders.push({
              orderNo: cols[0],
              orderCode: cols[1] || '1200',
              platform: cols[2] || 'Amazon',
              productPrice: parseFloat(cols[3] || '1299') || 1299,
              deductionAmount: parseFloat(cols[4] || '0') || 0,
              status: cols[5] || 'order_filled',
            });
          }
        }
      }

      if (parsedOrders.length === 0) {
        setImportResult({ success: false, detail: 'No valid order rows parsed. Check your CSV or JSON syntax.' });
        setImportLoading(false);
        return;
      }

      const res = await fetch('/api/admin/orders/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orders: parsedOrders }),
      });
      const data = await res.json();
      if (res.ok) {
        setImportResult({ success: true, message: data.message, errors: data.errors });
        fetchOrders();
      } else {
        setImportResult({ success: false, detail: data.detail || 'Import failed.' });
      }
    } catch (err: any) {
      setImportResult({ success: false, detail: `Parsing Error: ${err.message}` });
    } finally {
      setImportLoading(false);
    }
  };

  const handleExportBatchOrders = () => {
    const clean = batchCode.trim();
    if (!clean) {
      setBatchMsg({ type: 'error', text: 'Please enter an Order Code.' });
      return;
    }
    if (!batchOrders || batchOrders.length === 0) {
      setBatchMsg({ type: 'error', text: 'No orders available to export. Load valid orders first.' });
      return;
    }
    window.open(`/api/reports/export?type=orders&format=csv&orderCode=${encodeURIComponent(clean)}`);
  };

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

    const interval = setInterval(fetchOrders, 10000);
    return () => {
      clearInterval(interval);
    };
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
                <button onClick={() => setShowImport(true)} className="btn btn-primary btn-sm">
                  <Plus className="w-4 h-4" /> Bulk Import Orders
                </button>
              </div>
            </div>

            {/* Export Orders by Order Code Card */}
            <div className="premium-card p-5 mb-6 border-l-4 border-brand-500 animate-fade-up">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div>
                  <h3 className="font-extrabold text-base flex items-center gap-2">
                    <Download className="w-5 h-5 text-brand-600 dark:text-violet-400" />
                    Export Orders by Order Code
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Enter an Order Code (e.g. 1200) to batch load and export only the associated orders to Excel
                  </p>
                </div>
                {batchOrders && batchOrders.length > 0 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleExportBatchOrders}
                      className="btn btn-emerald btn-sm flex items-center gap-1.5 text-white"
                      style={{ backgroundColor: '#10b981' }}
                    >
                      <Download className="w-4 h-4" /> Export Loaded Orders ({batchOrders.length})
                    </button>
                    <button
                      onClick={() => { setBatchOrders(null); setBatchMsg(null); setBatchCode(''); }}
                      className="btn btn-ghost btn-sm"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>

              <form onSubmit={handleLoadBatchOrders} className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[240px]">
                  <input
                    type="text"
                    value={batchCode}
                    onChange={e => setBatchCode(e.target.value)}
                    placeholder="Enter Order Code (e.g. 1200 or ORD-123456)"
                    className="input liquid-glass-input rounded-xl pr-9 text-sm"
                  />
                  {batchCode && (
                    <button
                      type="button"
                      onClick={() => setBatchCode('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={batchLoading}
                  className="btn btn-primary btn-sm flex items-center gap-1.5"
                >
                  {batchLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  Load Orders
                </button>
              </form>

              {batchMsg && (
                <div className={`mt-3 p-3 rounded-xl text-xs font-semibold ${
                  batchMsg.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40'
                    : 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40'
                }`}>
                  {batchMsg.text}
                </div>
              )}

              {/* Batch Orders Preview Table */}
              {batchOrders && batchOrders.length > 0 && (
                <div className="mt-4 border-t pt-4" style={{ borderColor: 'var(--color-border)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                      Matching Orders ({batchOrders.length})
                    </span>
                    <span className="text-xs text-brand-600 dark:text-violet-400 font-bold">
                      Order Code: {batchCode}
                    </span>
                  </div>

                  <div className="overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--color-border)' }}>
                    <table className="data-table text-xs">
                      <thead>
                        <tr>
                          <th>Order ID</th>
                          <th>Order Code</th>
                          <th>Customer</th>
                          <th>Phone / Email</th>
                          <th>Product Name</th>
                          <th>Amount</th>
                          <th>Status</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {batchOrders.slice(0, 15).map(o => (
                          <tr key={o.id}>
                            <td className="font-mono font-bold">{o.orderNo}</td>
                            <td className="font-mono text-brand-600 dark:text-violet-400">{o.orderCode || o.code}</td>
                            <td className="font-bold">{o.customerName}</td>
                            <td className="text-slate-400">{o.customerPhone} / {o.customerEmail}</td>
                            <td>{o.productName}</td>
                            <td className="font-bold">{formatINR(o.productPrice || o.amount || 0)}</td>
                            <td><StatusBadge status={o.currentStatus} /></td>
                            <td>{o.orderDate || o.submittedDate}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {batchOrders.length > 15 && (
                    <p className="text-[11px] text-slate-400 mt-2 text-center">
                      Showing first 15 of {batchOrders.length} matching records. Click <strong>Export Loaded Orders</strong> to download all {batchOrders.length} records.
                    </p>
                  )}
                </div>
              )}
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
      {/* Bulk Import Orders Modal */}
      {showImport && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="premium-card max-w-xl w-full p-6 animate-scale-up border border-brand-500/30">
            <div className="flex items-center justify-between mb-4 border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
              <div>
                <span className="text-[10px] uppercase font-bold text-brand-600 dark:text-violet-400">Batch Order Import</span>
                <h3 className="font-extrabold text-base">Bulk Import Orders (CSV / JSON)</h3>
              </div>
              <button onClick={() => { setShowImport(false); setImportResult(null); }} className="btn btn-ghost btn-sm"><X className="w-4 h-4" /></button>
            </div>

            {importResult && (
              <div className={`p-3 rounded-xl text-xs mb-3 font-semibold ${importResult.success ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                <p>{importResult.message || importResult.detail}</p>
                {importResult.errors && importResult.errors.length > 0 && (
                  <ul className="mt-1.5 list-disc pl-4 text-[11px] space-y-0.5 opacity-90">
                    {importResult.errors.slice(0, 5).map((err: string, i: number) => <li key={i}>{err}</li>)}
                  </ul>
                )}
              </div>
            )}

            <form onSubmit={handleBulkImport} className="space-y-4 text-xs">
              <div>
                <label className="section-label">Paste CSV data or JSON Array *</label>
                <textarea
                  required
                  rows={8}
                  value={importText}
                  onChange={e => setImportText(e.target.value)}
                  placeholder={`OrderNo, OrderCode, Brand, Price, Deduction, Status\n407-111111-22222, 1200, Amazon, 1299, 50, order_filled\n407-333333-44444, 1250, Flipkart, 899, 0, paid`}
                  className="input rounded-xl text-xs font-mono resize-none leading-relaxed"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 text-[11px] text-slate-400 space-y-1">
                <p className="font-bold text-slate-600 dark:text-slate-300">Format Guide:</p>
                <p>• <strong>CSV Format:</strong> <code>OrderNo, OrderCode, Platform, Price, Deduction, Status</code></p>
                <p>• <strong>JSON Format:</strong> <code>[{`{"orderNo": "407-123", "orderCode": "1200", "productPrice": 1299}`}]</code></p>
              </div>

              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={importLoading} className="btn btn-primary flex-1">
                  {importLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Importing...</> : <><Plus className="w-4 h-4" /> Run Bulk Import</>}
                </button>
                <button type="button" onClick={() => { setShowImport(false); setImportResult(null); }} className="btn btn-ghost">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
