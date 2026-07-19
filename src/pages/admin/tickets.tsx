import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks/useAuth';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { Ticket, CheckCircle2, Clock, MessageSquare, X, ChevronDown, ChevronUp, RefreshCw, Send, Loader2, Sparkles } from 'lucide-react';

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
  open: 'badge-amber',
  resolved: 'badge-emerald',
};

export default function AdminTickets() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<TicketItem | null>(null);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const handleAiSuggest = async (t: TicketItem) => {
    setAiGenerating(true);
    setAiError(null);
    try {
      const res = await fetch('/api/ai/suggest-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId: t.id,
          title: t.title,
          description: t.description,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.suggestion) {
          setReplyText(data.suggestion);
        } else {
          setAiError(data.detail || 'Failed to generate suggestion.');
        }
      } else {
        const err = await res.json();
        setAiError(err.detail || 'Error communicating with AI.');
      }
    } catch (e: any) {
      setAiError(e.message || 'Connection to Ollama failed.');
    } finally {
      setAiGenerating(false);
    }
  };

  const toggleDark = () => {
    const isDark = !darkMode;
    setDarkMode(isDark);
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  };

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tickets');
      if (res.ok) {
        setTickets(await res.json());
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
    if (isAuthenticated) fetchTickets();
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

  return (
    <>
      <Head>
        <title>Support Tickets Desk — Admin Portal</title>
      </Head>

      <div className="min-h-screen flex" style={{ background: 'var(--color-bg)' }}>
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} darkMode={darkMode} />

        <div className="flex-1 flex flex-col min-h-screen transition-all duration-300"
          style={{ marginLeft: sidebarCollapsed ? 72 : 260 }}>
          <Header title="Support Desk" darkMode={darkMode} onToggleDark={toggleDark} sidebarCollapsed={sidebarCollapsed} />

          <main className="flex-1 p-6 pt-[88px] space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="page-title flex items-center gap-2">
                  <Ticket className="w-6 h-6 text-brand-600 dark:text-violet-400" />
                  Support Tickets Desk
                </h1>
                <p className="page-subtitle">Manage customer queries and support issues</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={fetchTickets} className="btn btn-ghost btn-sm">
                  <RefreshCw className="w-4 h-4" />
                </button>
                {(['all', 'open', 'resolved'] as const).map(f => (
                  <button key={f} onClick={() => setFilter(f)}
                    className={`btn btn-sm rounded-lg ${filter === f ? 'bg-brand-600 text-white shadow-sm' : 'btn-ghost'}`}>
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Tickets List */}
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="premium-card text-center py-16 text-slate-400">
                <Ticket className="w-12 h-12 mx-auto mb-3 opacity-35 text-slate-300 dark:text-slate-650" />
                <p className="font-bold">No tickets to show</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map(ticket => (
                  <div key={ticket.id} className="premium-card overflow-hidden transition-all duration-200">
                    <div
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/40"
                      onClick={() => { setExpandedId(expandedId === ticket.id ? null : ticket.id); setSelected(ticket); setReplyText(''); }}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`badge ${PRIORITY_COLORS[ticket.status] || 'badge-slate'} text-[10px]`}>
                          {ticket.status}
                        </span>
                        <div>
                          <p className="font-bold text-sm text-slate-800 dark:text-slate-200">{ticket.title}</p>
                          <p className="text-xs text-slate-400">{ticket.category} · {ticket.userId} · {new Date(ticket.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      {expandedId === ticket.id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </div>

                    {expandedId === ticket.id && (
                      <div className="border-t border-slate-100 dark:border-slate-800 p-5 space-y-4 bg-slate-50/20 dark:bg-slate-900/10">
                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase mb-1">Buyer Message</p>
                          <p className="text-sm text-slate-600 dark:text-slate-350 whitespace-pre-wrap">{ticket.description}</p>
                        </div>

                        {ticket.reply && (
                          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 rounded-xl">
                            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-1 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Staff Reply
                            </p>
                            <p className="text-sm text-emerald-700 dark:text-emerald-300 whitespace-pre-wrap">{ticket.reply}</p>
                          </div>
                        )}

                        {ticket.status === 'open' && (
                          <form onSubmit={(e) => { setSelected(ticket); handleReply(e); }} className="space-y-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-bold text-slate-400 uppercase">Write Staff Reply</span>
                              <button
                                type="button"
                                onClick={() => handleAiSuggest(ticket)}
                                disabled={aiGenerating}
                                className="btn btn-ghost btn-xs text-brand-600 dark:text-violet-400 font-extrabold flex items-center gap-1 hover:bg-brand-50/50 dark:hover:bg-violet-950/20"
                              >
                                {aiGenerating ? (
                                  <><Loader2 className="w-3 h-3 animate-spin text-brand-500" /> Generating...</>
                                ) : (
                                  <><Sparkles className="w-3 h-3 text-amber-500 fill-amber-500" /> AI Suggest Reply</>
                                )}
                              </button>
                            </div>
                            
                            {aiError && (
                              <p className="text-xs font-semibold text-rose-500 bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-900/30 p-2.5 rounded-lg mb-2">
                                {aiError}
                              </p>
                            )}

                            <textarea
                              value={replyText}
                              onChange={e => setReplyText(e.target.value)}
                              placeholder="Type your reply to the buyer..."
                              required
                              className="w-full input p-3 text-sm h-24 resize-none"
                            />
                            <div className="flex items-center justify-end">
                              <button type="submit" disabled={submitting || !replyText || aiGenerating}
                                className="btn btn-primary btn-sm">
                                {submitting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending...</> : <><Send className="w-3.5 h-3.5" /> Send Reply & Resolve</>}
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
          </main>
        </div>
      </div>
    </>
  );
}
