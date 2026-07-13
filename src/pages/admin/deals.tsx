import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useAuth } from '@/hooks/useAuth';
import { 
  Search, ArrowLeft, RefreshCw, Sun, Moon, LogOut, Loader2,
  Plus, Trash2, Edit, Check, XCircle, Info, ExternalLink, ToggleLeft, ToggleRight
} from 'lucide-react';

interface Deal {
  id: string;
  productCode: string;
  productName: string;
  platform: string;
  price: number;
  cashback: number;
  slots: number;
  active: boolean;
}

export default function DealsManager() {
  const { user, logout } = useAuth();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  
  // Form states
  const [productCode, setProductCode] = useState('');
  const [productName, setProductName] = useState('');
  const [platform, setPlatform] = useState('Amazon');
  const [price, setPrice] = useState('');
  const [cashback, setCashback] = useState('');
  const [slots, setSlots] = useState('5');
  const [active, setActive] = useState(true);
  const [formLoading, setFormLoading] = useState(false);

  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const fetchDeals = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/deals');
      const data = await res.json();
      if (res.ok) {
        setDeals(data);
      }
    } catch (e) {
      console.error("Error loading deals", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeals();
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

  const handleCreateDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productCode || !productName || !price || !cashback) {
      setAlertMsg({ type: 'error', text: 'All fields are required' });
      return;
    }
    setFormLoading(true);
    setAlertMsg(null);
    try {
      const res = await fetch('/api/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productCode,
          productName,
          platform,
          price: parseFloat(price),
          cashback: parseFloat(cashback),
          slots: parseInt(slots),
          active
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setAlertMsg({ type: 'success', text: `Deal logged and live! ID: ${data.id}` });
        setShowCreateModal(false);
        resetForm();
        fetchDeals();
      } else {
        setAlertMsg({ type: 'error', text: data.detail || 'Failed to register deal.' });
      }
    } catch (e) {
      setAlertMsg({ type: 'error', text: 'Network connection failed.' });
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDeal) return;
    setFormLoading(true);
    setAlertMsg(null);
    try {
      const res = await fetch(`/api/deals/${editingDeal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName,
          platform,
          price: parseFloat(price),
          cashback: parseFloat(cashback),
          slots: parseInt(slots),
          active
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setAlertMsg({ type: 'success', text: `Deal updated successfully.` });
        setEditingDeal(null);
        resetForm();
        fetchDeals();
      } else {
        setAlertMsg({ type: 'error', text: data.detail || 'Failed to update deal.' });
      }
    } catch (e) {
      setAlertMsg({ type: 'error', text: 'Network connection failed.' });
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleActive = async (deal: Deal) => {
    setActionLoading(deal.id);
    try {
      const res = await fetch(`/api/deals/${deal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !deal.active }),
      });
      if (res.ok) {
        fetchDeals();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteDeal = async (dealId: string) => {
    if (!confirm("Are you sure you want to permanently delete this deal? This action is irreversible.")) return;
    setActionLoading(dealId);
    setAlertMsg(null);
    try {
      const res = await fetch(`/api/deals/${dealId}`, { method: 'DELETE' });
      if (res.ok) {
        setAlertMsg({ type: 'success', text: 'Deal permanently deleted.' });
        fetchDeals();
      } else {
        const err = await res.json();
        setAlertMsg({ type: 'error', text: err.detail || 'Failed to delete deal.' });
      }
    } catch (e) {
      setAlertMsg({ type: 'error', text: 'Network issue deleting deal.' });
    } finally {
      setActionLoading(null);
    }
  };

  const resetForm = () => {
    setProductCode('');
    setProductName('');
    setPlatform('Amazon');
    setPrice('');
    setCashback('');
    setSlots('5');
    setActive(true);
  };

  const startEdit = (deal: Deal) => {
    setEditingDeal(deal);
    setProductCode(deal.productCode);
    setProductName(deal.productName);
    setPlatform(deal.platform);
    setPrice(deal.price.toString());
    setCashback(deal.cashback.toString());
    setSlots(deal.slots.toString());
    setActive(deal.active);
  };

  const filteredDeals = deals.filter(d => 
    d.productCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.platform.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <Head>
        <title>Live Deals Manager - deals.seller MIS</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      {/* Header */}
      <header className="glass-panel sticky top-0 z-40 border-b border-slate-200/50 dark:border-slate-800/40 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-brand-600 to-indigo-600 rounded-xl flex items-center justify-center text-white font-extrabold shadow-sm">
            AG
          </div>
          <div>
            <h1 className="font-extrabold text-lg tracking-tight">deals.seller</h1>
            <p className="text-[10px] text-brand-600 dark:text-brand-400 font-bold uppercase tracking-wider">Live Deals Catalog</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={toggleDarkMode} 
            className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 transition-colors"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-slate-500" />}
          </button>

          <div className="flex items-center gap-3 border-l border-slate-200 dark:border-slate-800 pl-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{user?.name}</p>
              <p className="text-[10px] text-brand-600 font-bold uppercase">{user?.role}</p>
            </div>
            <button 
              onClick={() => logout()} 
              className="p-2.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-500 border border-slate-200/50 dark:border-slate-800/50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        
        {/* Banner Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <a 
              href="/admin/dashboard" 
              className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 uppercase tracking-wider mb-2 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
            </a>
            <h2 className="text-3xl font-extrabold tracking-tight">Deals & Offers Manager</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Manage dynamic seller inventory, rewards slots, and platform cashback multipliers.</p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={fetchDeals}
              className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-850 font-semibold text-sm shadow-sm transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Sync catalog</span>
            </button>

            <button
              onClick={() => { resetForm(); setShowCreateModal(true); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white rounded-xl font-bold text-sm shadow-md transition-all hover:scale-[1.01]"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Deal</span>
            </button>
          </div>
        </div>

        {/* Toast Alerts */}
        {alertMsg && (
          <div className={`p-4 rounded-xl border flex items-center gap-3 animate-slideIn ${
            alertMsg.type === 'success' 
              ? 'bg-emerald-50 text-emerald-800 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-300 dark:border-emerald-900/50'
              : 'bg-rose-50 text-rose-800 border-rose-100 dark:bg-rose-950/20 dark:text-rose-300 dark:border-rose-900/50'
          }`}>
            <span>{alertMsg.type === 'success' ? <Check className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}</span>
            <span className="text-sm font-bold">{alertMsg.text}</span>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="glass-panel p-5 rounded-2xl border border-slate-200/50 dark:border-slate-800/40">
            <p className="text-[10px] uppercase font-bold text-slate-400">Total Catalog Deals</p>
            <h3 className="text-3xl font-extrabold mt-2">{loading ? '...' : deals.length}</h3>
          </div>
          <div className="glass-panel p-5 rounded-2xl border border-slate-200/50 dark:border-slate-800/40">
            <p className="text-[10px] uppercase font-bold text-slate-400">Active Deals</p>
            <h3 className="text-3xl font-extrabold mt-2 text-emerald-500">{loading ? '...' : deals.filter(d => d.active).length}</h3>
          </div>
          <div className="glass-panel p-5 rounded-2xl border border-slate-200/50 dark:border-slate-800/40">
            <p className="text-[10px] uppercase font-bold text-slate-400">Inactive/Draft Deals</p>
            <h3 className="text-3xl font-extrabold mt-2 text-rose-500">{loading ? '...' : deals.filter(d => !d.active).length}</h3>
          </div>
          <div className="glass-panel p-5 rounded-2xl border border-slate-200/50 dark:border-slate-800/40">
            <p className="text-[10px] uppercase font-bold text-slate-400">Total Slots Left</p>
            <h3 className="text-3xl font-extrabold mt-2 text-brand-500">{loading ? '...' : deals.reduce((acc, d) => acc + d.slots, 0)}</h3>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="glass-panel rounded-3xl p-5 shadow-sm border border-slate-200/50 dark:border-slate-800/50 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search deals by platform, product code, name..."
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
            />
          </div>
          <div className="text-xs text-slate-400 font-semibold">
            Showing {filteredDeals.length} of {deals.length} deals in database
          </div>
        </div>

        {/* Inventory list */}
        <div className="glass-panel rounded-3xl overflow-hidden border border-slate-200/50 dark:border-slate-800/50 shadow-sm">
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center">
              <Loader2 className="w-10 h-10 text-brand-500 animate-spin" />
              <p className="text-sm font-semibold text-slate-400 mt-4">Retrieving live deals catalog...</p>
            </div>
          ) : filteredDeals.length === 0 ? (
            <div className="py-24 text-center">
              <span className="text-4xl">🔥</span>
              <h3 className="text-lg font-bold text-slate-700 dark:text-slate-350 mt-4">No Deals Found</h3>
              <p className="text-slate-400 text-sm mt-1">Try refining your search query or add a new deal.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50 dark:bg-slate-900/30">
                    <th className="px-6 py-4">Product Details</th>
                    <th className="px-6 py-4">Code</th>
                    <th className="px-6 py-4">Platform</th>
                    <th className="px-6 py-4">Original Price</th>
                    <th className="px-6 py-4">Cashback Payout</th>
                    <th className="px-6 py-4">Slots Left</th>
                    <th className="px-6 py-4 text-center">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/50">
                  {filteredDeals.map(d => {
                    const isAmazon = d.platform.toLowerCase() === 'amazon';
                    const isFlipkart = d.platform.toLowerCase() === 'flipkart';
                    const isBlinkit = d.platform.toLowerCase() === 'blinkit';
                    let platformBadge = "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300";
                    if (isAmazon) platformBadge = "bg-amber-50 text-amber-800 border border-amber-100 dark:bg-amber-950/20 dark:text-amber-300 dark:border-amber-950";
                    if (isFlipkart) platformBadge = "bg-blue-50 text-blue-800 border border-blue-100 dark:bg-blue-950/20 dark:text-blue-300 dark:border-blue-950";
                    if (isBlinkit) platformBadge = "bg-emerald-50 text-emerald-800 border border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-300 dark:border-emerald-950";

                    return (
                      <tr key={d.id} className="hover:bg-slate-100/30 dark:hover:bg-slate-900/20 transition-colors">
                        <td className="px-6 py-4">
                          <div className="max-w-xs md:max-w-md">
                            <p className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate" title={d.productName}>{d.productName}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-mono text-xs font-bold bg-slate-100 dark:bg-slate-900 px-2.5 py-1 rounded-md text-slate-600 dark:text-slate-300">
                            {d.productCode}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full ${platformBadge}`}>
                            {d.platform}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold">₹{d.price.toLocaleString()}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-emerald-500">₹{d.cashback.toLocaleString()}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            ({Math.round((d.cashback / d.price) * 100)}% return)
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2 py-0.5 rounded-full ${
                            d.slots <= 2 ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400' : 'bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-350'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${d.slots <= 2 ? 'bg-rose-500' : 'bg-slate-400'}`}></span>
                            {d.slots} slots
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => handleToggleActive(d)}
                            disabled={actionLoading === d.id}
                            className="inline-block"
                          >
                            {actionLoading === d.id ? (
                              <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
                            ) : d.active ? (
                              <ToggleRight className="w-8 h-8 text-emerald-500 hover:text-emerald-600 cursor-pointer" />
                            ) : (
                              <ToggleLeft className="w-8 h-8 text-slate-400 hover:text-slate-500 cursor-pointer" />
                            )}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => startEdit(d)}
                              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-brand-500 transition-colors"
                              title="Edit Deal"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteDeal(d.id)}
                              disabled={actionLoading === d.id}
                              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-rose-500 transition-colors"
                              title="Delete Deal"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* CREATE DEAL MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-filter backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-3xl max-w-md w-full shadow-2xl p-6 relative overflow-hidden animate-slideUp">
            <h3 className="text-xl font-extrabold tracking-tight mb-2">Create Offer / Deal</h3>
            <p className="text-xs text-slate-400 mb-6">Register a product package inside the live buyer-facing deals catalog.</p>

            <form onSubmit={handleCreateDeal} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Product Code (Unique)</label>
                <input
                  type="text"
                  value={productCode}
                  onChange={(e) => setProductCode(e.target.value)}
                  placeholder="AMZ004, BLK002"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Product Name</label>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="Apple Airpods Pro 2nd Gen"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Platform</label>
                  <select
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none dark:text-white"
                  >
                    <option value="Amazon">Amazon</option>
                    <option value="Flipkart">Flipkart</option>
                    <option value="Blinkit">Blinkit</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Slots available</label>
                  <input
                    type="number"
                    value={slots}
                    onChange={(e) => setSlots(e.target.value)}
                    placeholder="5"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Original Price (₹)</label>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="18999"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Cashback Amount (₹)</label>
                  <input
                    type="number"
                    value={cashback}
                    onChange={(e) => setCashback(e.target.value)}
                    placeholder="2500"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                <span className="text-xs font-bold text-slate-500">Live Immediately</span>
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="w-4 h-4 rounded text-brand-600 accent-brand-500"
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 py-3 bg-gradient-to-r from-brand-600 to-indigo-600 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2"
                >
                  {formLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Deal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT DEAL MODAL */}
      {editingDeal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-filter backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-3xl max-w-md w-full shadow-2xl p-6 relative overflow-hidden animate-slideUp">
            <h3 className="text-xl font-extrabold tracking-tight mb-2">Edit Live Deal</h3>
            <p className="text-xs text-slate-400 mb-6">Modify active properties for deal code: <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{editingDeal.productCode}</span></p>

            <form onSubmit={handleUpdateDeal} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Product Name</label>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="Apple Airpods Pro 2nd Gen"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Platform</label>
                  <select
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none dark:text-white"
                  >
                    <option value="Amazon">Amazon</option>
                    <option value="Flipkart">Flipkart</option>
                    <option value="Blinkit">Blinkit</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Slots available</label>
                  <input
                    type="number"
                    value={slots}
                    onChange={(e) => setSlots(e.target.value)}
                    placeholder="5"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Original Price (₹)</label>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="18999"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Cashback Amount (₹)</label>
                  <input
                    type="number"
                    value={cashback}
                    onChange={(e) => setCashback(e.target.value)}
                    placeholder="2500"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                <span className="text-xs font-bold text-slate-500">Live & Active</span>
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="w-4 h-4 rounded text-brand-600 accent-brand-500"
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setEditingDeal(null)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 py-3 bg-gradient-to-r from-brand-600 to-indigo-600 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2"
                >
                  {formLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
