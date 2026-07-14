import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useAuth } from '@/hooks/useAuth';
import {
  KeyRound, ArrowRight, Loader2, Eye, EyeOff,
  ShieldCheck, Sparkles, TrendingUp, Users, Tag
} from 'lucide-react';

const FEATURES = [
  { icon: Tag, label: 'Live Deals Marketplace', desc: 'Browse 100s of cashback deals' },
  { icon: TrendingUp, label: 'Smart Wallet', desc: 'Track & grow your cashback earnings' },
  { icon: Users, label: 'Referral Rewards', desc: 'Earn ₹50 for every friend you invite' },
  { icon: ShieldCheck, label: 'Secure & Verified', desc: 'Enterprise-grade security at every step' },
];

export default function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeFeature, setActiveFeature] = useState(0);
  const setUser = useAuth((state) => state.setUser);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature(prev => (prev + 1) % FEATURES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) {
      setError('Please enter your credentials');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const meRes = await fetch('/api/auth/me');
        const meData = await meRes.json();
        if (meData.success) {
          setUser(meData.user);
          const role = meData.user.role;
          if (['admin', 'super_admin', 'manager', 'auditor'].includes(role)) {
            window.location.href = '/admin/dashboard';
          } else {
            window.location.href = '/buyer/dashboard';
          }
        }
      } else {
        setError(data.detail || 'Invalid credentials. Please try again.');
      }
    } catch {
      setError('Connection error. Please check if the server is running.');
    } finally {
      setLoading(false);
    }
  };

  const feat = FEATURES[activeFeature];
  const FeatIcon = feat.icon;

  return (
    <>
      <Head>
        <title>Sign In — Deals Seller Portal</title>
        <meta name="description" content="Sign in to the Deals Seller Portal to browse cashback deals, manage orders, and track your earnings." />
      </Head>

      <div className="min-h-screen flex overflow-hidden" style={{ background: 'var(--color-bg)' }}>
        {/* Left — Hero Panel (hidden on mobile) */}
        <div className="hidden lg:flex flex-1 relative items-center justify-center overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #0f1629 0%, #1a1040 50%, #0f1629 100%)' }}
        >
          {/* Orbs */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-20 animate-float"
            style={{ background: 'radial-gradient(circle, #7c3aed, transparent)' }} />
          <div className="absolute bottom-1/4 right-1/4 w-72 h-72 rounded-full opacity-15 animate-float"
            style={{ background: 'radial-gradient(circle, #4f46e5, transparent)', animationDelay: '2s' }} />
          <div className="absolute top-1/2 right-1/3 w-48 h-48 rounded-full opacity-10 animate-float"
            style={{ background: 'radial-gradient(circle, #10b981, transparent)', animationDelay: '4s' }} />

          {/* Grid overlay */}
          <div className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
              backgroundSize: '50px 50px'
            }}
          />

          <div className="relative z-10 text-white max-w-md px-12">
            {/* Logo */}
            <div className="flex items-center gap-3 mb-12">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center font-black text-lg shadow-glow-violet">
                DS
              </div>
              <div>
                <p className="font-extrabold text-xl tracking-tight">deals.seller</p>
                <p className="text-xs text-white/50 font-semibold uppercase tracking-widest">Enterprise Portal</p>
              </div>
            </div>

            <h1 className="text-4xl font-extrabold leading-tight mb-4">
              Your all-in-one<br />
              <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(90deg, #a78bfa, #818cf8)' }}>
                cashback platform
              </span>
            </h1>
            <p className="text-white/60 text-base leading-relaxed mb-12">
              Discover live deals, track orders, manage your wallet, and earn cashback — all in one beautifully designed portal.
            </p>

            {/* Feature Carousel */}
            <div className="relative h-24 overflow-hidden">
              {FEATURES.map((f, i) => {
                const Icon = f.icon;
                return (
                  <div
                    key={i}
                    className={`absolute inset-0 flex items-center gap-4 transition-all duration-700 ${i === activeFeature ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
                  >
                    <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center flex-shrink-0 backdrop-blur">
                      <Icon className="w-6 h-6 text-violet-300" />
                    </div>
                    <div>
                      <p className="font-bold text-base">{f.label}</p>
                      <p className="text-sm text-white/50">{f.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Feature Dots */}
            <div className="flex gap-2 mt-6">
              {FEATURES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveFeature(i)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${i === activeFeature ? 'w-8 bg-violet-400' : 'w-2 bg-white/20'}`}
                />
              ))}
            </div>

            {/* Stats */}
            <div className="mt-12 grid grid-cols-3 gap-4">
              {[
                { val: '10K+', label: 'Active Users' },
                { val: '500+', label: 'Live Deals' },
                { val: '₹2Cr+', label: 'Cashback Paid' },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <p className="text-2xl font-extrabold text-white">{s.val}</p>
                  <p className="text-xs text-white/40 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right — Login Form */}
        <div className="flex-1 lg:max-w-[480px] flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-sm animate-fade-up">
            {/* Mobile Logo */}
            <div className="lg:hidden flex items-center gap-3 mb-10">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center font-black text-white shadow-md">
                DS
              </div>
              <div>
                <p className="font-extrabold tracking-tight">deals.seller</p>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest">Enterprise Portal</p>
              </div>
            </div>

            <div className="mb-8">
              <h2 className="text-3xl font-extrabold tracking-tight">Welcome back</h2>
              <p className="text-sm mt-2" style={{ color: 'var(--color-text-muted)' }}>
                Sign in to continue to your portal
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-6 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 text-sm flex items-center gap-2 animate-slide-in">
                <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Identifier */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--color-text-muted)' }}>
                  Email / Mobile / Username
                </label>
                <input
                  type="text"
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  placeholder="Enter email, mobile or username"
                  className="input"
                  autoFocus
                  autoComplete="username"
                />
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>
                    Password
                  </label>
                  <a href="#" className="text-xs font-bold text-brand-600 hover:text-brand-700 dark:text-violet-400">
                    Forgot password?
                  </a>
                </div>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="input pr-10"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary btn-lg w-full mt-2"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Signing in...</>
                ) : (
                  <><span>Sign In</span><ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-6 text-center">
              <div className="absolute inset-x-0 top-1/2 border-t" style={{ borderColor: 'var(--color-border)' }} />
              <span className="relative px-3 text-xs font-medium" style={{ color: 'var(--color-text-muted)', background: 'var(--color-bg)' }}>
                Quick access
              </span>
            </div>

            {/* Quick Login Chips */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Admin Demo', id: 'admin', pwd: 'admin@123', icon: '🛡️' },
                { label: 'Buyer Demo', id: 'alwaysayushsourav162@gmail.com', pwd: 'ekta123', icon: '🛍️' },
              ].map(demo => (
                <button
                  key={demo.label}
                  onClick={() => { setIdentifier(demo.id); setPassword(demo.pwd); }}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-semibold hover:border-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950/20 transition-all duration-200"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
                >
                  <span>{demo.icon}</span>
                  <span>{demo.label}</span>
                </button>
              ))}
            </div>

            {/* Register link */}
            <p className="text-center text-xs mt-8" style={{ color: 'var(--color-text-muted)' }}>
              New to deals.seller?{' '}
              <a href="/login" className="font-bold text-brand-600 dark:text-violet-400 hover:underline">
                Create an account →
              </a>
            </p>

            {/* Footer */}
            <p className="text-center text-[10px] mt-6" style={{ color: 'var(--color-text-muted)' }}>
              Protected by enterprise-grade security. © 2026 deals.seller
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
