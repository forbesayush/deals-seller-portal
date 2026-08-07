import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useAuth } from '@/hooks/useAuth';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import {
  Search, RefreshCw, FileText, Calendar, Terminal, ShieldAlert,
  Cpu, Download, Eye, X, Loader2, LogIn, LogOut, Lock, KeyRound, ShieldCheck
} from 'lucide-react';

interface AuditLog {
  id: string;
  userId: string | null;
  userEmail: string;
  action: string;
  targetType: string;
  targetId: string | null;
  timestamp: string;
  ipAddress: string | null;
  userAgent: string | null;
  oldData: any | null;
  newData: any | null;
}

interface AuthEvent {
  id: string;
  action: string;
  userId: string | null;
  userEmail: string | null;
  ip: string | null;
  userAgent: string | null;
  detail: string | null;
  timestamp: string;
}

const AUTH_ACTION_META: Record<string, { label: string; badge: string; icon: React.ElementType }> = {
  LOGIN_SUCCESS:           { label: 'Login Success',        badge: 'badge-emerald', icon: LogIn },
  LOGIN_FAILED:            { label: 'Login Failed',         badge: 'badge-rose',    icon: ShieldAlert },
  ACCOUNT_LOCKED:          { label: 'Account Locked',       badge: 'badge-amber',   icon: Lock },
  LOGOUT:                  { label: 'Logout',               badge: 'badge-slate',   icon: LogOut },
  IDLE_LOGOUT:             { label: 'Idle Logout',          badge: 'badge-slate',   icon: LogOut },
  PASSWORD_RESET_REQUEST:  { label: 'Password Reset Req.',  badge: 'badge-blue',    icon: KeyRound },
  PASSWORD_RESET_COMPLETE: { label: 'Password Reset Done',  badge: 'badge-emerald', icon: ShieldCheck },
};

