import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useAuth, setAuthToken, authFetch } from '@/hooks/useAuth';
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
  const [isRegister, setIsRegister] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
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
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (isRegister) {
        if (!name.trim() || !identifier.trim() || !password.trim()) {
          setError('Please fill in all required fields (Full Name, Email, Password).');
          setLoading(false);
          return;
        }

        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            email: identifier.trim(),
            mobile: mobile.trim(),
            password: password.trim(),
            referralCode: referralCode.trim(),
          }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          if (data.token) setAuthToken(data.token);
          setUser(data.user);
          setSuccessMsg('Account created successfully! Redirecting to dashboard...');
          setTimeout(() => {
            window.location.href = '/buyer/dashboard';
          }, 800);
        } else {
          setError(data.detail || 'Could not create account. Please check details.');
        }
      } else {
        const cleanIdentifier = identifier ? identifier.trim() : '';
        const cleanPassword = password ? password.trim() : '';
        if (!cleanIdentifier || !cleanPassword) {
          setError('Please enter your credentials');
          setLoading(false);
          return;
        }

        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: cleanIdentifier, password: cleanPassword }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          if (data.token) setAuthToken(data.token);
          const meRes = await authFetch('/api/auth/me');
          const meData = await meRes.json();
          if (meData.success && meData.user) {
            setUser(meData.user);
            const role = meData.user.role;
            if (typeof window !== 'undefined') {
              sessionStorage.setItem('ds_session_user_id', meData.user.id);
              sessionStorage.setItem('ds_user_role', role);
              sessionStorage.setItem('jm_session', JSON.stringify({
                userId: meData.user.id,
                role: role,
                expiresAt: Date.now() + (8 * 60 * 60 * 1000)
              }));
            }
            if (['admin', 'super_admin', 'manager', 'auditor'].includes(role)) {
              window.location.href = '/admin/dashboard';
            } else {
              window.location.href = '/buyer/dashboard';
            }
          }
        } else {
          setError(data.detail || 'Invalid credentials. Please try again.');
        }
      }
    } catch {
      setError('Connection error. Please try again.');
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

      <div className="min-h-screen flex overflow-hidden liquid-bg-mesh" style={{ background: 'var(--color-bg)' }}>
        {/* Left — Hero Panel (hidden on mobile) */}
        <div className="hidden lg:flex flex-1 relative items-center justify-center overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #090d16 0%, #150d30 50%, #090d16 100%)' }}
        >
          {/* Orbs */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-25 animate-float"
            style={{ background: 'radial-gradient(circle, #7c3aed, transparent)' }} />
          <div className="absolute bottom-1/4 right-1/4 w-72 h-72 rounded-full opacity-20 animate-float"
            style={{ background: 'radial-gradient(circle, #3b82f6, transparent)', animationDelay: '2s' }} />
          <div className="absolute top-1/2 right-1/3 w-48 h-48 rounded-full opacity-15 animate-float"
            style={{ background: 'radial-gradient(circle, #10b981, transparent)', animationDelay: '4s' }} />

          {/* Grid overlay */}
          <div className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
              backgroundSize: '40px 40px'
            }}
          />

          <div className="relative z-10 text-white max-w-md px-12">
            {/* Logo */}
            <div className="flex items-center gap-3 mb-12">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-600 via-indigo-500 to-emerald-400 flex items-center justify-center font-black text-lg shadow-glow-violet">
                DS
              </div>
              <div>
                <p className="font-extrabold text-xl tracking-tight">deals.seller</p>
                <p className="text-xs text-white/50 font-semibold uppercase tracking-widest">Liquid Enterprise Portal</p>
              </div>
            </div>

            <h1 className="text-4xl font-extrabold leading-tight mb-4">
              Your all-in-one<br />
              <span className="liquid-gradient-text">
                liquid cashback platform
              </span>
            </h1>
            <p className="text-white/60 text-base leading-relaxed mb-12">
              Discover live deals, track real-time orders, manage your wallet, and earn cashback — all in one state-of-the-art liquid interface.
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
                    <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center flex-shrink-0 backdrop-blur border border-white/20">
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
                { val: 'Live Sync', label: 'Availability' },
                { val: '₹2Cr+', label: 'Cashback Paid' },
              ].map(s => (
                <div key={s.label} className="text-center p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur">
                  <p className="text-xl font-extrabold text-white">{s.val}</p>
                  <p className="text-[10px] text-white/40 mt-0.5 uppercase tracking-wider">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right — Login Form */}
        <div className="flex-1 lg:max-w-[500px] flex items-center justify-center px-6 py-12 relative z-10">
          <div className="w-full max-w-md animate-fade-up premium-card liquid-card-glow p-8 rounded-3xl">
            {/* Mobile Logo */}
            <div className="lg:hidden flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center font-black text-white shadow-md">
                DS
              </div>
              <div>
                <p className="font-extrabold tracking-tight">deals.seller</p>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest">Liquid Portal</p>
              </div>
            </div>

            <div className="mb-6">
              <h2 className="text-3xl font-extrabold tracking-tight">
                {isRegister ? 'Create an Account' : 'Welcome back'}
              </h2>
              <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
                {isRegister ? 'Join thousands of buyers earning instant cashback' : 'Sign in to continue to your portal'}
              </p>
            </div>



            {/* Success Alert */}
            {successMsg && (
              <div className="mb-6 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400 text-sm flex items-center gap-2 animate-slide-in">
                <Sparkles className="w-4 h-4 flex-shrink-0" />
                {successMsg}
              </div>
            )}

            {/* Error Alert */}
            {error && (
              <div className="mb-6 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 text-sm flex items-center gap-2 animate-slide-in">
                <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name (Register Mode) */}
              {isRegister && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Enter your full name"
                    className="input rounded-xl"
                    required
                  />
                </div>
              )}

              {/* Identifier (Email) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                  {isRegister ? 'Email Address *' : 'Email / Mobile / Username'}
                </label>
                <input
                  type={isRegister ? 'email' : 'text'}
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  placeholder={isRegister ? 'name@example.com' : 'Enter email, mobile or username'}
                  className="input rounded-xl"
                  required={isRegister}
                  autoComplete="username"
                />
              </div>

              {/* Mobile Number (Register Mode Optional) */}
              {isRegister && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                    Mobile Number (Optional)
                  </label>
                  <input
                    type="tel"
                    value={mobile}
                    onChange={e => setMobile(e.target.value)}
                    placeholder="10-digit mobile number"
                    className="input rounded-xl"
                  />
                </div>
              )}

              {/* Password */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                  Password *
                </label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="input rounded-xl pr-10"
                    required
                    autoComplete={isRegister ? 'new-password' : 'current-password'}
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

              {/* Referral Code (Register Mode Optional) */}
              {isRegister && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                    Referral Code (Optional)
                  </label>
                  <input
                    type="text"
                    value={referralCode}
                    onChange={e => setReferralCode(e.target.value)}
                    placeholder="e.g. AYUSH123"
                    className="input rounded-xl"
                  />
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary btn-lg w-full mt-2 rounded-xl"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> {isRegister ? 'Creating Account...' : 'Signing in...'}</>
                ) : (
                  <><span>{isRegister ? 'Create Account' : 'Sign In'}</span><ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </form>

            {/* Bottom Toggle Link */}
            <p className="text-center text-xs mt-6" style={{ color: 'var(--color-text-muted)' }}>
              {isRegister ? (
                <>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => { setIsRegister(false); setError(''); setSuccessMsg(''); }}
                    className="font-bold text-brand-600 dark:text-violet-400 hover:underline inline-flex items-center gap-0.5"
                  >
                    Sign in →
                  </button>
                </>
              ) : (
                <>
                  New to deals.seller?{' '}
                  <button
                    type="button"
                    onClick={() => { setIsRegister(true); setError(''); setSuccessMsg(''); }}
                    className="font-bold text-brand-600 dark:text-violet-400 hover:underline inline-flex items-center gap-0.5"
                  >
                    Create an account →
                  </button>
                </>
              )}
            </p>

            {/* Footer */}
            <p className="text-center text-[10px] mt-4" style={{ color: 'var(--color-text-muted)' }}>
              Protected by Liquid Enterprise Security. © 2026 deals.seller
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
