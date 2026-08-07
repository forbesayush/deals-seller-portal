import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth, setAuthToken, authFetch } from '@/hooks/useAuth';
import {
  KeyRound, ArrowRight, Loader2, Eye, EyeOff, Mail, Lock,
  ShieldCheck, Sparkles, TrendingUp, Users, Tag, LogOut,
  AlertTriangle, CheckCircle2, RefreshCw
} from 'lucide-react';

const FEATURES = [
  { icon: Tag, label: 'Live Deals Marketplace', desc: 'Browse 100s of cashback deals' },
  { icon: TrendingUp, label: 'Smart Wallet', desc: 'Track & grow your cashback earnings' },
  { icon: Users, label: 'Referral Rewards', desc: 'Earn ₹50 for every friend you invite' },
  { icon: ShieldCheck, label: 'Secure & Verified', desc: 'Enterprise-grade security at every step' },
];

export default function Login() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [isForgotPwd, setIsForgotPwd] = useState(false);

  // Login / Register fields
  const [identifier, setIdentifier] = useState('');
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  // Forgot password field
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState('');

  // General state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [activeFeature, setActiveFeature] = useState(0);

  // FR-04: Lockout countdown state
  const [lockoutMinutes, setLockoutMinutes] = useState(0);
  const [lockoutCountdown, setLockoutCountdown] = useState(0);

  // FR-08: Logout confirmation banner
  const [showLoggedOutBanner, setShowLoggedOutBanner] = useState(false);
  const [loggedOutReason, setLoggedOutReason] = useState<'manual' | 'idle' | null>(null);

  const setUser = useAuth((state) => state.setUser);

  // Read query params for logout confirmation banner (FR-08)
  useEffect(() => {
    if (router.query.loggedOut === '1') {
      setShowLoggedOutBanner(true);
      setLoggedOutReason(router.query.reason === 'idle' ? 'idle' : 'manual');
      // Clean up URL without navigation
      const { loggedOut, reason, ...rest } = router.query;
      router.replace({ pathname: router.pathname, query: rest }, undefined, { shallow: true });
    }
  }, [router.query.loggedOut]);

  // Feature carousel auto-advance
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature(prev => (prev + 1) % FEATURES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // FR-04: Lockout countdown timer
  useEffect(() => {
    if (lockoutCountdown <= 0) return;
    const t = setInterval(() => {
      setLockoutCountdown(prev => {
        if (prev <= 1) {
          clearInterval(t);
          setError('');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [lockoutCountdown]);

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
          setTimeout(() => { window.location.href = '/buyer/dashboard'; }, 800);
        } else {
          setError(data.detail || 'Could not create account. Please check details.');
        }
      } else {
        const cleanIdentifier = identifier ? identifier.trim() : '';
        const cleanPassword = password ? password.trim() : '';
        if (!cleanIdentifier || !cleanPassword) {
          setError('Please enter your credentials.');
          setLoading(false);
          return;
        }

        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: cleanIdentifier, password: cleanPassword, rememberMe }),
        });
        const data = await res.json();

        // FR-04: Lockout handling
        if (res.status === 429 && data.locked) {
          const mins = data.remainingMinutes || 15;
          setLockoutMinutes(mins);
          setLockoutCountdown(mins * 60);
          setError(data.detail || `Account locked. Try again in ${mins} minutes.`);
          setLoading(false);
          return;
        }

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
                expiresAt: Date.now() + (rememberMe ? 7 * 24 * 3600 * 1000 : 8 * 3600 * 1000),
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

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotMsg('');
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });
      const data = await res.json();
      setForgotMsg(data.message || 'If that email is registered, a reset link has been sent.');
    } catch {
      setForgotMsg('Could not send reset email. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  const feat = FEATURES[activeFeature];
  const FeatIcon = feat.icon;

  // ── Forgot Password Panel ────────────────────────────────────────────────────
  if (isForgotPwd) {
    return (
      <>
        <Head>
          <title>Reset Password — Deals Seller Portal</title>
          <meta name="description" content="Reset your deals.seller Portal password." />
        </Head>
        <div className="min-h-screen flex items-center justify-center px-6 py-12" style={{ background: 'var(--color-bg)' }}>
          <div className="w-full max-w-md animate-fade-up premium-card liquid-card-glow p-8 rounded-3xl">
            {/* Logo */}
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center font-black text-white shadow-md text-sm">DS</div>
              <div>
                <p className="font-extrabold tracking-tight">deals.seller</p>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest">Liquid Portal</p>
              </div>
            </div>

            <div className="mb-6">
              <h1 className="text-2xl font-extrabold tracking-tight">Reset your password</h1>
              <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
                Enter your registered email and we'll send you a secure reset link.
              </p>
            </div>

            {forgotMsg ? (
              <div className="mb-6 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400 text-sm flex items-start gap-2 animate-slide-in">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{forgotMsg}</span>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                    Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={e => setForgotEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="input rounded-xl pl-9"
                      required
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="btn btn-primary btn-lg w-full mt-2 rounded-xl"
                >
                  {forgotLoading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Sending reset link...</>
                  ) : (
                    <><Mail className="w-4 h-4" /> Send Reset Link</>
                  )}
                </button>
              </form>
            )}

            <p className="text-center text-xs mt-6" style={{ color: 'var(--color-text-muted)' }}>
              <button
                type="button"
                onClick={() => { setIsForgotPwd(false); setForgotMsg(''); setForgotEmail(''); }}
                className="font-bold text-brand-600 dark:text-violet-400 hover:underline inline-flex items-center gap-0.5"
              >
                ← Back to Sign In
              </button>
            </p>
          </div>
        </div>
      </>
    );
  }

  // ── Main Login / Register Panel ───────────────────────────────────────────────
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
              <span className="liquid-gradient-text">liquid cashback platform</span>
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
          <div className="w-full max-w-md animate-fade-up premium-card liquid-card-glow p-8 rounded-3xl relative overflow-hidden">

            {/* Mobile Logo */}
            <div className="lg:hidden flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center font-black text-white shadow-md text-sm">DS</div>
              <div>
                <p className="font-extrabold tracking-tight">deals.seller</p>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest">Liquid Portal</p>
              </div>
            </div>

            {/* FR-08: Logout confirmation banner */}
            {showLoggedOutBanner && (
              <div className="mb-5 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-400 text-sm flex items-start gap-2.5 animate-slide-in">
                <LogOut className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">
                    {loggedOutReason === 'idle' ? 'Signed out due to inactivity' : 'You have been signed out'}
                  </p>
                  <p className="text-xs mt-0.5 opacity-80">
                    {loggedOutReason === 'idle'
                      ? 'Your session expired after 15 minutes of inactivity. Please sign in again.'
                      : 'Your session has ended. Sign in to continue.'}
                  </p>
                </div>
              </div>
            )}

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

            {/* FR-04: Lockout error with countdown */}
            {error && lockoutCountdown > 0 && (
              <div className="mb-6 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-amber-700 dark:text-amber-400 text-sm animate-slide-in">
                <div className="flex items-start gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Account Temporarily Locked</p>
                    <p className="text-xs mt-0.5">Too many failed sign-in attempts. Please wait before trying again.</p>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-2 p-3 rounded-xl bg-amber-100 dark:bg-amber-950/50">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span className="font-mono font-bold text-sm tabular-nums">
                    {String(Math.floor(lockoutCountdown / 60)).padStart(2, '0')}:{String(lockoutCountdown % 60).padStart(2, '0')}
                  </span>
                  <span className="text-xs opacity-70">remaining</span>
                </div>
              </div>
            )}

            {/* Generic error (no lockout) */}
            {error && lockoutCountdown <= 0 && (
              <div className="mb-6 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 text-sm flex items-center gap-2 animate-slide-in">
                <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" id="auth-form">
              {/* Name (Register Mode) */}
              {isRegister && (
                <div>
                  <label htmlFor="reg-name" className="block text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                    Full Name *
                  </label>
                  <input
                    id="reg-name"
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Enter your full name"
                    className="input rounded-xl"
                    required
                  />
                </div>
              )}

              {/* Identifier */}
              <div>
                <label htmlFor="auth-identifier" className="block text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                  {isRegister ? 'Email Address *' : 'Email / Mobile / Username'}
                </label>
                <input
                  id="auth-identifier"
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
                  <label htmlFor="reg-mobile" className="block text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                    Mobile Number (Optional)
                  </label>
                  <input
                    id="reg-mobile"
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
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="auth-password" className="block text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>
                    Password *
                  </label>
                  {/* FR-05: Forgot password link */}
                  {!isRegister && (
                    <button
                      type="button"
                      onClick={() => { setIsForgotPwd(true); setError(''); }}
                      className="text-xs font-semibold text-brand-600 dark:text-violet-400 hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    id="auth-password"
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
                    aria-label={showPwd ? 'Hide password' : 'Show password'}
                  >
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Referral Code (Register Mode Optional) */}
              {isRegister && (
                <div>
                  <label htmlFor="reg-referral" className="block text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                    Referral Code (Optional)
                  </label>
                  <input
                    id="reg-referral"
                    type="text"
                    value={referralCode}
                    onChange={e => setReferralCode(e.target.value)}
                    placeholder="e.g. AYUSH123"
                    className="input rounded-xl"
                  />
                </div>
              )}

              {/* FR-10: Remember Me checkbox (login mode only) */}
              {!isRegister && (
                <label className="flex items-center gap-2.5 cursor-pointer select-none group">
                  <div
                    onClick={() => setRememberMe(!rememberMe)}
                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200 flex-shrink-0 ${rememberMe ? 'bg-violet-600 border-violet-600' : 'border-slate-300 dark:border-slate-600 group-hover:border-violet-400'}`}
                  >
                    {rememberMe && <CheckCircle2 className="w-3 h-3 text-white" />}
                  </div>
                  <input
                    id="remember-me"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                    className="sr-only"
                  />
                  <span className="text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                    Remember me for 7 days
                  </span>
                </label>
              )}

              {/* Submit */}
              <button
                id="auth-submit-btn"
                type="submit"
                disabled={loading || lockoutCountdown > 0}
                className="btn btn-primary btn-lg w-full mt-2 rounded-xl"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> {isRegister ? 'Creating Account...' : 'Signing in...'}</>
                ) : lockoutCountdown > 0 ? (
                  <><Lock className="w-4 h-4" /> Account Locked</>
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
