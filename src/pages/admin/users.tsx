import React, { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import { useAuth } from '@/hooks/useAuth';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import {
  Users, Search, RefreshCw, Plus, Edit3, Shield, UserX,
  UserCheck, Eye, Key, ChevronRight, Loader2, X, Check,
  AlertTriangle, Download, Filter
} from 'lucide-react';

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = { active: 'badge-emerald', suspended: 'badge-rose', pending: 'badge-amber' };
  return <span className={`badge ${map[status] || 'badge-slate'} text-[10px] capitalize`}>{status}</span>;
}

function RoleBadge({ role }: { role: string }) {
  const map: Record<string, string> = {
    super_admin: 'badge-violet', admin: 'badge-blue', manager: 'badge-amber',
    auditor: 'badge-slate', buyer: 'badge-emerald',
  };
  return <span className={`badge ${map[role] || 'badge-slate'} text-[10px] capitalize`}>{role.replace('_', ' ')}</span>;
}

const ROLES = ['All', 'super_admin', 'admin', 'manager', 'auditor', 'buyer'];
const STATUSES = ['All', 'active', 'suspended', 'pending'];

export default function AdminUsers() {
  const { user } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  const [editUser, setEditUser] = useState<any | null>(null);
  const [editRole, setEditRole] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createMobile, setCreateMobile] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createRole, setCreateRole] = useState('buyer');
  const [createLoading, setCreateLoading] = useState(false);
  const [createMsg, setCreateMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [impersonateLoading, setImpersonateLoading] = useState<string | null>(null);

  const toggleDark = () => {
    const isDark = !darkMode;
    setDarkMode(isDark);
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/api/users/all?`;
      if (searchQuery) url += `q=${encodeURIComponent(searchQuery)}&`;
      if (roleFilter !== 'All') url += `role=${encodeURIComponent(roleFilter)}&`;
      if (statusFilter !== 'All') url += `status_filter=${encodeURIComponent(statusFilter)}&`;
      const res = await fetch(url);
      if (res.ok) setUsers(await res.json());
    } catch { /* silent */ } finally { setLoading(false); }
  }, [searchQuery, roleFilter, statusFilter]);

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') { setDarkMode(true); document.documentElement.classList.add('dark'); }
    fetchUsers();
  }, [fetchUsers]);

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    setEditLoading(true);
    try {
      const res = await fetch(`/api/users/${editUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: editRole, status: editStatus }),
      });
      if (res.ok) { setEditUser(null); fetchUsers(); }
    } catch { /* silent */ } finally { setEditLoading(false); }
  };

  const handleSuspend = async (u: any) => {
    await fetch(`/api/users/${u.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: u.status === 'suspended' ? 'active' : 'suspended' }),
    });
    fetchUsers();
  };

  const handleImpersonate = async (u: any) => {
    setImpersonateLoading(u.id);
    try {
      const res = await fetch(`/api/admin/impersonate/${u.id}`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.impersonationToken) {
        // Store the token and redirect
        document.cookie = `token=${data.impersonationToken}; path=/; samesite=lax`;
        window.location.href = data.targetUser.role === 'buyer' ? '/buyer/dashboard' : '/admin/dashboard';
      }
    } catch { /* silent */ } finally { setImpersonateLoading(null); }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateMsg(null);
    try {
      const res = await fetch(`/api/users?role=${createRole}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: createName, email: createEmail, mobile: createMobile, password: createPassword, referral: '' }),
      });
      const data = await res.json();
      if (res.ok) {
        setCreateMsg({ type: 'success', text: `User "${createName}" created!` });
        setCreateName(''); setCreateEmail(''); setCreateMobile(''); setCreatePassword('');
        fetchUsers();
      } else {
        setCreateMsg({ type: 'error', text: data.detail || 'Failed' });
      }
    } catch { setCreateMsg({ type: 'error', text: 'Network error' }); }
    finally { setCreateLoading(false); }
  };

  const roleCounts = ROLES.slice(1).reduce((acc, r) => ({
    ...acc, [r]: users.filter(u => u.role === r).length
  }), {} as Record<string, number>);

  return (
    <>
      <Head>
        <title>User Management — Admin Portal</title>
      </Head>

      <div className="min-h-screen flex" style={{ background: 'var(--color-bg)' }}>
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} darkMode={darkMode} />

        <div className="flex-1 flex flex-col min-h-screen transition-all duration-300"
          style={{ marginLeft: sidebarCollapsed ? 72 : 260 }}>
          <Header title="Users" darkMode={darkMode} onToggleDark={toggleDark} sidebarCollapsed={sidebarCollapsed} />

          <main className="flex-1 p-6 pt-[88px]">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h1 className="page-title">User Management</h1>
                <p className="page-subtitle">{users.length} total users</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={fetchUsers} className="btn btn-ghost btn-sm"><RefreshCw className="w-4 h-4" /></button>
                <button onClick={() => window.open('/api/reports/export?type=users&format=csv')} className="btn btn-ghost btn-sm">
                  <Download className="w-4 h-4" />
                </button>
                <button onClick={() => setShowCreate(true)} className="btn btn-primary btn-sm">
                  <Plus className="w-4 h-4" /> New User
                </button>
              </div>
            </div>

            {/* Stats Strip */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-5">
              {ROLES.slice(1).map(r => (
                <div key={r} className="premium-card p-3 text-center cursor-pointer hover:ring-2 ring-brand-400 transition-all" onClick={() => setRoleFilter(r === roleFilter ? 'All' : r)}>
                  <p className="text-xl font-extrabold">{roleCounts[r] || 0}</p>
                  <p className="text-[10px] text-slate-400 capitalize mt-0.5">{r.replace('_', ' ')}</p>
                </div>
              ))}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3 mb-5">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text" placeholder="Search by name, email, mobile, ID..."
                  value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  className="input pl-9"
                />
              </div>
              <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="select text-sm w-auto">
                {ROLES.map(r => <option key={r} value={r}>{r === 'All' ? 'All Roles' : r.replace('_', ' ')}</option>)}
              </select>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="select text-sm w-auto">
                {STATUSES.map(s => <option key={s} value={s}>{s === 'All' ? 'All Status' : s}</option>)}
              </select>
            </div>

            {/* Users Table */}
            <div className="premium-card overflow-hidden">
              {loading ? (
                <div className="p-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-14 rounded-xl" />)}</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Contact</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Joined</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.length === 0 ? (
                        <tr><td colSpan={6} className="text-center py-10 text-slate-400">No users found</td></tr>
                      ) : users.map(u => (
                        <tr key={u.id}>
                          <td>
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-500 to-indigo-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                {u.name?.charAt(0)?.toUpperCase()}
                              </div>
                              <div>
                                <p className="font-semibold text-sm">{u.name}</p>
                                <p className="text-[10px] text-slate-400">{u.id}</p>
                              </div>
                            </div>
                          </td>
                          <td>
                            <p className="text-xs">{u.email}</p>
                            <p className="text-[10px] text-slate-400">{u.mobile || 'No mobile'}</p>
                          </td>
                          <td><RoleBadge role={u.role} /></td>
                          <td><StatusBadge status={u.status} /></td>
                          <td className="text-xs text-slate-400">{u.joined}</td>
                          <td>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => { setEditUser(u); setEditRole(u.role); setEditStatus(u.status); }}
                                className="btn btn-ghost btn-sm px-2" title="Edit User"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleSuspend(u)}
                                className={`btn btn-ghost btn-sm px-2 ${u.status === 'suspended' ? 'text-emerald-500' : 'text-rose-500'}`}
                                title={u.status === 'suspended' ? 'Reactivate' : 'Suspend'}
                              >
                                {u.status === 'suspended' ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                onClick={() => handleImpersonate(u)}
                                disabled={impersonateLoading === u.id}
                                className="btn btn-ghost btn-sm px-2 text-amber-500" title="Impersonate"
                              >
                                {impersonateLoading === u.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* Edit User Modal */}
      {editUser && (
        <div className="modal-backdrop" onClick={() => setEditUser(null)}>
          <div className="modal-content max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <h3 className="font-extrabold text-lg mb-1">Edit User</h3>
              <p className="text-sm text-slate-400 mb-4">{editUser.name} · {editUser.email}</p>
              <form onSubmit={handleUpdateUser} className="space-y-4">
                <div>
                  <label className="section-label">Role</label>
                  <select value={editRole} onChange={e => setEditRole(e.target.value)} className="select">
                    {ROLES.slice(1).map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="section-label">Status</label>
                  <select value={editStatus} onChange={e => setEditStatus(e.target.value)} className="select">
                    {STATUSES.slice(1).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="flex gap-2">
                  <button type="submit" disabled={editLoading} className="btn btn-primary flex-1">
                    {editLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><Check className="w-4 h-4" /> Save</>}
                  </button>
                  <button type="button" onClick={() => setEditUser(null)} className="btn btn-ghost">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreate && (
        <div className="modal-backdrop" onClick={() => setShowCreate(false)}>
          <div className="modal-content max-w-md" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-extrabold text-xl">Create New User</h3>
                <button onClick={() => setShowCreate(false)}><X className="w-4 h-4 text-slate-400" /></button>
              </div>
              {createMsg && (
                <div className={`p-3 rounded-xl text-sm mb-4 ${createMsg.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600' : 'bg-rose-50 dark:bg-rose-950/30 text-rose-600'}`}>
                  {createMsg.text}
                </div>
              )}
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                  <label className="section-label">Full Name *</label>
                  <input value={createName} onChange={e => setCreateName(e.target.value)} className="input" required placeholder="Full name" />
                </div>
                <div>
                  <label className="section-label">Email *</label>
                  <input type="email" value={createEmail} onChange={e => setCreateEmail(e.target.value)} className="input" required placeholder="email@example.com" />
                </div>
                <div>
                  <label className="section-label">Mobile</label>
                  <input value={createMobile} onChange={e => setCreateMobile(e.target.value)} className="input" placeholder="9876543210" />
                </div>
                <div>
                  <label className="section-label">Password *</label>
                  <input type="password" value={createPassword} onChange={e => setCreatePassword(e.target.value)} className="input" required placeholder="Min 8 chars" />
                </div>
                <div>
                  <label className="section-label">Role</label>
                  <select value={createRole} onChange={e => setCreateRole(e.target.value)} className="select">
                    {ROLES.slice(1).map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
                  </select>
                </div>
                <div className="flex gap-2">
                  <button type="submit" disabled={createLoading} className="btn btn-primary flex-1">
                    {createLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : <><Plus className="w-4 h-4" /> Create User</>}
                  </button>
                  <button type="button" onClick={() => setShowCreate(false)} className="btn btn-ghost">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
