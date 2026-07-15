import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks/useAuth';
import {
  LayoutDashboard, ShoppingBag, Users, FileText, BarChart3,
  Ticket, Megaphone, Settings, Wallet, LogOut, ChevronLeft,
  ChevronRight, Tag, History, ArrowDownToLine, Shield, Flag,
  Search, Bell, TrendingUp, Star, Gift
} from 'lucide-react';

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
  badge?: number | string;
  roles?: string[];
}

interface NavSection {
  label: string;
  items: NavItem[];
  roles?: string[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Overview',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', href: '/admin/dashboard', roles: ['admin', 'super_admin', 'manager', 'auditor'] },
      { icon: LayoutDashboard, label: 'My Dashboard', href: '/buyer/dashboard', roles: ['buyer'] },
    ],
  },
  {
    label: 'Marketplace',
    items: [
      { icon: Tag, label: 'Live Deals', href: '/admin/deals', roles: ['admin', 'super_admin', 'manager', 'auditor'] },
    ],
  },
  {
    label: 'Operations',
    roles: ['admin', 'super_admin', 'manager', 'auditor'],
    items: [
      { icon: ShoppingBag, label: 'Orders', href: '/admin/orders', roles: ['admin', 'super_admin', 'manager', 'auditor'] },
      { icon: ArrowDownToLine, label: 'Refunds', href: '/admin/refunds', roles: ['admin', 'super_admin', 'manager', 'auditor'] },
      { icon: Wallet, label: 'Withdrawals', href: '/admin/withdrawals', roles: ['admin', 'super_admin', 'manager', 'auditor'] },
    ],
  },
  {
    label: 'Users & Support',
    roles: ['admin', 'super_admin', 'manager', 'auditor'],
    items: [
      { icon: Users, label: 'Users', href: '/admin/users', roles: ['admin', 'super_admin', 'manager', 'auditor'] },
      { icon: Ticket, label: 'Support Tickets', href: '/admin/tickets', roles: ['admin', 'super_admin', 'manager'] },
      { icon: Megaphone, label: 'Announcements', href: '/admin/announcements', roles: ['admin', 'super_admin'] },
    ],
  },
  {
    label: 'Intelligence',
    roles: ['admin', 'super_admin', 'auditor'],
    items: [
      { icon: BarChart3, label: 'Analytics', href: '/admin/analytics', roles: ['admin', 'super_admin', 'auditor'] },
      { icon: TrendingUp, label: 'Revenue', href: '/admin/analytics', roles: ['admin', 'super_admin', 'auditor'] },
      { icon: History, label: 'Audit Logs', href: '/admin/audit-logs', roles: ['admin', 'super_admin', 'auditor'] },
    ],
  },
  {
    label: 'System',
    roles: ['admin', 'super_admin'],
    items: [
      { icon: Settings, label: 'Settings', href: '/admin/settings', roles: ['admin', 'super_admin'] },
      { icon: Flag, label: 'Feature Flags', href: '/admin/settings', roles: ['super_admin'] },
      { icon: Shield, label: 'Security', href: '/admin/audit-logs', roles: ['super_admin'] },
    ],
  },
];

const BUYER_NAV: NavSection[] = [
  {
    label: 'My Portal',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', href: '/buyer/dashboard' },
      { icon: Tag, label: 'Browse Deals', href: '/buyer/dashboard' },
      { icon: ShoppingBag, label: 'My Orders', href: '/buyer/dashboard' },
      { icon: Wallet, label: 'Wallet', href: '/buyer/dashboard' },
      { icon: ArrowDownToLine, label: 'Withdrawals', href: '/buyer/dashboard' },
    ],
  },
  {
    label: 'More',
    items: [
      { icon: Ticket, label: 'Support Tickets', href: '/buyer/dashboard' },
      { icon: Gift, label: 'Referrals', href: '/buyer/dashboard' },
      { icon: Bell, label: 'Announcements', href: '/buyer/dashboard' },
    ],
  },
];

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
  darkMode?: boolean;
}

