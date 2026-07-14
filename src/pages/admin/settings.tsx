import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks/useAuth';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { Settings, Save, Loader2, RefreshCw, Info, ToggleLeft, ToggleRight, ShieldAlert, Check } from 'lucide-react';

interface Setting {
  key: string;
  value: string;
  description: string | null;
  updatedAt: string | null;
}

interface FeatureFlag {
  key: string;
  enabled: boolean;
  description: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
}

const SETTING_DESCRIPTIONS: Record<string, string> = {
  platform_fee_pct: 'Platform processing fee percentage deducted from each order cashback (e.g. 5 = 5%)',
  min_withdrawal_amount: 'Minimum amount (₹) a buyer can request to withdraw',
  max_orders_per_day: 'Maximum number of order claims a buyer can submit per day',
  referral_bonus_amount: 'Cashback bonus (₹) credited to referrer when a new user signs up with their code',
  gold_tier_threshold: 'Minimum paid orders to reach Gold VIP tier',
  silver_tier_threshold: 'Minimum paid orders to reach Silver VIP tier',
};

const DEFAULT_SETTINGS: Setting[] = [
  { key: 'platform_fee_pct', value: '5.0', description: SETTING_DESCRIPTIONS.platform_fee_pct, updatedAt: null },
  { key: 'min_withdrawal_amount', value: '100', description: SETTING_DESCRIPTIONS.min_withdrawal_amount, updatedAt: null },
  { key: 'max_orders_per_day', value: '3', description: SETTING_DESCRIPTIONS.max_orders_per_day, updatedAt: null },
  { key: 'referral_bonus_amount', value: '50', description: SETTING_DESCRIPTIONS.referral_bonus_amount, updatedAt: null },
  { key: 'gold_tier_threshold', value: '5', description: SETTING_DESCRIPTIONS.gold_tier_threshold, updatedAt: null },
  { key: 'silver_tier_threshold', value: '3', description: SETTING_DESCRIPTIONS.silver_tier_threshold, updatedAt: null },
];

