import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks/useAuth';
import { Settings, Save, Loader2, RefreshCw, Info } from 'lucide-react';

interface Setting {
  key: string;
  value: string;
  description: string | null;
  updatedAt: string | null;
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
  const [settings, setSettings] = useState<Setting[]>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !['admin', 'super_admin'].includes(user?.role || ''))) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, user]);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetch('/api/settings').then(r => r.json()).then((data: Setting[]) => {
      const merged = DEFAULT_SETTINGS.map(def => {
        const fetched = data.find(d => d.key === def.key);
        return fetched || def;
      });
      setSettings(merged);
      const initial: Record<string, string> = {};
      merged.forEach(s => { initial[s.key] = s.value; });
      setEdits(initial);
      setLoading(false);
    }).catch(() => {
      const initial: Record<string, string> = {};
      DEFAULT_SETTINGS.forEach(s => { initial[s.key] = s.value; });
      setEdits(initial);
      setLoading(false);
    });
  }, [isAuthenticated]);

  const handleSave = async (key: string) => {
    setSavingKey(key);
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
    setSavingKey(null);
  };

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900"><div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Settings className="w-6 h-6 text-brand-500" />
              System Settings
            </h1>
            <p className="text-sm text-slate-400 mt-1">Configure platform-wide business rules dynamically</p>
          </div>
          <button onClick={() => router.push('/admin/dashboard')} className="px-3 py-2 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 rounded-xl transition-colors">
            ← Dashboard
          </button>
        </div>

        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-2xl p-4 flex items-start gap-3 text-sm text-amber-700 dark:text-amber-400">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <p>Changes take effect immediately on the next API call. No server restart required.</p>
        </div>

        <div className="space-y-4">
          {settings.map(setting => (
            <div key={setting.key} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <label className="font-extrabold text-sm text-slate-700 dark:text-slate-200 font-mono">{setting.key}</label>
                    {savedKey === setting.key && (
                      <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400">Saved!</span>
                    )}
                  </div>
                  {setting.description && <p className="text-xs text-slate-400 mb-3">{setting.description}</p>}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={edits[setting.key] ?? setting.value}
                      onChange={e => setEdits(prev => ({ ...prev, [setting.key]: e.target.value }))}
                      className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                    <button
                      onClick={() => handleSave(setting.key)}
                      disabled={savingKey === setting.key || edits[setting.key] === setting.value}
                      className="flex items-center gap-1.5 px-3 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white rounded-xl font-bold text-xs transition-colors"
                    >
                      {savingKey === setting.key ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      Save
                    </button>
                  </div>
                  {setting.updatedAt && <p className="text-[10px] text-slate-400 mt-2">Last updated: {new Date(setting.updatedAt).toLocaleString()}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