export default function AuditLogs() {
  const { user } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'audit' | 'auth'>('audit');

  // Audit Logs state
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [logSearchQuery, setLogSearchQuery] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  // Auth Events state
  const [authEvents, setAuthEvents] = useState<AuthEvent[]>([]);
  const [authLoading, setAuthLoading] = useState(true);
  const [authSearch, setAuthSearch] = useState('');
  const [authActionFilter, setAuthActionFilter] = useState('ALL');

  const toggleDark = () => {
    const isDark = !darkMode;
    setDarkMode(isDark);
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  };

  // ── Audit Logs fetching ─────────────────────────────────────────────────────
  const fetchLogs = async () => {
    setLogsLoading(true);
    try {
      const res = await fetch('/api/audit-logs');
      const data = await res.json();
      if (res.ok) setLogs(data);
    } catch (e) {
      console.error('Error loading audit logs', e);
    } finally {
      setLogsLoading(false);
    }
  };

  // ── Auth Events fetching ────────────────────────────────────────────────────
  const fetchAuthEvents = async () => {
    setAuthLoading(true);
    try {
      const res = await fetch(`/api/admin/auth-logs?action=${authActionFilter}&limit=200`);
      const data = await res.json();
      if (res.ok) setAuthEvents(data.logs || []);
    } catch (e) {
      console.error('Error loading auth events', e);
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') { setDarkMode(true); document.documentElement.classList.add('dark'); }
    fetchLogs();
    fetchAuthEvents();
  }, []);

  useEffect(() => {
    if (activeTab === 'auth') fetchAuthEvents();
  }, [authActionFilter]);

  // ── CSV export for Audit Logs ───────────────────────────────────────────────
  const handleExportCSV = () => {
    if (logs.length === 0) return;
    const headers = ['Log ID', 'User Email', 'Action', 'Target Type', 'Target ID', 'Timestamp', 'IP Address', 'User Agent'];
    const rows = logs.map(l => [
      l.id, l.userEmail, l.action, l.targetType, l.targetId || '',
      l.timestamp, l.ipAddress || '', `"${(l.userAgent || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `DS_Audit_Logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ── CSV export for Auth Events ──────────────────────────────────────────────
  const handleExportAuthCSV = () => {
    if (authEvents.length === 0) return;
    const headers = ['Event ID', 'Action', 'User Email', 'User ID', 'IP Address', 'User Agent', 'Detail', 'Timestamp'];
    const rows = authEvents.map(e => [
      e.id, e.action, e.userEmail || '', e.userId || '', e.ip || '',
      `"${(e.userAgent || '').replace(/"/g, '""')}"`, `"${(e.detail || '').replace(/"/g, '""')}"`, e.timestamp
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `DS_Auth_Events_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredLogs = logs.filter(l => {
    if (!logSearchQuery) return true;
    const query = logSearchQuery.toLowerCase();
    return (
      l.action.toLowerCase().includes(query) ||
      l.userEmail.toLowerCase().includes(query) ||
      l.targetType.toLowerCase().includes(query) ||
      (l.targetId && l.targetId.toLowerCase().includes(query)) ||
      (l.ipAddress && l.ipAddress.toLowerCase().includes(query))
    );
  });

  const filteredAuthEvents = authEvents.filter(e => {
    if (!authSearch) return true;
    const q = authSearch.toLowerCase();
    return (
      (e.userEmail && e.userEmail.toLowerCase().includes(q)) ||
      (e.userId && e.userId.toLowerCase().includes(q)) ||
      e.action.toLowerCase().includes(q) ||
      (e.ip && e.ip.toLowerCase().includes(q)) ||
      (e.detail && e.detail.toLowerCase().includes(q))
    );
  });

  const renderJSON = (data: any) => {
    if (!data) return <span className="text-slate-400 dark:text-slate-600 font-medium italic">Empty data</span>;
    return (
      <pre className="text-[11px] font-mono leading-relaxed bg-slate-950 text-slate-100 p-4 rounded-xl overflow-x-auto max-h-[300px] border border-slate-800">
        {JSON.stringify(data, null, 2)}
      </pre>
    );
  };

  return (
    <>
      <Head>
        <title>System Audit Logs — Admin Panel</title>
      </Head>

      <div className="min-h-screen flex" style={{ background: 'var(--color-bg)' }}>
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} darkMode={darkMode} />

        <div className="flex-1 flex flex-col min-h-screen transition-all duration-300"
          style={{ marginLeft: sidebarCollapsed ? 72 : 260 }}>
          <Header title="Audit Trail" darkMode={darkMode} onToggleDark={toggleDark} sidebarCollapsed={sidebarCollapsed} />

          <main className="flex-1 p-6 pt-[88px] space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="page-title flex items-center gap-2">
                  <Terminal className="w-6 h-6 text-brand-600 dark:text-violet-400" />
                  Compliance & Audit Trail
                </h1>
                <p className="page-subtitle">System changes, session events, and security audit records</p>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 rounded-2xl w-fit" style={{ background: 'var(--color-card)' }}>
              <button
                onClick={() => setActiveTab('audit')}
                className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold transition-all duration-200 ${activeTab === 'audit' ? 'bg-brand-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
              >
                <Cpu className="w-4 h-4" />
                System Audit Logs
              </button>
              <button
                onClick={() => setActiveTab('auth')}
                className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold transition-all duration-200 ${activeTab === 'auth' ? 'bg-brand-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
              >
                <ShieldAlert className="w-4 h-4" />
                Auth Events
                {authEvents.filter(e => e.action === 'ACCOUNT_LOCKED' || e.action === 'LOGIN_FAILED').length > 0 && (
                  <span className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-black">
                    {Math.min(99, authEvents.filter(e => e.action === 'ACCOUNT_LOCKED' || e.action === 'LOGIN_FAILED').length)}
                  </span>
                )}
              </button>
            </div>

            {/* ── AUDIT LOGS TAB ── */}
            {activeTab === 'audit' && (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="relative flex-1 md:max-w-80">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Filter logs (Action, email, ID)..."
                      value={logSearchQuery}
                      onChange={e => setLogSearchQuery(e.target.value)}
                      className="input pl-9"
                    />
                  </div>
                  <div className="flex items-center gap-2 ml-auto">
                    <button onClick={handleExportCSV} disabled={logs.length === 0} className="btn btn-secondary btn-sm">
                      <Download className="w-4 h-4 text-emerald-500" /> Export CSV
                    </button>
                    <button onClick={fetchLogs} className="btn btn-ghost btn-sm">
                      <RefreshCw className={`w-4 h-4 ${logsLoading ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>

                <div className="premium-card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Timestamp / ID</th>
                          <th>User Initiator</th>
                          <th>Action Performed</th>
                          <th>Target Object</th>
                          <th>Network Host (IP)</th>
                          <th className="text-center">Inspect Data</th>
                        </tr>
                      </thead>
                      <tbody>
                        {logsLoading ? (
                          <tr>
                            <td colSpan={6} className="py-12 text-center text-slate-400">
                              <div className="flex items-center justify-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
                                <span>Querying compliance ledger...</span>
                              </div>
                            </td>
                          </tr>
                        ) : filteredLogs.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-12 text-center text-slate-400">No system audit logs found.</td>
                          </tr>
                        ) : (
                          filteredLogs.map(log => (
                            <tr key={log.id}>
                              <td>
                                <span className="font-bold text-slate-800 dark:text-slate-200 block">{log.timestamp.replace('T', ' ')}</span>
                                <span className="text-[10px] text-slate-450 font-bold uppercase">{log.id}</span>
                              </td>
                              <td>
                                <p className="text-slate-800 dark:text-slate-200 font-bold">{log.userEmail}</p>
                                <p className="text-[10px] text-slate-400 font-semibold uppercase">{log.userId || 'System Engine'}</p>
                              </td>
                              <td><span className="badge badge-violet uppercase">{log.action}</span></td>
                              <td className="text-slate-600 dark:text-slate-350">
                                <p className="font-bold">{log.targetType}</p>
                                <p className="text-xs text-slate-400 font-mono">{log.targetId || 'N/A'}</p>
                              </td>
                              <td className="font-semibold text-slate-500">{log.ipAddress || 'Internal Loopback'}</td>
                              <td className="text-center">
                                <button onClick={() => setSelectedLog(log)} className="btn btn-ghost btn-sm">
                                  <Eye className="w-4 h-4 text-brand-600" /> Inspect
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {/* ── AUTH EVENTS TAB ── */}
            {activeTab === 'auth' && (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="relative flex-1 md:max-w-80">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Filter by email, IP, action..."
                      value={authSearch}
                      onChange={e => setAuthSearch(e.target.value)}
                      className="input pl-9"
                    />
                  </div>
                  <select
                    value={authActionFilter}
                    onChange={e => setAuthActionFilter(e.target.value)}
                    className="select text-sm w-auto"
                  >
                    <option value="ALL">All Actions</option>
                    <option value="LOGIN_SUCCESS">Login Success</option>
                    <option value="LOGIN_FAILED">Login Failed</option>
                    <option value="ACCOUNT_LOCKED">Account Locked</option>
                    <option value="LOGOUT">Logout</option>
                    <option value="IDLE_LOGOUT">Idle Logout</option>
                    <option value="PASSWORD_RESET_REQUEST">Password Reset Req.</option>
                    <option value="PASSWORD_RESET_COMPLETE">Password Reset Done</option>
                  </select>
                  <div className="flex items-center gap-2 ml-auto">
                    <button onClick={handleExportAuthCSV} disabled={authEvents.length === 0} className="btn btn-secondary btn-sm">
                      <Download className="w-4 h-4 text-emerald-500" /> Export CSV
                    </button>
                    <button onClick={fetchAuthEvents} className="btn btn-ghost btn-sm">
                      <RefreshCw className={`w-4 h-4 ${authLoading ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Summary stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Successful Logins', action: 'LOGIN_SUCCESS', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/20' },
                    { label: 'Failed Attempts', action: 'LOGIN_FAILED', color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-950/20' },
                    { label: 'Lockout Events', action: 'ACCOUNT_LOCKED', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/20' },
                    { label: 'Logout Events', action: 'LOGOUT', color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-50 dark:bg-slate-800/30' },
                  ].map(s => (
                    <div
                      key={s.action}
                      className={`premium-card p-4 cursor-pointer transition-all hover:ring-2 ring-brand-400 ${s.bg}`}
                      onClick={() => setAuthActionFilter(authActionFilter === s.action ? 'ALL' : s.action)}
                    >
                      <p className={`text-2xl font-extrabold ${s.color}`}>
                        {authEvents.filter(e => e.action === s.action).length}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5 font-semibold">{s.label}</p>
                    </div>
                  ))}
                </div>

                <div className="premium-card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Timestamp</th>
                          <th>Action</th>
                          <th>User</th>
                          <th>IP Address</th>
                          <th>Detail</th>
                        </tr>
                      </thead>
                      <tbody>
                        {authLoading ? (
                          <tr>
                            <td colSpan={5} className="py-12 text-center text-slate-400">
                              <div className="flex items-center justify-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
                                <span>Loading auth events...</span>
                              </div>
                            </td>
                          </tr>
                        ) : filteredAuthEvents.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-12 text-center text-slate-400">No auth events found.</td>
                          </tr>
                        ) : (
                          filteredAuthEvents.map(evt => {
                            const meta = AUTH_ACTION_META[evt.action] || { label: evt.action, badge: 'badge-slate', icon: ShieldAlert };
                            const Icon = meta.icon;
                            return (
                              <tr key={evt.id}>
                                <td>
                                  <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">
                                    {evt.timestamp.replace('T', ' ').slice(0, 19)}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-mono">{evt.id}</span>
                                </td>
                                <td>
                                  <span className={`badge ${meta.badge} flex items-center gap-1 w-fit`}>
                                    <Icon className="w-3 h-3" />
                                    {meta.label}
                                  </span>
                                </td>
                                <td>
                                  <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                                    {evt.userEmail || '—'}
                                  </p>
                                  <p className="text-[10px] text-slate-400 font-mono">{evt.userId || 'unknown'}</p>
                                </td>
                                <td className="font-mono text-xs text-slate-500">
                                  {evt.ip || '—'}
                                </td>
                                <td className="text-xs text-slate-500 max-w-[200px] truncate" title={evt.detail || ''}>
                                  {evt.detail || '—'}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </main>
        </div>
      </div>

      {/* Inspect JSON Details Modal (audit logs tab) */}
      {selectedLog && (
        <div className="modal-backdrop" onClick={() => setSelectedLog(null)}>
          <div className="modal-content max-w-4xl" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 mb-4">
                <div>
                  <h3 className="font-extrabold text-lg text-slate-800 dark:text-slate-100">Audit payload inspection — {selectedLog.id}</h3>
                  <p className="text-xs text-slate-450 font-semibold uppercase">{selectedLog.action} (Target: {selectedLog.targetType} #{selectedLog.targetId || 'N/A'})</p>
                </div>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="space-y-6 overflow-y-auto pr-2 max-h-[60vh]">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-medium bg-slate-50 dark:bg-slate-800/20 border border-slate-200/50 dark:border-slate-800/50 p-4 rounded-2xl">
                  <div><span className="text-slate-400 font-bold block uppercase mb-0.5">Executor</span><span className="font-bold text-slate-800 dark:text-slate-200">{selectedLog.userEmail}</span></div>
                  <div><span className="text-slate-400 font-bold block uppercase mb-0.5">Timestamp</span><span className="font-bold text-slate-800 dark:text-slate-200">{selectedLog.timestamp.replace('T', ' ')}</span></div>
                  <div><span className="text-slate-400 font-bold block uppercase mb-0.5">Remote IP Host</span><span className="font-bold text-slate-800 dark:text-slate-200">{selectedLog.ipAddress || '127.0.0.1'}</span></div>
                  <div><span className="text-slate-400 font-bold block uppercase mb-0.5">Platform User-Agent</span><span className="font-bold text-slate-800 dark:text-slate-200 truncate block" title={selectedLog.userAgent || ''}>{selectedLog.userAgent || 'Unknown Agent'}</span></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider block">Old State Data (Before change)</span>
                    {renderJSON(selectedLog.oldData)}
                  </div>
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider block">New State Data (After change)</span>
                    {renderJSON(selectedLog.newData)}
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200 dark:border-slate-800 pt-4 mt-4 flex justify-end">
                <button onClick={() => setSelectedLog(null)} className="btn btn-primary">Close Inspector</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
