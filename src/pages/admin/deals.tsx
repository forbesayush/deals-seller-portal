import React, { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import { useAuth } from '@/hooks/useAuth';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { DealCard } from '@/components/DealCard';
import type { Deal } from '@/types';
import {
  Plus, Search, Filter, RefreshCw, Tag, Edit3, Trash2, Copy,
  ToggleLeft, ToggleRight, Star, ChevronRight, X, Loader2,
  Grid3X3, List, AlertTriangle, Check, Sliders
} from 'lucide-react';

function formatINR(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

const PLATFORMS = ['Amazon', 'Flipkart', 'Blinkit', 'Myntra', 'Meesho', 'Other'];
const CATEGORIES = ['General', 'Electronics', 'Fashion', 'Groceries', 'Home & Kitchen', 'Beauty', 'Sports', 'Books', 'Toys'];
const DEAL_TYPES = ['cashback', 'cut', 'review', 'rating', 'image_review', 'qa', 'video'];

interface DealFormData {
  productCode: string;
  productName: string;
  platform: string;
  price: number | '';
  cashback: number | '';
  slots: number | '';
  active: boolean;
  category: string;
  expiresAt: string;
  description: string;
  imageUrl: string;
  rating: number | '';
  dealType: string;
  minOrderValue: number | '';
  maxPerUser: number | '';
  featured: boolean;
  tags: string;
}

const DEFAULT_FORM: DealFormData = {
  productCode: '', productName: '', platform: 'Amazon', price: '', cashback: '',
  slots: 5, active: true, category: 'General', expiresAt: '', description: '',
  imageUrl: '', rating: 4.5, dealType: 'cashback', minOrderValue: 0, maxPerUser: 1,
  featured: false, tags: '',
};

export default function AdminDeals() {
  const { user } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedDeals, setSelectedDeals] = useState<string[]>([]);

  const [showForm, setShowForm] = useState(false);
  const [editDeal, setEditDeal] = useState<Deal | null>(null);
  const [formData, setFormData] = useState<DealFormData>(DEFAULT_FORM);
  const [formLoading, setFormLoading] = useState(false);
  const [formMsg, setFormMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [showCloneModal, setShowCloneModal] = useState(false);
  const [cloneDeal, setCloneDeal] = useState<Deal | null>(null);
  const [cloneCode, setCloneCode] = useState('');
  const [cloneSlots, setCloneSlots] = useState('');
  const [cloneLoading, setCloneLoading] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteDeal, setDeleteDeal] = useState<Deal | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [showSlotModal, setShowSlotModal] = useState(false);
  const [slotDeal, setSlotDeal] = useState<Deal | null>(null);
  const [newSlots, setNewSlots] = useState('');
  const [slotReason, setSlotReason] = useState('');

  const toggleDark = () => {
    const isDark = !darkMode;
    setDarkMode(isDark);
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  };

  const fetchDeals = useCallback(async () => {
    setLoading(true);
    try {
      let url = '/api/deals?';
      if (searchQuery) url += `q=${encodeURIComponent(searchQuery)}&`;
      if (platformFilter !== 'All') url += `platform=${encodeURIComponent(platformFilter)}&`;
      const res = await fetch(url);
      if (res.ok) {
        let data = await res.json();
        if (statusFilter === 'active') data = data.filter((d: Deal) => d.active);
        if (statusFilter === 'inactive') data = data.filter((d: Deal) => !d.active);
        if (statusFilter === 'featured') data = data.filter((d: Deal) => d.featured);
        setDeals(data);
      }
    } catch { /* silent */ } finally { setLoading(false); }
  }, [searchQuery, platformFilter, statusFilter]);

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') { setDarkMode(true); document.documentElement.classList.add('dark'); }
    fetchDeals();
  }, [fetchDeals]);

  const openCreate = () => {
    setEditDeal(null);
    setFormData(DEFAULT_FORM);
    setFormMsg(null);
    setShowForm(true);
  };

  const openEdit = (deal: Deal) => {
    setEditDeal(deal);
    setFormData({
      productCode: deal.productCode, productName: deal.productName,
      platform: deal.platform, price: deal.price, cashback: deal.cashback,
      slots: deal.slots, active: deal.active, category: deal.category || 'General',
      expiresAt: deal.expiresAt || '', description: deal.description || '',
      imageUrl: deal.imageUrl || '', rating: deal.rating || 4.5,
      dealType: deal.dealType || 'cashback', minOrderValue: deal.minOrderValue || 0,
      maxPerUser: deal.maxPerUser || 1, featured: deal.featured || false,
      tags: Array.isArray(deal.tags) ? deal.tags.join(', ') : (deal.tags || ''),
    });
    setFormMsg(null);
    setShowForm(true);
  };

  const handleSubmitDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormMsg(null);
    try {
      const url = editDeal ? `/api/deals/${editDeal.id}` : '/api/deals';
      const method = editDeal ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok) {
        setFormMsg({ type: 'success', text: editDeal ? 'Deal updated successfully!' : 'Deal created successfully!' });
        fetchDeals();
        setTimeout(() => { setShowForm(false); setFormMsg(null); }, 1500);
      } else {
        setFormMsg({ type: 'error', text: data.detail || 'Failed to save deal' });
      }
    } catch {
      setFormMsg({ type: 'error', text: 'Network error' });
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleActive = async (deal: Deal) => {
    try {
      const res = await fetch(`/api/deals/${deal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !deal.active }),
      });
      if (res.ok) fetchDeals();
    } catch { /* silent */ }
  };

  const handleToggleFeatured = async (deal: Deal) => {
    try {
      const res = await fetch(`/api/deals/${deal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featured: !deal.featured }),
      });
      if (res.ok) fetchDeals();
    } catch { /* silent */ }
  };

  const handleDelete = async () => {
    if (!deleteDeal) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/deals/${deleteDeal.id}`, { method: 'DELETE' });
      if (res.ok) { setShowDeleteConfirm(false); setDeleteDeal(null); fetchDeals(); }
    } catch { /* silent */ } finally { setDeleteLoading(false); }
  };

  const handleClone = async () => {
    if (!cloneDeal || !cloneCode) return;
    setCloneLoading(true);
    try {
      const res = await fetch(`/api/deals/${cloneDeal.id}/clone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newProductCode: cloneCode, newSlots: cloneSlots ? parseInt(cloneSlots) : undefined }),
      });
      if (res.ok) { setShowCloneModal(false); setCloneDeal(null); setCloneCode(''); setCloneSlots(''); fetchDeals(); }
    } catch { /* silent */ } finally { setCloneLoading(false); }
  };

  const handleAdjustSlots = async () => {
    if (!slotDeal || !newSlots) return;
    try {
      const res = await fetch(`/api/deals/${slotDeal.id}/slots?new_slots=${newSlots}&reason=${encodeURIComponent(slotReason || 'Manual')}`, {
        method: 'PATCH',
      });
      if (res.ok) { setShowSlotModal(false); setSlotDeal(null); setNewSlots(''); setSlotReason(''); fetchDeals(); }
    } catch { /* silent */ }
  };

  const filteredDeals = deals;
  const activeCount = deals.filter(d => d.active).length;
  const featuredCount = deals.filter(d => d.featured).length;

  return (
    <>
      <Head>
        <title>Manage Deals — Admin Portal</title>
        <meta name="description" content="Create, manage, and monitor all deals in the portal." />
      </Head>

      <div className="min-h-screen flex" style={{ background: 'var(--color-bg)' }}>
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} darkMode={darkMode} />

        <div className="flex-1 flex flex-col min-h-screen transition-all duration-300"
          style={{ marginLeft: sidebarCollapsed ? 72 : 260 }}>
          <Header title="Deals Manager" darkMode={darkMode} onToggleDark={toggleDark} sidebarCollapsed={sidebarCollapsed} />

          <main className="flex-1 p-6 pt-[88px]">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h1 className="page-title">Deal Catalog</h1>
                <p className="page-subtitle">
                  {deals.length} deals total · {activeCount} active · {featuredCount} featured
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')} className="btn btn-ghost btn-sm">
                  {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid3X3 className="w-4 h-4" />}
                </button>
                <button onClick={fetchDeals} className="btn btn-ghost btn-sm">
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button onClick={openCreate} className="btn btn-primary btn-sm">
                  <Plus className="w-4 h-4" /> New Deal
                </button>
              </div>
            </div>

            {/* Stats Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {[
                { label: 'Total Deals', value: deals.length, color: 'text-brand-600' },
                { label: 'Active', value: activeCount, color: 'text-emerald-500' },
                { label: 'Featured', value: featuredCount, color: 'text-amber-500' },
                { label: 'Inactive', value: deals.length - activeCount, color: 'text-rose-500' },
              ].map(s => (
                <div key={s.label} className="premium-card p-3 text-center">
                  <p className={`text-2xl font-extrabold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3 mb-5">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text" placeholder="Search by name, code, platform..."
                  value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  className="input pl-9 text-sm"
                />
              </div>
              <select value={platformFilter} onChange={e => setPlatformFilter(e.target.value)} className="select text-sm w-auto">
                <option value="All">All Platforms</option>
                {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="select text-sm w-auto">
                <option value="All">All Status</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
                <option value="featured">Featured</option>
              </select>
            </div>

            {/* Deals Grid / List */}
            {loading ? (
              <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
                {Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton rounded-2xl h-64" />)}
              </div>
            ) : filteredDeals.length === 0 ? (
              <div className="text-center py-20">
                <Tag className="w-16 h-16 text-slate-200 dark:text-slate-700 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-slate-400">No deals found</h3>
                <p className="text-slate-300 dark:text-slate-600 mt-2 mb-6">Start by creating your first deal</p>
                <button onClick={openCreate} className="btn btn-primary">
                  <Plus className="w-4 h-4" /> Create Deal
                </button>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredDeals.map(deal => (
                  <div key={deal.id} className="relative group">
                    <DealCard deal={deal} onClaim={() => {}} />
                    {/* Admin Action Overlay */}
                    <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1">
                      <button onClick={() => openEdit(deal)} className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 shadow-md flex items-center justify-center hover:bg-brand-50 dark:hover:bg-brand-950/30 transition-colors" title="Edit">
                        <Edit3 className="w-3.5 h-3.5 text-brand-600" />
                      </button>
                      <button onClick={() => { setCloneDeal(deal); setShowCloneModal(true); }} className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 shadow-md flex items-center justify-center hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors" title="Clone">
                        <Copy className="w-3.5 h-3.5 text-amber-500" />
                      </button>
                      <button onClick={() => handleToggleFeatured(deal)} className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 shadow-md flex items-center justify-center hover:bg-amber-50 transition-colors" title="Toggle Featured">
                        <Star className={`w-3.5 h-3.5 ${deal.featured ? 'text-amber-500 fill-amber-500' : 'text-slate-400'}`} />
                      </button>
                      <button onClick={() => { setSlotDeal(deal); setNewSlots(String(deal.slots)); setShowSlotModal(true); }} className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 shadow-md flex items-center justify-center hover:bg-blue-50 transition-colors" title="Adjust Slots">
                        <Sliders className="w-3.5 h-3.5 text-blue-500" />
                      </button>
                      <button onClick={() => { setDeleteDeal(deal); setShowDeleteConfirm(true); }} className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 shadow-md flex items-center justify-center hover:bg-rose-50 transition-colors" title="Delete">
                        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                      </button>
                    </div>
                    {/* Active Toggle */}
                    <button
                      onClick={() => handleToggleActive(deal)}
                      className={`absolute bottom-16 right-3 badge text-[10px] ${deal.active ? 'badge-emerald' : 'badge-rose'}`}
                    >
                      {deal.active ? '● Live' : '○ Paused'}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              /* List View */
              <div className="premium-card overflow-hidden">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Platform</th>
                      <th>Price</th>
                      <th>Cashback</th>
                      <th>Slots</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDeals.map(deal => (
                      <tr key={deal.id}>
                        <td>
                          <div>
                            <p className="font-semibold text-sm">{deal.productName}</p>
                            <p className="text-xs text-slate-400">{deal.productCode}</p>
                          </div>
                        </td>
                        <td className="text-sm">{deal.platform}</td>
                        <td className="font-bold text-sm">{formatINR(deal.price)}</td>
                        <td className="font-bold text-emerald-600 text-sm">{formatINR(deal.cashback)}</td>
                        <td>
                          <span className={`font-bold text-sm ${deal.slots <= 2 ? 'text-rose-500' : deal.slots <= 5 ? 'text-amber-500' : 'text-emerald-500'}`}>
                            {deal.slots}
                          </span>
                        </td>
                        <td>
                          <div className="flex gap-1 items-center">
                            <span className={`badge ${deal.active ? 'badge-emerald' : 'badge-rose'} text-[10px]`}>
                              {deal.active ? 'Active' : 'Paused'}
                            </span>
                            {deal.featured && <span className="badge badge-amber text-[10px]">★ Featured</span>}
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center gap-1">
                            <button onClick={() => openEdit(deal)} className="btn btn-ghost btn-sm px-2"><Edit3 className="w-3.5 h-3.5" /></button>
                            <button onClick={() => { setCloneDeal(deal); setShowCloneModal(true); }} className="btn btn-ghost btn-sm px-2"><Copy className="w-3.5 h-3.5" /></button>
                            <button onClick={() => handleToggleActive(deal)} className="btn btn-ghost btn-sm px-2">
                              {deal.active ? <ToggleRight className="w-4 h-4 text-emerald-500" /> : <ToggleLeft className="w-4 h-4 text-slate-400" />}
                            </button>
                            <button onClick={() => { setDeleteDeal(deal); setShowDeleteConfirm(true); }} className="btn btn-ghost btn-sm px-2 text-rose-500"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* ── Create/Edit Deal Modal ── */}
      {showForm && (
        <div className="modal-backdrop" onClick={() => setShowForm(false)}>
          <div className="modal-content max-w-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-extrabold text-xl">{editDeal ? 'Edit Deal' : 'Create New Deal'}</h3>
                <button onClick={() => setShowForm(false)} className="btn btn-ghost btn-sm"><X className="w-4 h-4" /></button>
              </div>

              {formMsg && (
                <div className={`p-3 rounded-xl text-sm mb-4 flex items-center gap-2 ${formMsg.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600' : 'bg-rose-50 dark:bg-rose-950/30 text-rose-600'}`}>
                  {formMsg.type === 'success' ? <Check className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                  {formMsg.text}
                </div>
              )}

              <form onSubmit={handleSubmitDeal} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="section-label">Product Code *</label>
                  <input required value={formData.productCode} onChange={e => setFormData(p => ({ ...p, productCode: e.target.value }))} className="input" placeholder="AMZ001" />
                </div>
                <div>
                  <label className="section-label">Platform *</label>
                  <select required value={formData.platform} onChange={e => setFormData(p => ({ ...p, platform: e.target.value }))} className="select">
                    {PLATFORMS.map(pl => <option key={pl} value={pl}>{pl}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="section-label">Product Name *</label>
                  <input required value={formData.productName} onChange={e => setFormData(p => ({ ...p, productName: e.target.value }))} className="input" placeholder="Full product name" />
                </div>
                <div>
                  <label className="section-label">Price (₹) *</label>
                  <input type="number" required value={formData.price} onChange={e => setFormData(p => ({ ...p, price: parseFloat(e.target.value) || '' }))} className="input" placeholder="1299" />
                </div>
                <div>
                  <label className="section-label">Cashback (₹) *</label>
                  <input type="number" required value={formData.cashback} onChange={e => setFormData(p => ({ ...p, cashback: parseFloat(e.target.value) || '' }))} className="input" placeholder="300" />
                </div>
                <div>
                  <label className="section-label">Available Slots *</label>
                  <input type="number" required min="0" value={formData.slots} onChange={e => setFormData(p => ({ ...p, slots: parseInt(e.target.value) || 0 }))} className="input" placeholder="5" />
                </div>
                <div>
                  <label className="section-label">Category</label>
                  <select value={formData.category} onChange={e => setFormData(p => ({ ...p, category: e.target.value }))} className="select">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="section-label">Deal Type</label>
                  <select value={formData.dealType} onChange={e => setFormData(p => ({ ...p, dealType: e.target.value }))} className="select">
                    {DEAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="section-label">Rating (0-5)</label>
                  <input type="number" step="0.1" min="0" max="5" value={formData.rating} onChange={e => setFormData(p => ({ ...p, rating: parseFloat(e.target.value) || '' }))} className="input" placeholder="4.5" />
                </div>
                <div>
                  <label className="section-label">Expires At</label>
                  <input type="datetime-local" value={formData.expiresAt} onChange={e => setFormData(p => ({ ...p, expiresAt: e.target.value }))} className="input" />
                </div>
                <div>
                  <label className="section-label">Max Per User</label>
                  <input type="number" min="1" value={formData.maxPerUser} onChange={e => setFormData(p => ({ ...p, maxPerUser: parseInt(e.target.value) || 1 }))} className="input" placeholder="1" />
                </div>
                <div className="sm:col-span-2">
                  <label className="section-label">Description</label>
                  <textarea rows={2} value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} className="input resize-none" placeholder="Describe the deal..." />
                </div>
                <div>
                  <label className="section-label">Image URL</label>
                  <input value={formData.imageUrl} onChange={e => setFormData(p => ({ ...p, imageUrl: e.target.value }))} className="input" placeholder="https://..." />
                </div>
                <div>
                  <label className="section-label">Tags (comma-separated)</label>
                  <input value={formData.tags} onChange={e => setFormData(p => ({ ...p, tags: e.target.value }))} className="input" placeholder="sale, new, trending" />
                </div>
                <div className="sm:col-span-2 flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={formData.active} onChange={e => setFormData(p => ({ ...p, active: e.target.checked }))} className="w-4 h-4 rounded accent-brand-600" />
                    <span className="text-sm font-semibold">Active (visible to users)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={formData.featured} onChange={e => setFormData(p => ({ ...p, featured: e.target.checked }))} className="w-4 h-4 rounded accent-amber-500" />
                    <span className="text-sm font-semibold">Featured (highlighted)</span>
                  </label>
                </div>
                <div className="sm:col-span-2 flex gap-3 pt-2">
                  <button type="submit" disabled={formLoading} className="btn btn-primary flex-1">
                    {formLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : editDeal ? 'Update Deal' : 'Create Deal'}
                  </button>
                  <button type="button" onClick={() => setShowForm(false)} className="btn btn-ghost">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── Clone Modal ── */}
      {showCloneModal && cloneDeal && (
        <div className="modal-backdrop" onClick={() => setShowCloneModal(false)}>
          <div className="modal-content max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <h3 className="font-extrabold text-lg mb-1">Clone Deal</h3>
              <p className="text-sm text-slate-400 mb-5">Creating a copy of: <strong>{cloneDeal.productName}</strong></p>
              <div className="space-y-4">
                <div>
                  <label className="section-label">New Product Code *</label>
                  <input value={cloneCode} onChange={e => setCloneCode(e.target.value)} className="input" placeholder="AMZ001-B" required />
                </div>
                <div>
                  <label className="section-label">New Slot Count (optional)</label>
                  <input type="number" value={cloneSlots} onChange={e => setCloneSlots(e.target.value)} className="input" placeholder={String(cloneDeal.slots)} />
                </div>
                <div className="flex gap-2">
                  <button onClick={handleClone} disabled={cloneLoading || !cloneCode} className="btn btn-primary flex-1">
                    {cloneLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Cloning...</> : <><Copy className="w-4 h-4" /> Clone Deal</>}
                  </button>
                  <button onClick={() => setShowCloneModal(false)} className="btn btn-ghost">Cancel</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Adjust Slots Modal ── */}
      {showSlotModal && slotDeal && (
        <div className="modal-backdrop" onClick={() => setShowSlotModal(false)}>
          <div className="modal-content max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <h3 className="font-extrabold text-lg mb-1">Adjust Slots</h3>
              <p className="text-sm text-slate-400 mb-5">Current: <strong>{slotDeal.slots}</strong> slots for {slotDeal.productName}</p>
              <div className="space-y-4">
                <div>
                  <label className="section-label">New Slot Count *</label>
                  <input type="number" min="0" value={newSlots} onChange={e => setNewSlots(e.target.value)} className="input" required />
                </div>
                <div>
                  <label className="section-label">Reason</label>
                  <input value={slotReason} onChange={e => setSlotReason(e.target.value)} className="input" placeholder="Manual adjustment, new batch, etc." />
                </div>
                <div className="flex gap-2">
                  <button onClick={handleAdjustSlots} disabled={!newSlots} className="btn btn-primary flex-1">
                    <Sliders className="w-4 h-4" /> Update Slots
                  </button>
                  <button onClick={() => setShowSlotModal(false)} className="btn btn-ghost">Cancel</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ── */}
      {showDeleteConfirm && deleteDeal && (
        <div className="modal-backdrop" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal-content max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-rose-100 dark:bg-rose-950/40 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-6 h-6 text-rose-500" />
              </div>
              <h3 className="font-extrabold text-lg mb-2">Delete Deal?</h3>
              <p className="text-sm text-slate-400 mb-6">
                Are you sure you want to permanently delete <strong>{deleteDeal.productName}</strong>? This cannot be undone.
              </p>
              <div className="flex gap-3">
                <button onClick={handleDelete} disabled={deleteLoading} className="btn btn-danger flex-1">
                  {deleteLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Deleting...</> : 'Yes, Delete'}
                </button>
                <button onClick={() => setShowDeleteConfirm(false)} className="btn btn-ghost flex-1">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
