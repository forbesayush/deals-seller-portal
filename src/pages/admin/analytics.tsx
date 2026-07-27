import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks/useAuth';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import {
  BarChart3, Users, ShoppingBag, TrendingUp, DollarSign,
  ShieldAlert, Copy, AlertTriangle, RefreshCw, Zap,
  TrendingDown, Activity, Sparkles, Award, Crown, CheckCircle2,
  Calendar, Layers, ArrowUpRight, ChevronRight, PieChart, Store, UserCheck, Clock
} from 'lucide-react';

function formatINR(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

export default function AdminAnalytics() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const [activeTab, setActiveTab] = useState<'fraud' | 'predictions' | 'merchants' | 'ltv'>('fraud');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const toggleDark = () => {
    const isDark = !darkMode;
    setDarkMode(isDark);
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  };

  const fetchAiAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/analytics/ai');
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setLastUpdated(new Date().toLocaleTimeString());
      }
    } catch (e) {
      console.error('Failed to fetch AI analytics', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') { setDarkMode(true); document.documentElement.classList.add('dark'); }
    if (isAuthenticated) fetchAiAnalytics();
  }, [isAuthenticated, fetchAiAnalytics]);

  return (
    <>
      <Head>
        <title>AI & Intelligence Analytics — Admin Portal</title>
      </Head>

      <div className="min-h-screen flex" style={{ background: 'var(--color-bg)' }}>
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} darkMode={darkMode} />

        <div className="flex-1 flex flex-col min-h-screen transition-all duration-300"
          style={{ marginLeft: sidebarCollapsed ? 72 : 260 }}>
          <Header title="AI Intelligence" darkMode={darkMode} onToggleDark={toggleDark} sidebarCollapsed={sidebarCollapsed} />

          <main className="flex-1 p-6 pt-[88px] space-y-6 animate-fade-up">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="page-title flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-brand-600 dark:text-violet-400 animate-pulse" />
                  AI & Intelligence Hub
                </h1>
                <p className="page-subtitle">Fraud detection, cashback prediction, brand performance & user retention analytics</p>
              </div>
              <div className="flex items-center gap-3">
                {lastUpdated && <span className="text-xs text-slate-400 font-mono">Synced {lastUpdated}</span>}
                <button onClick={fetchAiAnalytics} className="btn btn-primary btn-sm">
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh AI Insights
                </button>
              </div>
            </div>

            {/* Quick Summary Cards */}
            {data && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="premium-card p-4 card-accent-violet flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400">Fraud & Risk Alerts</p>
                    <p className="text-xl font-extrabold text-rose-500">{data.summary?.fraudAlertsCount || 0}</p>
                  </div>
                </div>

                <div className="premium-card p-4 card-accent-emerald flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400">7-Day Payout AI Forecast</p>
                    <p className="text-xl font-extrabold text-emerald-600">{formatINR(data.predictions?.forecast7Days || 0)}</p>
                  </div>
                </div>

                <div className="premium-card p-4 card-accent-blue flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400">Avg Buyer LTV</p>
                    <p className="text-xl font-extrabold text-brand-600 dark:text-violet-400">{formatINR(data.summary?.avgLTV || 0)}</p>
                  </div>
                </div>

                <div className="premium-card p-4 card-accent-amber flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400">Repeat Purchase Rate</p>
                    <p className="text-xl font-extrabold text-amber-500">{data.summary?.repeatPurchaseRate || 0}%</p>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6">
              {[
                { id: 'fraud', label: '🛡️ Fraud & Suspicious Alerts', count: (data?.summary?.fraudAlertsCount || 0) + (data?.summary?.suspiciousUsersCount || 0) },
                { id: 'predictions', label: '🔮 AI Cashback Prediction' },
                { id: 'merchants', label: '🏬 Merchant Performance' },
                { id: 'ltv', label: '💎 User LTV & Retention' },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id as any)}
                  className={`pb-3 text-sm font-extrabold flex items-center gap-2 transition-all relative ${
                    activeTab === t.id ? 'text-brand-600 dark:text-violet-400 border-b-2 border-brand-600 dark:border-violet-400' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {t.label}
                  {t.count !== undefined && t.count > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-rose-500 text-white font-mono">
                      {t.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* ─── TAB 1: FRAUD & SUSPICIOUS ALERTS ─── */}
            {activeTab === 'fraud' && (
              <div className="space-y-6 animate-fade-in">
                {/* Section: Cashback Fraud Detection */}
                <div className="premium-card p-5 space-y-4 border-l-4 border-l-rose-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-extrabold text-base flex items-center gap-2 text-rose-600 dark:text-rose-400">
                        <ShieldAlert className="w-5 h-5" /> Cashback Fraud Detection Engine
                      </h3>
                      <p className="text-xs text-slate-400">Flagged orders requiring administrator audit based on risk scores</p>
                    </div>
                    <span className="badge badge-rose text-xs font-mono">{data?.fraudDetection?.length || 0} Flagged Orders</span>
                  </div>

                  {!data?.fraudDetection?.length ? (
                    <div className="p-8 text-center bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200 dark:border-emerald-900/40">
                      <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                      <p className="font-extrabold text-emerald-700 dark:text-emerald-400">All Clear! No Fraud Alerts Detected</p>
                      <p className="text-xs text-slate-400 mt-1">AI algorithm scanned order velocity, deduction ratios, and duplicate IDs.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="data-table text-xs">
                        <thead>
                          <tr>
                            <th>Order No</th>
                            <th>Code</th>
                            <th>Buyer ID</th>
                            <th>Amount</th>
                            <th>Risk Score</th>
                            <th>Detected Risk Flags</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.fraudDetection.map((f: any) => (
                            <tr key={f.id}>
                              <td className="font-mono font-extrabold">{f.orderNo}</td>
                              <td className="font-mono text-brand-600 dark:text-violet-400 font-bold">{f.orderCode}</td>
                              <td className="font-mono">{f.buyerId}</td>
                              <td className="font-bold">{formatINR(f.amount)}</td>
                              <td>
                                <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                  f.riskLevel === 'High' ? 'bg-rose-500 text-white' : 'bg-amber-500 text-white'
                                }`}>
                                  {f.riskScore}% {f.riskLevel} Risk
                                </span>
                              </td>
                              <td>
                                <div className="flex flex-wrap gap-1">
                                  {f.flags.map((flag: string, idx: number) => (
                                    <span key={idx} className="bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded text-[10px] font-semibold border border-rose-200 dark:border-rose-900/40">
                                      ⚠️ {flag}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td>
                                <button onClick={() => router.push(`/admin/orders?q=${f.orderNo}`)} className="btn btn-ghost btn-xs text-brand-600">
                                  Audit Order
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Section: Duplicate Order Detection & Suspicious Users Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Duplicate Orders */}
                  <div className="premium-card p-5 space-y-4">
                    <h3 className="font-extrabold text-sm flex items-center gap-2 text-amber-600 dark:text-amber-400">
                      <Copy className="w-4 h-4" /> Duplicate Order Detection
                    </h3>
                    <p className="text-xs text-slate-400">Clusters of identical order numbers claimed multiple times</p>

                    {!data?.duplicateOrders?.length ? (
                      <p className="text-xs text-slate-400 italic py-4">No duplicate order numbers found across database.</p>
                    ) : (
                      <div className="space-y-3">
                        {data.duplicateOrders.map((d: any, i: number) => (
                          <div key={i} className="p-3.5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 text-xs flex justify-between items-center">
                            <div>
                              <span className="font-mono font-extrabold text-amber-700 dark:text-amber-300">{d.orderNo}</span>
                              <p className="text-[10px] text-slate-400 mt-0.5">Claimed {d.count} times by buyers: {d.buyerIds.join(', ')}</p>
                            </div>
                            <button onClick={() => router.push(`/admin/orders?q=${d.orderNo}`)} className="btn btn-primary btn-xs">
                              Inspect Cluster
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Suspicious User Alerts */}
                  <div className="premium-card p-5 space-y-4">
                    <h3 className="font-extrabold text-sm flex items-center gap-2 text-rose-600 dark:text-rose-400">
                      <AlertTriangle className="w-4 h-4" /> Suspicious User Alerts
                    </h3>
                    <p className="text-xs text-slate-400">Buyers flagged for abnormal rejection rates or unverified profiles</p>

                    {!data?.suspiciousUsers?.length ? (
                      <p className="text-xs text-slate-400 italic py-4">No suspicious user profiles detected.</p>
                    ) : (
                      <div className="space-y-3">
                        {data.suspiciousUsers.map((u: any, i: number) => (
                          <div key={i} className="p-3.5 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 text-xs flex justify-between items-center">
                            <div>
                              <p className="font-bold text-rose-700 dark:text-rose-300">{u.name} ({u.id})</p>
                              <p className="text-[10px] text-slate-400">{u.reasons.join(' • ')}</p>
                            </div>
                            <button onClick={() => router.push(`/admin/users?q=${u.id}`)} className="btn btn-ghost btn-xs text-rose-600 font-bold">
                              Manage User
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ─── TAB 2: AI CASHBACK PREDICTION ─── */}
            {activeTab === 'predictions' && data?.predictions && (
              <div className="space-y-6 animate-fade-in">
                <div className="premium-card p-6 card-accent-emerald space-y-6">
                  <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: 'var(--color-border)' }}>
                    <div>
                      <h3 className="font-extrabold text-lg flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                        <Sparkles className="w-5 h-5" /> AI Cashback Forecast Engine
                      </h3>
                      <p className="text-xs text-slate-400">Predictive liquidity requirements for upcoming buyer payouts</p>
                    </div>
                    <span className="badge badge-emerald text-xs font-bold">
                      {data.predictions.confidenceScore}% AI Confidence Rating
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-center space-y-1">
                      <p className="text-xs text-slate-400 uppercase font-bold">7-Day Projected Payout</p>
                      <p className="text-2xl font-extrabold text-emerald-600">{formatINR(data.predictions.forecast7Days)}</p>
                      <p className="text-[10px] text-slate-400">Based on ~{data.predictions.dailyOrderVelocity * 7} expected orders</p>
                    </div>

                    <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-center space-y-1">
                      <p className="text-xs text-slate-400 uppercase font-bold">14-Day Projected Payout</p>
                      <p className="text-2xl font-extrabold text-brand-600 dark:text-violet-400">{formatINR(data.predictions.forecast14Days)}</p>
                      <p className="text-[10px] text-slate-400">Based on ~{data.predictions.dailyOrderVelocity * 14} expected orders</p>
                    </div>

                    <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-center space-y-1">
                      <p className="text-xs text-slate-400 uppercase font-bold">30-Day Projected Payout</p>
                      <p className="text-2xl font-extrabold text-purple-600">{formatINR(data.predictions.forecast30Days)}</p>
                      <p className="text-[10px] text-slate-400">Based on ~{data.predictions.dailyOrderVelocity * 30} expected orders</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-brand-50/50 dark:bg-brand-950/20 border border-brand-200 dark:border-brand-900/40 text-xs flex justify-between items-center">
                    <div>
                      <p className="font-extrabold text-brand-700 dark:text-violet-300">Active Deals Liquidity Potential</p>
                      <p className="text-slate-500 dark:text-slate-400 mt-0.5">Maximum potential cashback liability if all remaining slots are claimed</p>
                    </div>
                    <span className="font-mono text-base font-extrabold text-brand-600 dark:text-violet-400">
                      {formatINR(data.predictions.activeDealsVolumePotential)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* ─── TAB 3: MERCHANT PERFORMANCE ─── */}
            {activeTab === 'merchants' && data?.merchantPerformance && (
              <div className="space-y-6 animate-fade-in">
                <div className="premium-card p-6 space-y-6">
                  <div>
                    <h3 className="font-extrabold text-lg flex items-center gap-2">
                      <Store className="w-5 h-5 text-brand-600 dark:text-violet-400" /> Platform & Brand Performance Breakdown
                    </h3>
                    <p className="text-xs text-slate-400">Order volume, gross merchandise value (GMV), and conversion efficiency per brand</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {data.merchantPerformance.map((m: any, idx: number) => (
                      <div key={idx} className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-3">
                        <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: 'var(--color-border)' }}>
                          <span className="font-extrabold text-sm">{m.brand}</span>
                          <span className="badge badge-brand text-[10px]">{m.conversionRate}% Approved</span>
                        </div>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Total Orders:</span>
                            <span className="font-bold">{m.totalOrders}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Gross Value:</span>
                            <span className="font-bold">{formatINR(m.totalVolume)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Cashback Paid:</span>
                            <span className="font-bold text-emerald-600">{formatINR(m.totalCashback)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Avg Order Value:</span>
                            <span className="font-bold text-slate-700 dark:text-slate-300">{formatINR(m.avgOrderValue)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ─── TAB 4: USER LTV & RETENTION ─── */}
            {activeTab === 'ltv' && data?.ltvAnalytics && (
              <div className="space-y-6 animate-fade-in">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Tier Distribution */}
                  <div className="premium-card p-5 space-y-4">
                    <h3 className="font-extrabold text-sm flex items-center gap-2 text-purple-600 dark:text-purple-400">
                      <Crown className="w-4 h-4" /> VIP Tier Distribution
                    </h3>
                    <div className="space-y-3 text-xs">
                      <div className="flex items-center justify-between p-3 rounded-xl bg-purple-500/10 text-purple-600 font-bold">
                        <span>💎 Platinum VIP (₹5k+ / 5+ orders)</span>
                        <span>{data.ltvAnalytics.tierBreakdown.platinum}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 text-amber-600 font-bold">
                        <span>🥇 Gold (₹2.5k+ / 3+ orders)</span>
                        <span>{data.ltvAnalytics.tierBreakdown.gold}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-500/10 text-slate-600 font-bold">
                        <span>🥈 Silver (₹1k+ / 2+ orders)</span>
                        <span>{data.ltvAnalytics.tierBreakdown.silver}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-xl bg-amber-700/10 text-amber-800 dark:text-amber-400 font-bold">
                        <span>🥉 Bronze (New Buyers)</span>
                        <span>{data.ltvAnalytics.tierBreakdown.bronze}</span>
                      </div>
                    </div>
                  </div>

                  {/* Top VIP Buyers Table */}
                  <div className="premium-card p-5 space-y-4 lg:col-span-2">
                    <h3 className="font-extrabold text-sm flex items-center gap-2 text-brand-600 dark:text-violet-400">
                      <UserCheck className="w-4 h-4" /> Top High-LTV Buyers
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="data-table text-xs">
                        <thead>
                          <tr>
                            <th>Buyer</th>
                            <th>Tier</th>
                            <th>Total Spent</th>
                            <th>Total Cashback</th>
                            <th>Orders</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.ltvAnalytics.topBuyers.map((b: any, i: number) => (
                            <tr key={i}>
                              <div>
                                <p className="font-extrabold">{b.name}</p>
                                <p className="text-[10px] text-slate-400">{b.email}</p>
                              </div>
                              <td>
                                <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                  b.tier === 'Platinum VIP' ? 'bg-purple-500 text-white' : b.tier === 'Gold' ? 'bg-amber-500 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                                }`}>
                                  {b.tier}
                                </span>
                              </td>
                              <td className="font-bold">{formatINR(b.totalSpent)}</td>
                              <td className="font-bold text-emerald-600">{formatINR(b.totalEarnings)}</td>
                              <td className="font-bold font-mono">{b.orderCount}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </>
  );
}
