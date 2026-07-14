import React, { useState, useEffect, useRef } from 'react';
import { Bell, Search, Sun, Moon, ChevronDown, X, LogOut, User, Settings } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface HeaderProps {
  title?: string;
  darkMode: boolean;
  onToggleDark: () => void;
  sidebarCollapsed: boolean;
}

export function Header({ title, darkMode, onToggleDark, sidebarCollapsed }: HeaderProps) {
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications?unread_only=false');
      if (res.ok) setNotifications(await res.json());
    } catch { /* silent */ }
  };

  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    if (!q || q.length < 2) { setSearchResults(null); return; }
    setSearchLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (res.ok) setSearchResults(await res.json());
    } catch { /* silent */ } finally {
      setSearchLoading(false);
    }
  };

  const markAllRead = async () => {
    await fetch('/api/notifications/mark-all-read', { method: 'PATCH' });
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const sidebarWidth = sidebarCollapsed ? 72 : 260;
  const avatarColors: Record<string, string> = {
    violet: 'from-violet-600 to-indigo-600',
    emerald: 'from-emerald-500 to-teal-600',
    amber: 'from-amber-500 to-orange-600',
    rose: 'from-rose-500 to-pink-600',
    blue: 'from-blue-500 to-cyan-600',
  };
  const avatarGradient = avatarColors[user?.avatarColor || 'violet'] || avatarColors.violet;

  return (
    <header
      className="fixed top-0 right-0 z-20 glass-panel border-b flex items-center gap-4 px-6"
      style={{
        left: sidebarWidth,
        height: 64,
        borderColor: 'var(--color-border)',
        transition: 'left 0.3s cubic-bezier(0.4,0,0.2,1)',
      }}
    >
      {/* Title */}
      {title && (
        <div className="hidden md:block">
          <h1 className="text-lg font-extrabold tracking-tight">{title}</h1>
        </div>
      )}

      {/* Search — admin/staff only */}
      {user?.role !== 'buyer' && (
        <div className="flex-1 max-w-md relative hidden md:block" ref={searchRef}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search users, orders, deals..."
              value={searchQuery}
              onChange={e => handleSearch(e.target.value)}
              className="input pl-9 py-2 text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(''); setSearchResults(null); }}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="w-3.5 h-3.5 text-slate-400" />
              </button>
            )}
          </div>

          {/* Search Results Dropdown */}
          {searchResults && (
            <div className="absolute top-full left-0 right-0 mt-2 premium-card p-3 max-h-80 overflow-y-auto animate-fade-up z-50">
              {searchLoading && <p className="text-xs text-slate-400 text-center py-2">Searching...</p>}
              {['users', 'orders', 'deals', 'tickets'].map(type => {
                const items = searchResults[type] || [];
                if (items.length === 0) return null;
                return (
                  <div key={type} className="mb-3">
                    <p className="section-label mb-1">{type}</p>
                    {items.map((item: any) => (
                      <div key={item.id} className="px-2 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer text-xs">
                        <span className="font-semibold">{item.name || item.orderNo || item.productName || item.title}</span>
                        <span className="ml-2 text-slate-400">{item.id}</span>
                      </div>
                    ))}
                  </div>
                );
              })}
              {Object.values(searchResults).every((arr: any) => arr.length === 0) && (
                <p className="text-xs text-slate-400 text-center py-2">No results found</p>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 ml-auto">
        {/* Dark Mode Toggle */}
        <button
          onClick={onToggleDark}
          className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-500" />}
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => { setNotifOpen(!notifOpen); setProfileOpen(false); }}
            className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative"
          >
            <Bell className="w-4 h-4 text-slate-500" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 premium-card p-0 animate-scale-in z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
                <p className="font-bold text-sm">Notifications</p>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-xs text-brand-600 font-semibold hover:text-brand-700">
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto">
                {notifications.length === 0 && (
                  <div className="py-8 text-center">
                    <Bell className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">No notifications</p>
                  </div>
                )}
                {notifications.slice(0, 8).map((n) => (
                  <div key={n.id} className={`px-4 py-3 border-b hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors ${!n.read ? 'bg-brand-50/50 dark:bg-brand-950/20' : ''}`}
                    style={{ borderColor: 'var(--color-border)' }}>
                    <div className="flex items-start gap-2">
                      {!n.read && <div className="w-2 h-2 mt-1.5 rounded-full bg-brand-600 flex-shrink-0" />}
                      {n.read && <div className="w-2 h-2 mt-1.5 rounded-full bg-transparent flex-shrink-0" />}
                      <div>
                        <p className="text-xs font-semibold">{n.title}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{n.body}</p>
                        <p className="text-[10px] text-slate-300 dark:text-slate-600 mt-1">{n.createdAt?.slice(0, 10)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Avatar + Dropdown */}
        <div className="relative">
          <button
            onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false); }}
            className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <div className={`w-7 h-7 rounded-lg bg-gradient-to-tr ${avatarGradient} flex items-center justify-center text-white text-xs font-bold`}>
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-bold leading-none">{user?.name?.split(' ')[0]}</p>
              <p className="text-[10px] capitalize mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{user?.role}</p>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-full mt-2 w-52 premium-card p-2 animate-scale-in z-50">
              <div className="px-3 py-2 mb-1">
                <p className="text-sm font-bold">{user?.name}</p>
                <p className="text-xs text-slate-400 truncate">{user?.email}</p>
              </div>
              <div className="border-t mb-1" style={{ borderColor: 'var(--color-border)' }} />
              <a href={user?.role === 'buyer' ? '/buyer/dashboard' : '/admin/dashboard'} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <User className="w-4 h-4 text-slate-400" /> Profile
              </a>
              {user?.role !== 'buyer' && (
                <a href="/admin/settings" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  <Settings className="w-4 h-4 text-slate-400" /> Settings
                </a>
              )}
              <div className="border-t mt-1 pt-1" style={{ borderColor: 'var(--color-border)' }} />
              <button
                onClick={logout}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