export default function AdminSettings() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const [activeTab, setActiveTab] = useState<'rules' | 'flags'>('rules');

  const [settings, setSettings] = useState<Setting[]>(DEFAULT_SETTINGS);
  const [featureFlags, setFeatureFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [flagToggling, setFlagToggling] = useState<string | null>(null);

  const toggleDark = () => {
    const isDark = !darkMode;
    setDarkMode(isDark);
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  };

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [resSettings, resFlags] = await Promise.all([
        fetch('/api/settings'),
        fetch('/api/feature-flags')
      ]);

      if (resSettings.ok) {
        const data = await resSettings.json();
        const merged = DEFAULT_SETTINGS.map(def => {
          const fetched = data.find((d: Setting) => d.key === def.key);
          return fetched || def;
        });
        setSettings(merged);
        const initial: Record<string, string> = {};
        merged.forEach(s => { initial[s.key] = s.value; });
        setEdits(initial);
      }

      if (resFlags.ok) {
        setFeatureFlags(await resFlags.json());
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
    if (isAuthenticated) fetchAllData();
  }, [isAuthenticated]);

  const handleSaveSetting = async (key: string) => {
    setSavingKey(key);
    try {
      const res = await fetch(`/api/settings/${key}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: edits[key], description: settings.find(s => s.key === key)?.description }),
      });
      if (res.ok) {
        const updated = await res.json();
        setSettings(prev => prev.map(s => s.key === key ? { ...s, ...updated } : s));
        setSavedKey(key);
        setTimeout(() => setSavedKey(null), 2000);
      }
    } catch { /* silent */ } finally {
      setSavingKey(null);
    }
  };

  const handleToggleFlag = async (flag: FeatureFlag) => {
    setFlagToggling(flag.key);
    try {
      const res = await fetch(`/api/feature-flags/${flag.key}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !flag.enabled, description: flag.description }),
      });
      if (res.ok) {
        const updated = await res.json();
        setFeatureFlags(prev => prev.map(f => f.key === flag.key ? updated : f));
      }
    } catch { /* silent */ } finally {
      setFlagToggling(null);
    }
  };

  return (
    <>
      <Head>
        <title>System Settings — Admin Portal</title>
      </Head>

      <div className="min-h-screen flex" style={{ background: 'var(--color-bg)' }}>
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} darkMode={darkMode} />

        <div className="flex-1 flex flex-col min-h-screen transition-all duration-300"
          style={{ marginLeft: sidebarCollapsed ? 72 : 260 }}>
          <Header title="Settings" darkMode={darkMode} onToggleDark={toggleDark} sidebarCollapsed={sidebarCollapsed} />

          <main className="flex-1 p-6 pt-[88px] max-w-4xl space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="page-title flex items-center gap-2">
                  <Settings className="w-6 h-6 text-brand-600 dark:text-violet-400" />
                  System Control Center
                </h1>
                <p className="page-subtitle">Configure platform-wide business rules and toggles dynamically</p>
              </div>
              <button onClick={fetchAllData} className="btn btn-ghost btn-sm">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {/* Quick alert */}
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-2xl p-4 flex items-start gap-3 text-sm text-amber-700 dark:text-amber-400">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <p>Changes take effect immediately on next transactions. Please audit carefully.</p>
            </div>

            {/* Tab navigation */}
            <div className="flex items-center gap-2 border-b dark:border-slate-800 pb-2">
              <button
                onClick={() => setActiveTab('rules')}
                className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'rules' ? 'bg-brand-600 text-white shadow-sm' : 'btn-ghost text-slate-500'}`}
              >
                Business Rules
              </button>
              <button
                onClick={() => setActiveTab('flags')}
                className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'flags' ? 'bg-brand-600 text-white shadow-sm' : 'btn-ghost text-slate-500'}`}
              >
                Feature Flags
              </button>
            </div>

            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}
              </div>
            ) : activeTab === 'rules' ? (
              /* Settings tab */
              <div className="space-y-4">
                {settings.map(setting => (
                  <div key={setting.key} className="premium-card p-5">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <label className="font-extrabold text-sm text-slate-800 dark:text-slate-200 font-mono">{setting.key}</label>
                        {savedKey === setting.key && (
                          <span className="badge badge-emerald py-0 px-2 text-[9px] uppercase">Saved!</span>
                        )}
                      </div>
                      {setting.description && <p className="text-xs text-slate-450 dark:text-slate-400 mb-3">{setting.description}</p>}
                      <div className="flex items-center gap-2 max-w-md">
                        <input
                          type="text"
                          value={edits[setting.key] ?? setting.value}
                          onChange={e => setEdits(prev => ({ ...prev, [setting.key]: e.target.value }))}
                          className="flex-1 input font-mono text-sm"
                        />
                        <button
                          onClick={() => handleSaveSetting(setting.key)}
                          disabled={savingKey === setting.key || edits[setting.key] === setting.value}
                          className="btn btn-primary btn-sm"
                        >
                          {savingKey === setting.key ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          Save
                        </button>
                      </div>
                      {setting.updatedAt && (
                        <p className="text-[10px] text-slate-400 mt-2">
                          Last updated: {new Date(setting.updatedAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Feature Flags tab */
              <div className="space-y-4">
                {featureFlags.length === 0 && (
                  <div className="premium-card text-center py-12 text-slate-400">
                    <ShieldAlert className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    <p className="font-bold">No feature flags registered</p>
                  </div>
                )}
                {featureFlags.map(flag => (
                  <div key={flag.key} className="premium-card p-5 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm font-mono text-slate-800 dark:text-slate-200">{flag.key}</p>
                      <p className="text-xs text-slate-450 dark:text-slate-400 mt-1">{flag.description || 'No description'}</p>
                      {flag.updatedAt && (
                        <p className="text-[10px] text-slate-400 mt-1.5">
                          Toggled by {flag.updatedBy || 'system'} at {new Date(flag.updatedAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleToggleFlag(flag)}
                      disabled={flagToggling === flag.key}
                      className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      {flagToggling === flag.key ? (
                        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                      ) : flag.enabled ? (
                        <ToggleRight className="w-8 h-8 text-emerald-500" />
                      ) : (
                        <ToggleLeft className="w-8 h-8 text-slate-400" />
                      )}
                    </button>
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
