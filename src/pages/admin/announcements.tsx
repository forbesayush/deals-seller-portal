import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks/useAuth';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { Megaphone, Plus, Edit2, X, CheckCircle2, Loader2, AlertTriangle, Info, RefreshCw } from 'lucide-react';

interface Ann {
  id: string;
  authorId: string;
  title: string;
  body: string;
  priority: string;
  active: boolean;
  createdAt: string;
}

const PRIORITY_CONFIG: Record<string, { label: string; color: string; badge: string; icon: any }> = {
  normal: { label: 'Normal', color: 'text-slate-600', badge: 'badge-slate', icon: Info },
  info: { label: 'Info', color: 'text-blue-600', badge: 'badge-blue', icon: Info },
  urgent: { label: 'Urgent', color: 'text-rose-600', badge: 'badge-rose', icon: AlertTriangle },
};

export default function AdminAnnouncements() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const [anns, setAnns] = useState<Ann[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Ann | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [priority, setPriority] = useState('normal');
  const [submitting, setSubmitting] = useState(false);

  const toggleDark = () => {
    const isDark = !darkMode;
    setDarkMode(isDark);
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  };

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/announcements');
      if (res.ok) {
        setAnns(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') { setDarkMode(true); document.documentElement.classList.add('dark'); }
    if (isAuthenticated) fetchAnnouncements();
  }, [isAuthenticated]);

  const openCreate = () => { setTitle(''); setBody(''); setPriority('normal'); setEditTarget(null); setShowForm(true); };
  const openEdit = (a: Ann) => { setEditTarget(a); setTitle(a.title); setBody(a.body); setPriority(a.priority); setShowForm(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const url = editTarget ? `/api/announcements/${editTarget.id}` : '/api/announcements';
    const method = editTarget ? 'PATCH' : 'POST';
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, body, priority }) });
    if (res.ok) {
      const data = await res.json();
      if (editTarget) {
        setAnns(prev => prev.map(a => a.id === data.id ? data : a));
      } else {
        setAnns(prev => [data, ...prev]);
      }
      setShowForm(false);
    }
    setSubmitting(false);
  };

  const toggleActive = async (ann: Ann) => {
    const res = await fetch(`/api/announcements/${ann.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: !ann.active }) });
    if (res.ok) {
      const data = await res.json();
      setAnns(prev => prev.map(a => a.id === data.id ? data : a));
    }
  };

  return (
    <>
      <Head>
        <title>Announcements Manager — Admin Portal</title>
      </Head>

      <div className="min-h-screen flex" style={{ background: 'var(--color-bg)' }}>
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} darkMode={darkMode} />

        <div className="flex-1 flex flex-col min-h-screen transition-all duration-300"
          style={{ marginLeft: sidebarCollapsed ? 72 : 260 }}>
          <Header title="Announcements" darkMode={darkMode} onToggleDark={toggleDark} sidebarCollapsed={sidebarCollapsed} />

          <main className="flex-1 p-6 pt-[88px] max-w-4xl space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="page-title flex items-center gap-2">
                  <Megaphone className="w-6 h-6 text-brand-600 dark:text-violet-400" />
                  Announcements Manager
                </h1>
                <p className="page-subtitle">Publish alerts and notifications for the user portal</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={fetchAnnouncements} className="btn btn-ghost btn-sm">
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button onClick={openCreate} className="btn btn-primary btn-sm">
                  <Plus className="w-4 h-4" />
                  New Announcement
                </button>
              </div>
            </div>

            {/* List */}
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}
              </div>
            ) : anns.length === 0 ? (
              <div className="premium-card text-center py-16 text-slate-400">
                <Megaphone className="w-12 h-12 mx-auto mb-3 opacity-35 text-slate-300 dark:text-slate-650" />
                <p className="font-bold">No announcements yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {anns.map(ann => {
                  const cfg = PRIORITY_CONFIG[ann.priority] || PRIORITY_CONFIG.normal;
                  const Icon = cfg.icon;
                  return (
                    <div key={ann.id} className={`premium-card p-5 transition-opacity ${ann.active ? '' : 'opacity-55'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center bg-slate-100 dark:bg-slate-800 ${cfg.color}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm">{ann.title}</h3>
                              <span className={`badge ${cfg.badge} text-[9px] uppercase`}>{cfg.label}</span>
                              {!ann.active && <span className="badge badge-slate text-[9px] uppercase">Inactive</span>}
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{ann.body}</p>
                            <p className="text-[10px] text-slate-400 mt-2">{new Date(ann.createdAt).toLocaleString()}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEdit(ann)} className="btn btn-ghost btn-sm px-2" title="Edit">
                            <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                          </button>
                          <button
                            onClick={() => toggleActive(ann)}
                            className={`btn btn-ghost btn-sm px-2 ${ann.active ? 'text-rose-500' : 'text-emerald-500'}`}
                            title={ann.active ? 'Disable' : 'Enable'}
                          >
                            {ann.active ? <X className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="modal-backdrop" onClick={() => setShowForm(false)}>
          <div className="modal-content max-w-lg animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <h3 className="font-extrabold text-lg text-slate-800 dark:text-slate-100 mb-5">
                {editTarget ? 'Edit Announcement' : 'New Announcement'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="section-label">Title *</label>
                  <input type="text" required value={title} onChange={e => setTitle(e.target.value)} className="w-full input" />
                </div>
                <div>
                  <label className="section-label">Priority</label>
                  <select value={priority} onChange={e => setPriority(e.target.value)} className="w-full select">
                    <option value="normal">Normal</option>
                    <option value="info">Info</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="section-label">Body *</label>
                  <textarea required value={body} onChange={e => setBody(e.target.value)} rows={4} className="w-full input resize-none" />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setShowForm(false)} className="btn btn-ghost">Cancel</button>
                  <button type="submit" disabled={submitting} className="btn btn-primary">
                    {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Publishing...</> : editTarget ? 'Save Changes' : 'Publish'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
