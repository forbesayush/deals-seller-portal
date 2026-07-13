import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks/useAuth';
import { Ticket, CheckCircle2, Clock, MessageSquare, X, ChevronDown, ChevronUp } from 'lucide-react';

interface TicketItem {
  id: string;
  userId: string;
  title: string;
  description: string;
  category: string;
  status: string;
  reply: string | null;
  createdAt: string;
}

const PRIORITY_COLORS: Record<string, string> = {
  open: 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 border-amber-200 dark:border-amber-900',
  resolved: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900',
};

export default function AdminTickets() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<TicketItem | null>(null);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !['admin', 'super_admin', 'manager', 'staff'].includes(user?.role || ''))) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, user]);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetch('/api/tickets').then(r => r.json()).then(data => {
      setTickets(data);
      setLoading(false);
    });
  }, [isAuthenticated]);

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/tickets/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reply: replyText }),
      });
      if (res.ok) {
        const updated = await res.json();
        setTickets(prev => prev.map(t => t.id === updated.id ? updated : t));
        setSelected(updated);
        setReplyText('');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = tickets.filter(t => filter === 'all' || t.status === filter);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Ticket className="w-6 h-6 text-brand-500" />
            Support Tickets Desk
          </h1>
          <div className="flex gap-2">
            {(['all', 'open', 'resolved'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-colors ${filter === f ? 'bg-brand-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
                {f}
              </button>
            ))}
            <button onClick={() => router.push('/admin/dashboard')} className="ml-2 px-3 py-1.5 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 rounded-lg transition-colors">
              ← Dashboard
            </button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Ticket className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-semibold">No tickets to show</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(ticket => (
              <div key={ticket.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-sm">
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  onClick={() => { setExpandedId(expandedId === ticket.id ? null : ticket.id); setSelected(ticket); setReplyText(''); }}
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${PRIORITY_COLORS[ticket.status] || 'bg-slate-50 text-slate-500'}`}>
                      {ticket.status}
                    </span>
                    <div>
                      <p className="font-bold text-sm text-slate-700 dark:text-slate-200">{ticket.title}</p>
                      <p className="text-xs text-slate-400">{ticket.category} · {ticket.userId} · {new Date(ticket.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  {expandedId === ticket.id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </div>

                {expandedId === ticket.id && (
                  <div className="border-t border-slate-100 dark:border-slate-800 p-5 space-y-4">
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase mb-1">Buyer Message</p>
                      <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{ticket.description}</p>
                    </div>

                    {ticket.reply && (
                      <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 rounded-xl">
                        <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-1 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Staff Reply</p>
                        <p className="text-sm text-emerald-700 dark:text-emerald-300 whitespace-pre-wrap">{ticket.reply}</p>
                      </div>
                    )}

                    {ticket.status === 'open' && (
                      <form onSubmit={(e) => { setSelected(ticket); handleReply(e); }} className="space-y-3">
                        <textarea
                          value={replyText}
                          onChange={e => setReplyText(e.target.value)}
                          placeholder="Type your reply to the buyer..."
                          required
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none text-sm h-24 resize-none"
                        />
                        <div className="flex items-center justify-end gap-2">
                          <button type="submit" disabled={submitting || !replyText}
                            className="px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors">
                            <MessageSquare className="w-3.5 h-3.5" />
                            {submitting ? 'Sending...' : 'Send Reply & Resolve'}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