export function Sidebar({ collapsed = false, onToggle, darkMode }: SidebarProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const role = user?.role || 'buyer';

  const sections = role === 'buyer' ? BUYER_NAV : NAV_SECTIONS;
  const currentPath = router.pathname;

  const avatarColors: Record<string, string> = {
    violet:  'from-violet-600 to-indigo-600',
    emerald: 'from-emerald-500 to-teal-600',
    amber:   'from-amber-500 to-orange-600',
    rose:    'from-rose-500 to-pink-600',
    blue:    'from-blue-500 to-cyan-600',
  };
  const roleColorMap: Record<string, string> = {
    super_admin: 'violet',
    admin:       'violet',
    manager:     'blue',
    auditor:     'emerald',
    buyer:       'amber',
  };
  const avatarGradient = avatarColors[roleColorMap[user?.role ?? ''] ?? 'rose'] ?? avatarColors.rose;

  return (
    <aside
      className={`
        fixed top-0 left-0 h-screen z-30 flex flex-col
        glass-panel border-r transition-all duration-300
        ${collapsed ? 'w-[72px]' : 'w-[260px]'}
      `}
      style={{ borderColor: 'var(--color-border)' }}
    >
      {/* Logo */}
      <div className={`flex items-center h-16 px-4 border-b flex-shrink-0`}
        style={{ borderColor: 'var(--color-border)' }}>
        <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${avatarGradient} flex items-center justify-center text-white text-xs font-black flex-shrink-0 shadow-md`}>
          DS
        </div>
        {!collapsed && (
          <div className="ml-3 overflow-hidden">
            <p className="font-extrabold text-sm tracking-tight leading-none">deals.seller</p>
            <p className="text-[10px] font-semibold uppercase tracking-widest mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              {role === 'super_admin' ? 'Super Admin' : role === 'buyer' ? 'Buyer Portal' : role.charAt(0).toUpperCase() + role.slice(1) + ' Panel'}
            </p>
          </div>
        )}
        <button
          onClick={onToggle}
          className="ml-auto p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex-shrink-0"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav Sections */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {sections.map((section) => {
          const visibleItems = section.items.filter(item =>
            !item.roles || item.roles.includes(role)
          );
          if (visibleItems.length === 0) return null;

          return (
            <div key={section.label}>
              {!collapsed && (
                <p className="nav-section-label">{section.label}</p>
              )}
              {visibleItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPath === item.href ||
                  (item.href !== '/' && currentPath.startsWith(item.href));

                return (
                  <a
                    key={item.href + item.label}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={`sidebar-nav-item ${isActive ? 'active' : ''} ${collapsed ? 'justify-center' : ''}`}
                  >
                    <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-brand-600 dark:text-violet-400' : ''}`} />
                    {!collapsed && <span>{item.label}</span>}
                    {!collapsed && item.badge !== undefined && (
                      <span className="ml-auto badge badge-rose py-0.5 px-2">
                        {item.badge}
                      </span>
                    )}
                  </a>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* User Footer */}
      <div className={`px-2 py-3 border-t flex-shrink-0`} style={{ borderColor: 'var(--color-border)' }}>
        <div className={`flex items-center gap-3 px-2 py-2 rounded-xl ${collapsed ? 'justify-center' : ''}`}>
          <div className={`w-8 h-8 rounded-lg bg-gradient-to-tr ${avatarGradient} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold truncate">{user?.name}</p>
              <p className="text-[10px] capitalize" style={{ color: 'var(--color-text-muted)' }}>{user?.role}</p>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={logout}
              className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-400 hover:text-rose-600 transition-colors flex-shrink-0"
              title="Log out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
        {collapsed && (
          <button
            onClick={logout}
            className="w-full mt-2 p-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-400 hover:text-rose-600 transition-colors flex justify-center"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </aside>
  );
}
