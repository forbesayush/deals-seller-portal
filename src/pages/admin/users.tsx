import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useAuth } from '@/hooks/useAuth';
import { 
  Search, ArrowLeft, RefreshCw, Sun, Moon, LogOut, Loader2,
  UserCheck, UserX, Shield, ShieldAlert, Key, Download, Check, XCircle
} from 'lucide-react';

interface Buyer {
  id: string;
  name: string;
  email: string;
  mobile: string | null;
  role: string;
  status: string; // active, suspended, deactivated
  joined: string; // YYYY-MM-DD
  verified: boolean;
  referral: string;
}

export default function UserManager() {
  const { user, logout } = useAuth();
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals & Reset Form
  const [editingPasswordUser, setEditingPasswordUser] = useState<Buyer | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);
  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (res.ok) {
        setBuyers(data);
      }
    } catch (e) {
      console.error("Error loading users", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
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

  const handleUpdateUser = async (userId: string, updates: Partial<Buyer> & { password?: string }) => {
    setActionLoading(userId);
    setAlertMsg(null);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (res.ok) {
        setAlertMsg({ type: 'success', text: `User account updated successfully.` });
        fetchUsers();
      } else {
        setAlertMsg({ type: 'error', text: data.detail || 'Failed to update user account.' });
      }
    } catch (e) {
      setAlertMsg({ type: 'error', text: 'Network error updating user.' });
    } finally {
      setActionLoading(null);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPasswordUser || !newPassword) return;
    setPwdLoading(true);
    setAlertMsg(null);
    
    try {
      const res = await fetch(`/api/users/${editingPasswordUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setAlertMsg({ type: 'success', text: `Password reset successfully for ${editingPasswordUser.name}.` });
        setEditingPasswordUser(null);
        setNewPassword('');
      } else {
        setAlertMsg({ type: 'error', text: data.detail || 'Failed to reset password.' });
      }
    } catch (e) {
      setAlertMsg({ type: 'error', text: 'Network error resetting password.' });
    } finally {
      setPwdLoading(false);
    }
  };

  const handleExport = () => {
    window.open('/api/reports/export?type=users&format=csv', '_blank');
  };

  const filteredBuyers = buyers.filter(b => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      b.name.toLowerCase().includes(query) ||
      b.email.toLowerCase().includes(query) ||
      b.id.toLowerCase().includes(query) ||
      (b.mobile && b.mobile.toLowerCase().includes(query))
    );
  });

  const activeCount = buyers.filter(b => b.status === 'active').length;
  const suspendedCount = buyers.filter(b => b.status === 'suspended').length;
  const verifiedCount = buyers.filter(b => b.verified).length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 font-sans">
      <Head>
        <title>Buyer Accounts - deals.seller MIS</title>
      </Head>

      {/* Navigation Header */}
      <header className="glass-panel sticky top-0 z-40 border-b border-slate-200/50 dark:border-slate-800/50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a href="/admin/dashboard" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </a>
          <div>
            <h1 className="font-extrabold text-lg tracking-tight">Buyer Accounts</h1>
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
        
        {/* Simple Aggregate Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="glass-card rounded-2xl p-5 border border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between shadow-sm">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Buyers</p>
              <p className="text-3xl font-black mt-1 text-slate-800 dark:text-slate-100">{loading ? '...' : activeCount}</p>
            </div>
            <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500 rounded-xl flex items-center justify-center text-lg font-bold">👥</div>
          </div>

          <div className="glass-card rounded-2xl p-5 border border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between shadow-sm">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Suspended Accounts</p>
              <p className="text-3xl font-black mt-1 text-rose-500">{loading ? '...' : suspendedCount}</p>
            </div>
            <div className="w-10 h-10 bg-rose-50 dark:bg-rose-950/30 text-rose-500 rounded-xl flex items-center justify-center text-lg font-bold">⚠️</div>
          </div>

          <div className="glass-card rounded-2xl p-5 border border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between shadow-sm">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Verified Buyers</p>
              <p className="text-3xl font-black mt-1 text-indigo-500">{loading ? '...' : verifiedCount}</p>
            </div>
            <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-500 rounded-xl flex items-center justify-center text-lg font-bold">✓</div>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, email, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm px-9 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all shadow-sm"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-bold text-sm shadow-sm transition-all"
            >
              <Download className="w-4 h-4 text-emerald-500" />
              <span>Export Users CSV</span>
            </button>
            <button
              onClick={fetchUsers}
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

        {/* Data Table */}
        <div className="glass-panel rounded-3xl overflow-hidden border border-slate-200/50 dark:border-slate-800/50 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/50 dark:bg-slate-900/30 text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-wider border-b border-slate-200/50 dark:border-slate-800/50">
                  <th className="py-4 px-6">Buyer ID / Name</th>
                  <th className="py-4 px-6">Email / Mobile</th>
                  <th className="py-4 px-6">Joined Date</th>
                  <th className="py-4 px-6">Referral</th>
                  <th className="py-4 px-6">Verification</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-center">Settings & Control</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/50 dark:divide-slate-800/50 text-sm font-medium">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
                        <span>Gathering buyer database records...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredBuyers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No buyers found.
                    </td>
                  </tr>
                ) : (
                  filteredBuyers.map(buyer => (
                    <tr key={buyer.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors">
                      <td className="py-4 px-6">
                        <p className="font-bold text-slate-800 dark:text-slate-100">{buyer.name}</p>
                        <span className="text-[10px] text-slate-400 font-bold uppercase">{buyer.id}</span>
                      </td>
                      <td className="py-4 px-6 text-slate-700 dark:text-slate-350">
                        <p>{buyer.email}</p>
                        <p className="text-xs text-slate-400 font-semibold">{buyer.mobile || 'No Phone Record'}</p>
                      </td>
                      <td className="py-4 px-6 text-slate-500">
                        {buyer.joined}
                      </td>
                      <td className="py-4 px-6 text-slate-400 italic font-bold">
                        {buyer.referral || 'Direct'}
                      </td>
                      <td className="py-4 px-6">
                        <button
                          onClick={() => handleUpdateUser(buyer.id, { verified: !buyer.verified })}
                          disabled={actionLoading === buyer.id}
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase border transition-all ${
                            buyer.verified
                              ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-950/20 dark:border-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                              : 'bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-800 text-slate-400 hover:text-slate-600'
                          }`}
                        >
                          {buyer.verified ? 'Verified' : 'Unverified'}
                        </button>
                      </td>
                      <td className="py-4 px-6">
                        {buyer.status === 'active' ? (
                          <span className="px-2 py-0.5 text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 dark:text-emerald-400 rounded-md border border-emerald-100 dark:border-emerald-950/30 uppercase">Active</span>
                        ) : (
                          <span className="px-2 py-0.5 text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/20 dark:text-rose-400 rounded-md border border-rose-100 dark:border-rose-950/30 uppercase">Suspended</span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-center gap-3">
                          {buyer.status === 'active' ? (
                            <button
                              onClick={() => handleUpdateUser(buyer.id, { status: 'suspended' })}
                              disabled={actionLoading === buyer.id}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/30 rounded-xl text-xs font-bold transition-colors"
                              title="Suspend Profile"
                            >
                              <UserX className="w-3.5 h-3.5" />
                              <span>Suspend</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUpdateUser(buyer.id, { status: 'active' })}
                              disabled={actionLoading === buyer.id}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded-xl text-xs font-bold transition-colors"
                              title="Activate Profile"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>Activate</span>
                            </button>
                          )}
                          <button
                            onClick={() => setEditingPasswordUser(buyer)}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-brand-500 rounded-lg transition-colors"
                            title="Reset Password"
                          >
                            <Key className="w-4 h-4" />
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

      {/* Password Reset Modal */}
      {editingPasswordUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-glass border border-slate-200/50 dark:border-slate-800/50">
            <h3 className="font-extrabold text-lg text-slate-800 dark:text-slate-100 mb-2">Reset Account Password</h3>
            <p className="text-xs text-slate-400 font-semibold mb-6">Resetting security credential keys for buyer: <strong>{editingPasswordUser.name}</strong> ({editingPasswordUser.email})</p>
            
            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">New Password Key</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter secure password (min 6 characters)"
                  className="w-full px-4 py-3 bg-white/70 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setEditingPasswordUser(null); setNewPassword(''); }}
                  className="px-4 py-2 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pwdLoading || newPassword.length < 6}
                  className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-650 text-white rounded-xl font-bold text-sm transition-all shadow-md shadow-brand-100 dark:shadow-none flex items-center justify-center gap-2"
                >
                  {pwdLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Update Password</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
