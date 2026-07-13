import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks/useAuth';
import { Megaphone, Plus, Edit2, X, CheckCircle2, Loader2, AlertTriangle, Info } from 'lucide-react';

interface Ann {
  id: string;
  authorId: string;
  title: string;
  body: string;
  priority: string;
  active: boolean;
  createdAt: string;
}

const PRIORITY_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  normal: { label: 'Normal', color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400', icon: Info },
  info: { label: 'Info', color: 'bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400', icon: Info },
  urgent: { label: 'Urgent', color: 'bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400', icon: AlertTriangle },
};

export default function AdminAnnouncements() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [anns, setAnns] = useState<Ann[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Ann | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [priority, setPriority] = useState('normal');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !['admin', 'super_admin'].includes(user?.role || ''))) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, user]);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetch('/api/announcements').then(r => r.json()).then(d => { setAnns(d); setLoading(false); });
  }, [isAuthenticated]);

  const openCreate = () => { setEditTarget(null); setTitle(''); setBody(''); setPriority('normal'); setShowForm(true); };
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

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900"><div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-brand-500" />
            Announcements Manager
          </h1>
          <div className="flex items-center gap-2">
            <button onClick={openCreate} className="flex items-center gap-1.5 px-3 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold text-xs transition-colors">
              <Plus className="w-4 h-4" />
              New Announcement
            </button>
            <button onClick={() => router.push('/admin/dashboard')} className="px-3 py-2 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 rounded-xl transition-colors">
              ← Dashboard
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {anns.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Megaphone className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-semibold">No announcements yet</p>
            </div>
          ) : anns.map(ann => {
            const cfg = PRIORITY_CONFIG[ann.priority] || PRIORITY_CONFIG.normal;
            const Icon = cfg.icon;
            return (
              <div key={ann.id} className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 p-5 shadow-sm transition-opacity ${ann.active ? '' : 'opacity-50'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={`rounded-xl p-2 mt-0.5 ${cfg.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-extrabold text-slate-700 dark:text-slate-200 text-sm">{ann.title}</h3>
                        <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
                        {!ann.active && <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-400">Inactive</span>}
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed">{ann.body}</p>
                      <p className="text-[10px] text-slate-400 mt-2">{new Date(ann.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => openEdit(ann)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                      <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                    <button onClick={() => toggleActive(ann)} className={`p-1.5 rounded-lg transition-colors ${ann.active ? 'hover:bg-rose-50 dark:hover:bg-rose-950/20' : 'hover:bg-emerald-50 dark:hover:bg-emerald-950/20'}`}>
                      {ann.active ? <X className="w-3.5 h-3.5 text-rose-400" /> : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200/50 dark:border-slate-800/50">
            <h3 className="font-extrabold text-lg text-slate-800 dark:text-slate-100 mb-5">{editTarget ? 'Edit Announcement' : 'New Announcement'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Title</label>
                <input type="text" required value={title} onChange={e => setTitle(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Priority</label>
                <select value={priority} onChange={e => setPriority(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none">
                  <option value="normal">Normal</option>
                  <option value="info">Info</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Body</label>
                <textarea required value={body} onChange={e => setBody(e.target.value)} rows={4} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none resize-none" />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 rounded-lg transition-colors">Cancel</button>
                <button type="submit" disabled={submitting} className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold text-sm flex items-center gap-2">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : editTarget ? 'Save Changes' : 'Publish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
