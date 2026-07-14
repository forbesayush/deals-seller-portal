import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useAuth } from '@/hooks/useAuth';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import {
  Search, RefreshCw, FileText, Calendar, Terminal, ShieldAlert,
  Cpu, Download, Eye, X, Loader2
} from 'lucide-react';

interface AuditLog {
  id: string;
  userId: string | null;
  userEmail: string;
  action: string;
  targetType: string;
  targetId: string | null;
  timestamp: string; // ISO format
  ipAddress: string | null;
  userAgent: string | null;
  oldData: any | null;
  newData: any | null;
}

export default function AuditLogs() {
  const { user } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Detail Modal
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const toggleDark = () => {
    const isDark = !darkMode;
    setDarkMode(isDark);
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/audit-logs');
      const data = await res.json();
      if (res.ok) {
        setLogs(data);
      }
    } catch (e) {
      console.error("Error loading audit logs", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') { setDarkMode(true); document.documentElement.classList.add('dark'); }
    fetchLogs();
  }, []);

  const handleExportCSV = () => {
    if (logs.length === 0) return;

    const headers = ['Log ID', 'User Email', 'Action', 'Target Type', 'Target ID', 'Timestamp', 'IP Address', 'User Agent'];
    const rows = logs.map(l => [
      l.id,
      l.userEmail,
      l.action,
      l.targetType,
      l.targetId || '',
      l.timestamp,
      l.ipAddress || '',
      `"${(l.userAgent || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8,"
      + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `DS_Audit_Logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredLogs = logs.filter(l => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      l.action.toLowerCase().includes(query) ||
      l.userEmail.toLowerCase().includes(query) ||
      l.targetType.toLowerCase().includes(query) ||
      (l.targetId && l.targetId.toLowerCase().includes(query)) ||
      (l.ipAddress && l.ipAddress.toLowerCase().includes(query))
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
            {/* Header / Actions Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="page-title flex items-center gap-2">
                  <Terminal className="w-6 h-6 text-brand-600 dark:text-violet-400" />
                  Compliance & Audit Trail
                </h1>
                <p className="page-subtitle">Document system changes, payout logs, and user access records</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportCSV}
                  disabled={logs.length === 0}
                  className="btn btn-secondary btn-sm"
                >
                  <Download className="w-4 h-4 text-emerald-500" /> Export CSV Logs
                </button>
                <button onClick={fetchLogs} className="btn btn-ghost btn-sm">
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Search Filter */}
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter logs (Action, email, ID)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-9"
              />
            </div>

            {/* Data Table */}
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
                    {loading ? (
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
                        <td colSpan={6} className="py-12 text-center text-slate-400">
                          No system audit logs found.
                        </td>
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
                          <td>
                            <span className="badge badge-violet uppercase">
                              {log.action}
                            </span>
                          </td>
                          <td className="text-slate-600 dark:text-slate-350">
                            <p className="font-bold">{log.targetType}</p>
                            <p className="text-xs text-slate-400 font-mono">{log.targetId || 'N/A'}</p>
                          </td>
                          <td className="font-semibold text-slate-500">
                            {log.ipAddress || 'Internal Loopback'}
                          </td>
                          <td className="text-center">
                            <button
                              onClick={() => setSelectedLog(log)}
                              className="btn btn-ghost btn-sm"
                            >
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
          </main>
        </div>
      </div>

      {/* Inspect JSON Details Modal */}
      {selectedLog && (
        <div className="modal-backdrop" onClick={() => setSelectedLog(null)}>
          <div className="modal-content max-w-4xl" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              {/* Modal Header */}
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

              {/* Modal Body */}
              <div className="space-y-6 overflow-y-auto pr-2 max-h-[60vh]">
                {/* Context Panel */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-medium bg-slate-50 dark:bg-slate-800/20 border border-slate-200/50 dark:border-slate-800/50 p-4 rounded-2xl">
                  <div>
                    <span className="text-slate-400 font-bold block uppercase mb-0.5">Executor</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{selectedLog.userEmail}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block uppercase mb-0.5">Timestamp</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{selectedLog.timestamp.replace('T', ' ')}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block uppercase mb-0.5">Remote IP Host</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{selectedLog.ipAddress || '127.0.0.1'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block uppercase mb-0.5">Platform User-Agent</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 truncate block" title={selectedLog.userAgent || ''}>
                      {selectedLog.userAgent || 'Unknown Agent'}
                    </span>
                  </div>
                </div>

                {/* Old Data vs New Data Side by Side Comparison */}
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

              {/* Modal Footer */}
              <div className="border-t border-slate-200 dark:border-slate-800 pt-4 mt-4 flex justify-end">
                <button
                  onClick={() => setSelectedLog(null)}
                  className="btn btn-primary"
                >
                  Close Inspector
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
