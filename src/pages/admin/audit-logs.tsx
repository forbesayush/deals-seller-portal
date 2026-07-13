import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useAuth } from '@/hooks/useAuth';
import { 
  Search, ArrowLeft, RefreshCw, Sun, Moon, LogOut, Loader2,
  FileText, Calendar, Terminal, ShieldAlert, Cpu, Download, Eye, XCircle
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
  oldData: any | null; // parsed JSON or object
  newData: any | null; // parsed JSON or object
}

export default function AuditLogs() {
  const { user, logout } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Detail Modal
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

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
    fetchLogs();
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

  const handleExportCSV = () => {
    if (logs.length === 0) return;
    
    // Construct CSV content
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

  // Render raw JSON comparisons
  const renderJSON = (data: any) => {
    if (!data) return <span className="text-slate-400 dark:text-slate-600 font-medium italic">Empty data</span>;
    return (
      <pre className="text-[11px] font-mono leading-relaxed bg-slate-900 text-slate-100 p-4 rounded-xl overflow-x-auto max-h-[300px] border border-slate-800">
        {JSON.stringify(data, null, 2)}
      </pre>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 font-sans">
      <Head>
        <title>System Audit Logs - deals.seller MIS</title>
      </Head>

      {/* Navigation Header */}
      <header className="glass-panel sticky top-0 z-40 border-b border-slate-200/50 dark:border-slate-800/50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a href="/admin/dashboard" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </a>
          <div>
            <h1 className="font-extrabold text-lg tracking-tight">System Audit Logs</h1>
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
        
        {/* Banner Alert description */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 p-6 rounded-3xl shadow-sm">
          <div className="space-y-1">
            <h3 className="font-extrabold text-lg flex items-center gap-2">
              <Terminal className="w-5 h-5 text-brand-500" />
              <span>Compliance & Action Tracking Trail</span>
            </h3>
            <p className="text-xs text-slate-400 font-semibold max-w-xl">
              This module documents system changes, credential hashes updates, wallet credits, order cancels, and freezes. All activities log the originating IP and HTTP user agent context.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              disabled={logs.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 rounded-xl font-bold text-sm shadow-sm transition-all"
            >
              <Download className="w-4 h-4 text-emerald-500" />
              <span>Export CSV Logs</span>
            </button>
            <button
              onClick={fetchLogs}
              className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all shadow-sm"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filter logs (Action, email, ID)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm px-9 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all shadow-sm"
          />
        </div>

        {/* Data Table */}
        <div className="glass-panel rounded-3xl overflow-hidden border border-slate-200/50 dark:border-slate-800/50 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/50 dark:bg-slate-900/30 text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-wider border-b border-slate-200/50 dark:border-slate-800/50">
                  <th className="py-4 px-6">Timestamp / ID</th>
                  <th className="py-4 px-6">User Initiator</th>
                  <th className="py-4 px-6">Action Performed</th>
                  <th className="py-4 px-6">Target Object</th>
                  <th className="py-4 px-6">Network Host (IP)</th>
                  <th className="py-4 px-6 text-center">Inspect Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/50 dark:divide-slate-800/50 text-sm font-medium">
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
                    <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors">
                      <td className="py-4 px-6">
                        <span className="font-bold text-slate-800 dark:text-slate-200 block">{log.timestamp.replace('T', ' ')}</span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase">{log.id}</span>
                      </td>
                      <td className="py-4 px-6">
                        <p className="text-slate-800 dark:text-slate-200 font-bold">{log.userEmail}</p>
                        <p className="text-[10px] text-slate-400 font-semibold uppercase">{log.userId || 'System Engine'}</p>
                      </td>
                      <td className="py-4 px-6">
                        <span className="px-2.5 py-1 text-xs font-bold bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 rounded-md border border-indigo-100 dark:border-indigo-900/30 uppercase">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-slate-600 dark:text-slate-350">
                        <p className="font-bold">{log.targetType}</p>
                        <p className="text-xs text-slate-400 font-mono">{log.targetId || 'N/A'}</p>
                      </td>
                      <td className="py-4 px-6 font-semibold text-slate-500">
                        {log.ipAddress || 'Internal Loopback'}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-brand-500 rounded-lg transition-colors inline-flex items-center gap-1.5 text-xs font-bold"
                        >
                          <Eye className="w-4 h-4" />
                          <span>Inspect</span>
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

      {/* Inspect JSON Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-glass border border-slate-200/50 dark:border-slate-800/50 max-h-[85vh] flex flex-col justify-between overflow-hidden">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 mb-4 flex-shrink-0">
              <div className="space-y-1">
                <h3 className="font-extrabold text-lg text-slate-800 dark:text-slate-100">Audit payload inspection — {selectedLog.id}</h3>
                <p className="text-xs text-slate-400 font-semibold uppercase">{selectedLog.action} (Target: {selectedLog.targetType} #{selectedLog.targetId || 'N/A'})</p>
              </div>
              <button 
                onClick={() => setSelectedLog(null)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                <XCircle className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-6 overflow-y-auto pr-2 flex-grow">
              
              {/* Context Panel */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-medium bg-slate-50 dark:bg-slate-800/20 border border-slate-200/50 dark:border-slate-800/50 p-4 rounded-2xl">
                <div>
                  <span className="text-slate-400 font-bold block uppercase mb-0.5">Executor</span>
                  <span className="font-bold text-slate-800 dark:text-slate-250">{selectedLog.userEmail}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block uppercase mb-0.5">Timestamp</span>
                  <span className="font-bold text-slate-800 dark:text-slate-250">{selectedLog.timestamp.replace('T', ' ')}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block uppercase mb-0.5">Remote IP Host</span>
                  <span className="font-bold text-slate-850 dark:text-slate-250">{selectedLog.ipAddress || '127.0.0.1'}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block uppercase mb-0.5">Platform User-Agent</span>
                  <span className="font-bold text-slate-800 dark:text-slate-250 truncate block" title={selectedLog.userAgent || ''}>
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
            <div className="border-t border-slate-200 dark:border-slate-800 pt-4 mt-4 flex justify-end flex-shrink-0">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold text-sm transition-all"
              >
                Close Inspector
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
