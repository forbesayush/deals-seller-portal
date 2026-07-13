import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useAuth } from '@/hooks/useAuth';
import { 
  Search, ArrowLeft, Upload, Download, Trash2, CheckCircle, 
  XCircle, Loader2, RefreshCw, Sun, Moon, LogOut, FileText, Check 
} from 'lucide-react';

interface Order {
  id: string;
  orderNo: string;
  orderCode: string;
  trackingNumber: string | null;
  productName: string;
  productPrice: number;
  quantity: number;
  buyerId: string;
  cashbackPct: number;
  cashbackAmount: number;
  processingFee: number;
  deductionAmount: number;
  netAmount: number;
  refundStatus: string | null;
  approvalStatus: string;
  currentStatus: string;
  orderDate: string;
  submittedDate: string | null;
  paidDate: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  screenshot: boolean;
}

export default function OrderManager() {
  const { user, logout } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Modals and Alerts
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  // Deduction Override Form
  const [editDeductionVal, setEditDeductionVal] = useState('');
  const [updatingDeduction, setUpdatingDeduction] = useState(false);
  // Bulk Selection States
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  // Staff Notes
  const [editNotesVal, setEditNotesVal] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const fetchOrders = async () => {
    setLoading(true);
    try {
      let url = '/api/orders';
      if (searchQuery) {
        url += `?q=${encodeURIComponent(searchQuery)}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        setOrders(data);
      }
    } catch (e) {
      console.error("Error loading orders", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    setDarkMode(document.documentElement.classList.contains('dark'));
  }, [searchQuery]);

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

  useEffect(() => {
    if (selectedOrder) {
      setEditDeductionVal(selectedOrder.deductionAmount.toString());
      setEditNotesVal(selectedOrder.notes || '');
    } else {
      setEditDeductionVal('');
      setEditNotesVal('');
    }
  }, [selectedOrder]);

  const handleSaveNotes = async () => {
    if (!selectedOrder) return;
    setSavingNotes(true);
    setAlertMsg(null);
    try {
      const res = await fetch(`/api/orders/${selectedOrder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: editNotesVal }),
      });
      const data = await res.json();
      if (res.ok) {
        setAlertMsg({ type: 'success', text: 'Order internal notes updated.' });
        setSelectedOrder(data);
        fetchOrders();
      } else {
        setAlertMsg({ type: 'error', text: data.detail || 'Failed to update notes.' });
      }
    } catch (e) {
      setAlertMsg({ type: 'error', text: 'Network error updating notes.' });
    } finally {
      setSavingNotes(false);
    }
  };

  const handleToggleSelectOrder = (orderId: string) => {
    if (selectedOrderIds.includes(orderId)) {
      setSelectedOrderIds(selectedOrderIds.filter(id => id !== orderId));
    } else {
      setSelectedOrderIds([...selectedOrderIds, orderId]);
    }
  };

  const handleSelectAll = (filteredList: Order[]) => {
    if (selectedOrderIds.length === filteredList.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(filteredList.map(o => o.id));
    }
  };

  const handleBulkStatusChange = async (newStatus: string) => {
    if (selectedOrderIds.length === 0) return;
    setLoading(true);
    setAlertMsg(null);
    try {
      const res = await fetch('/api/orders/bulk-patch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds: selectedOrderIds, status: newStatus }),
      });
      const data = await res.json();
      if (res.ok) {
        setAlertMsg({ type: 'success', text: data.message || `Bulk updated ${selectedOrderIds.length} orders.` });
        setSelectedOrderIds([]);
        fetchOrders();
      } else {
        setAlertMsg({ type: 'error', text: data.detail || 'Failed bulk status change.' });
      }
    } catch (e) {
      setAlertMsg({ type: 'error', text: 'Network error bulk updating.' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateDeduction = async () => {
    if (!selectedOrder) return;
    setUpdatingDeduction(true);
    setAlertMsg(null);
    try {
      const res = await fetch(`/api/orders/${selectedOrder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deduction: parseFloat(editDeductionVal) || 0.0 }),
      });
      const data = await res.json();
      if (res.ok) {
        setAlertMsg({ type: 'success', text: 'Order deduction overridden successfully.' });
        setSelectedOrder(data);
        fetchOrders();
      } else {
        setAlertMsg({ type: 'error', text: data.detail || 'Failed to update deduction.' });
      }
    } catch (e) {
      setAlertMsg({ type: 'error', text: 'Network error updating deduction.' });
    } finally {
      setUpdatingDeduction(false);
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    setActionLoading(orderId);
    setAlertMsg(null);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentStatus: newStatus }),
      });
      const data = await res.json();
      if (res.ok) {
        setAlertMsg({ type: 'success', text: `Order status updated to ${newStatus} successfully.` });
        if (selectedOrder?.id === orderId) {
          setSelectedOrder(data);
        }
        fetchOrders();
      } else {
        setAlertMsg({ type: 'error', text: data.detail || 'Failed to update order status.' });
      }
    } catch (e) {
      setAlertMsg({ type: 'error', text: 'Network error updating order status.' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!window.confirm('Are you sure you want to delete this order? This action is permanent.')) return;
    setActionLoading(orderId);
    setAlertMsg(null);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok) {
        setAlertMsg({ type: 'success', text: 'Order deleted successfully.' });
        setSelectedOrder(null);
        fetchOrders();
      } else {
        setAlertMsg({ type: 'error', text: data.detail || 'Failed to delete order.' });
      }
    } catch (e) {
      setAlertMsg({ type: 'error', text: 'Network error deleting order.' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleBulkUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;
    setUploadLoading(true);
    setAlertMsg(null);
    
    const formData = new FormData();
    formData.append('file', uploadFile);

    try {
      const res = await fetch('/api/orders/bulk-upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAlertMsg({ type: 'success', text: data.message });
        setIsUploadOpen(false);
        setUploadFile(null);
        fetchOrders();
      } else {
        setAlertMsg({ type: 'error', text: data.detail || data.message || 'Bulk upload failed.' });
      }
    } catch (e) {
      setAlertMsg({ type: 'error', text: 'Network error during CSV upload.' });
    } finally {
      setUploadLoading(false);
    }
  };

  const handleExport = (format: 'csv' | 'excel') => {
    window.open(`/api/reports/export?type=orders&format=${format}`, '_blank');
  };

  const filteredOrders = orders.filter(o => {
    if (statusFilter === 'all') return true;
    return o.currentStatus === statusFilter;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <span className="px-2.5 py-1 text-xs font-bold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 rounded-full border border-emerald-200/50 dark:border-emerald-900/30 uppercase">Paid</span>;
      case 'cancelled':
        return <span className="px-2.5 py-1 text-xs font-bold bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 rounded-full border border-rose-200/50 dark:border-rose-900/30 uppercase">Cancelled</span>;
      case 'under_review':
        return <span className="px-2.5 py-1 text-xs font-bold bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 rounded-full border border-amber-200/50 dark:border-amber-900/30 uppercase">Under Review</span>;
      case 'order_filled':
        return <span className="px-2.5 py-1 text-xs font-bold bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 rounded-full border border-blue-200/50 dark:border-blue-900/30 uppercase">Filled</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full border border-slate-200/50 dark:border-slate-800/50 uppercase">Pending</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <Head>
        <title>Order Manager - deals.seller MIS</title>
      </Head>

      {/* Navigation Header */}
      <header className="glass-panel sticky top-0 z-40 border-b border-slate-200/50 dark:border-slate-800/50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a href="/admin/dashboard" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </a>
          <div>
            <h1 className="font-extrabold text-lg tracking-tight">Order Manager</h1>
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
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        
        {/* Actions Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Left search */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search orders (No, name, code)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm px-9 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all shadow-sm"
            />
          </div>

          {/* Right utility buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsUploadOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-bold text-sm shadow-sm transition-all"
            >
              <Upload className="w-4 h-4 text-indigo-500" />
              <span>Bulk Upload (CSV)</span>
            </button>
            <button
              onClick={() => handleExport('csv')}
              className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-bold text-sm shadow-sm transition-all"
            >
              <Download className="w-4 h-4 text-emerald-500" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={fetchOrders}
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

        {/* Tab Filters */}
        <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-none border-b border-slate-200 dark:border-slate-800">
          {[
            { id: 'all', label: 'All Orders' },
            { id: 'pending_review', label: 'Pending Review' },
            { id: 'order_filled', label: 'Order Filled' },
            { id: 'under_review', label: 'Under Review' },
            { id: 'paid', label: 'Paid' },
            { id: 'cancelled', label: 'Cancelled' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-4 py-2 text-sm font-semibold rounded-lg whitespace-nowrap transition-all ${
                statusFilter === tab.id 
                  ? 'bg-brand-600 text-white shadow-sm' 
                  : 'hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-500 dark:text-slate-400'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Bulk Actions Panel */}
        {selectedOrderIds.length > 0 && (
          <div className="bg-brand-50 dark:bg-brand-950/20 border border-brand-100 dark:border-brand-900/30 p-4 rounded-2xl flex items-center justify-between animate-fade-in">
            <span className="text-xs font-bold text-brand-700 dark:text-brand-300">{selectedOrderIds.length} orders selected</span>
            <div className="flex gap-2">
              <button
                onClick={() => handleBulkStatusChange('paid')}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-sm transition-colors"
              >
                Approve & Pay Selected
              </button>
              <button
                onClick={() => handleBulkStatusChange('cancelled')}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs shadow-sm transition-colors"
              >
                Cancel Selected
              </button>
            </div>
          </div>
        )}

        {/* Data Table */}
        <div className="glass-panel rounded-3xl overflow-hidden border border-slate-200/50 dark:border-slate-800/50 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/50 dark:bg-slate-900/30 text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-wider border-b border-slate-200/50 dark:border-slate-800/50">
                  <th className="py-4 px-6 text-center w-12">
                    <input
                      type="checkbox"
                      checked={filteredOrders.length > 0 && selectedOrderIds.length === filteredOrders.length}
                      onChange={() => handleSelectAll(filteredOrders)}
                      className="rounded border-slate-300 dark:border-slate-750 text-brand-650 focus:ring-brand-500"
                    />
                  </th>
                  <th className="py-4 px-6">Order ID</th>
                  <th className="py-4 px-6">Buyer ID / Product</th>
                  <th className="py-4 px-6">Platform</th>
                  <th className="py-4 px-6 text-right">Amount</th>
                  <th className="py-4 px-6 text-right">Deduction</th>
                  <th className="py-4 px-6 text-right">Net Payout</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/50 dark:divide-slate-800/50 text-sm font-medium">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
                        <span>Loading order database...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      No orders found matching the filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map(order => (
                    <tr key={order.id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors ${selectedOrderIds.includes(order.id) ? 'bg-brand-50/30 dark:bg-brand-950/5' : ''}`}>
                      <td className="py-4 px-6 text-center">
                        <input
                          type="checkbox"
                          checked={selectedOrderIds.includes(order.id)}
                          onChange={() => handleToggleSelectOrder(order.id)}
                          className="rounded border-slate-300 text-brand-650 focus:ring-brand-500"
                        />
                      </td>
                      <td className="py-4 px-6">
                        <button 
                          onClick={() => setSelectedOrder(order)} 
                          className="font-bold text-brand-600 hover:text-brand-700 dark:text-brand-400 hover:underline text-left block"
                        >
                          #{order.orderNo}
                        </button>
                        <span className="text-[10px] text-slate-400 font-semibold">{order.id} · {order.orderDate}</span>
                      </td>
                      <td className="py-4 px-6">
                        <p className="text-slate-800 dark:text-slate-200 font-bold">{order.buyerId}</p>
                        <p className="text-xs text-slate-400 font-semibold truncate max-w-[180px]">{order.productName} ({order.productCode})</p>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-md">
                          {order.platform}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right font-extrabold text-slate-600 dark:text-slate-400">
                        ₹{order.productPrice.toLocaleString()}
                      </td>
                      <td className="py-4 px-6 text-right font-extrabold text-rose-500">
                        -₹{order.deductionAmount.toLocaleString()}
                      </td>
                      <td className="py-4 px-6 text-right font-black text-emerald-500">
                        ₹{order.netAmount.toLocaleString()}
                      </td>
                      <td className="py-4 px-6">
                        {getStatusBadge(order.currentStatus)}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-center gap-2">
                          {order.currentStatus !== 'paid' && order.currentStatus !== 'cancelled' && (
                            <>
                              <button
                                onClick={() => handleUpdateStatus(order.id, 'paid')}
                                disabled={actionLoading === order.id}
                                className="p-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:hover:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg transition-colors"
                                title="Mark Paid"
                              >
                                {actionLoading === order.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(order.id, 'cancelled')}
                                disabled={actionLoading === order.id}
                                className="p-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-lg transition-colors"
                                title="Cancel Order"
                              >
                                {actionLoading === order.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleDeleteOrder(order.id)}
                            disabled={actionLoading === order.id}
                            className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-slate-400 hover:text-rose-600 transition-colors rounded-lg"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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

      {/* Details Slide-Over / Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/40 backdrop-blur-xs transition-opacity duration-300">
          <div className="w-full max-w-lg h-full bg-white dark:bg-slate-900 shadow-glass border-l border-slate-200/50 dark:border-slate-800/50 p-8 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-300">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
                <div>
                  <h3 className="font-extrabold text-lg text-slate-800 dark:text-slate-100">Order Claims Details</h3>
                  <p className="text-xs text-slate-400 font-semibold uppercase">ID: {selectedOrder.id}</p>
                </div>
                <button 
                  onClick={() => setSelectedOrder(null)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  <XCircle className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              {/* Status Badge */}
              <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/30 p-4 rounded-2xl">
                <span className="text-sm font-bold text-slate-500">Order Status</span>
                {getStatusBadge(selectedOrder.currentStatus)}
              </div>

              {/* Grid Information */}
              <div className="grid grid-cols-2 gap-6 text-sm font-medium">
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Order Number</p>
                  <p className="font-bold text-slate-800 dark:text-slate-100 mt-1">{selectedOrder.orderNo}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Unique Order Code</p>
                  <p className="font-bold text-brand-600 dark:text-brand-400 mt-1">{selectedOrder.orderCode}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Product Name</p>
                  <p className="font-bold text-slate-800 dark:text-slate-100 mt-1">{selectedOrder.productName}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Catalog Code</p>
                  <p className="font-bold text-slate-800 dark:text-slate-100 mt-1">{selectedOrder.productCode}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Buyer User ID</p>
                  <p className="font-bold text-slate-800 dark:text-slate-100 mt-1">{selectedOrder.buyerId}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Tracking Number</p>
                  <p className="font-bold text-slate-800 dark:text-slate-100 mt-1">{selectedOrder.trackingNumber || 'Not assigned'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Order Date</p>
                  <p className="font-bold text-slate-800 dark:text-slate-100 mt-1">{selectedOrder.orderDate}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Paid Timestamp</p>
                  <p className="font-bold text-slate-800 dark:text-slate-100 mt-1">{selectedOrder.paidDate || 'Unpaid'}</p>
                </div>
              </div>

              {/* Payment Summary */}
              <div className="bg-slate-50 dark:bg-slate-800/20 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-5 space-y-3">
                <h4 className="font-bold text-sm text-slate-700 dark:text-slate-300">Financial Summary</h4>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Product Price</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">₹{selectedOrder.productPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Cashback Amount ({selectedOrder.cashbackPct}%)</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">₹{selectedOrder.cashbackAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Deduction Fee</span>
                  <span className="font-bold text-rose-500">-₹{selectedOrder.deductionAmount.toFixed(2)}</span>
                </div>

                {selectedOrder.currentStatus !== 'paid' && selectedOrder.currentStatus !== 'cancelled' && (
                  <div className="pt-2 border-t border-slate-150 dark:border-slate-800/80 space-y-2">
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Override Fee Cut (₹)</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={editDeductionVal}
                        onChange={(e) => setEditDeductionVal(e.target.value)}
                        placeholder="e.g. 50"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs px-3 py-1.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                      <button
                        onClick={handleUpdateDeduction}
                        disabled={updatingDeduction}
                        className="px-3 py-1.5 bg-brand-650 hover:bg-brand-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 text-white rounded-xl font-bold text-xs transition-colors flex items-center gap-1 shrink-0"
                      >
                        {updatingDeduction ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save'}
                      </button>
                    </div>
                  </div>
                )}

                <div className="border-t border-slate-200 dark:border-slate-800 pt-3 flex justify-between text-sm font-extrabold">
                  <span>Net Payout</span>
                  <span className="text-emerald-500">₹{selectedOrder.netAmount.toFixed(2)}</span>
                </div>
              </div>

              {/* Staff Internal Notes */}
              <div className="bg-slate-50 dark:bg-slate-800/20 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-5 space-y-3">
                <h4 className="font-bold text-sm text-slate-700 dark:text-slate-300">Internal Staff Remarks</h4>
                <textarea
                  value={editNotesVal}
                  onChange={(e) => setEditNotesVal(e.target.value)}
                  placeholder="Add internal remarks about screenshot verification, buyer history, payouts, etc..."
                  rows={3}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <div className="flex justify-end">
                  <button
                    onClick={handleSaveNotes}
                    disabled={savingNotes}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 text-white rounded-xl font-bold text-[10px] uppercase tracking-wider transition-colors flex items-center gap-1"
                  >
                    {savingNotes ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Save Notes'}
                  </button>
                </div>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="border-t border-slate-200 dark:border-slate-800 pt-6 flex items-center justify-between gap-3">
              <button
                onClick={() => handleDeleteOrder(selectedOrder.id)}
                disabled={actionLoading === selectedOrder.id}
                className="flex items-center justify-center gap-2 px-4 py-2.5 border border-rose-200 hover:bg-rose-50 dark:border-rose-900/30 dark:hover:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-xl font-bold text-sm transition-all"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>

              <div className="flex gap-2">
                {selectedOrder.currentStatus !== 'paid' && selectedOrder.currentStatus !== 'cancelled' && (
                  <>
                    <button
                      onClick={() => handleUpdateStatus(selectedOrder.id, 'cancelled')}
                      disabled={actionLoading === selectedOrder.id}
                      className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-sm transition-all"
                    >
                      Cancel Order
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(selectedOrder.id, 'paid')}
                      disabled={actionLoading === selectedOrder.id}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-all shadow-md shadow-emerald-200 dark:shadow-none"
                    >
                      Approve & Pay
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CSV Bulk Upload Modal */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-glass border border-slate-200/50 dark:border-slate-800/50 relative">
            <h3 className="font-extrabold text-lg mb-4 text-slate-800 dark:text-slate-100">Bulk Import Order Claims</h3>
            <p className="text-xs text-slate-400 font-semibold mb-6">Upload a CSV file containing: `orderNo`, `productCode`, `amount`, `buyerEmail`, and `orderDate` headers.</p>
            
            <form onSubmit={handleBulkUpload} className="space-y-4">
              <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center hover:border-brand-500 dark:hover:border-brand-500/50 transition-colors">
                <input 
                  type="file" 
                  accept=".csv" 
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="hidden" 
                  id="csv-file-input" 
                />
                <label htmlFor="csv-file-input" className="cursor-pointer block space-y-2">
                  <div className="mx-auto w-10 h-10 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-500 rounded-xl flex items-center justify-center">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    {uploadFile ? uploadFile.name : 'Select CSV file'}
                  </div>
                  <div className="text-xs text-slate-400 font-medium">CSV files only, up to 10MB</div>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setIsUploadOpen(false); setUploadFile(null); }}
                  className="px-4 py-2 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!uploadFile || uploadLoading}
                  className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-600 text-white rounded-xl font-bold text-sm transition-all shadow-md shadow-brand-100 dark:shadow-none flex items-center justify-center gap-2"
                >
                  {uploadLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Process Claims</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
