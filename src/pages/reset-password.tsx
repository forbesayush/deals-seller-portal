// pages/reset-password.tsx — FR-05: Password reset form (linked from email)
import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Eye, EyeOff, Loader2, ShieldCheck, CheckCircle2, AlertTriangle, Lock } from 'lucide-react';

export default function ResetPassword() {
  const router = useRouter();
  const { token } = router.query;

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const passwordStrength = (): { label: string; color: string; width: string } => {
    const len = password.length;
    const hasUpper = /[A-Z]/.test(password);
    const hasNum = /\d/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);
    const score = [len >= 8, len >= 12, hasUpper, hasNum, hasSpecial].filter(Boolean).length;
    if (score <= 1) return { label: 'Weak', color: '#ef4444', width: '25%' };
    if (score <= 3) return { label: 'Fair', color: '#f59e0b', width: '55%' };
    if (score === 4) return { label: 'Good', color: '#3b82f6', width: '75%' };
    return { label: 'Strong', color: '#10b981', width: '100%' };
  };

  const strength = password ? passwordStrength() : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push('/login?resetSuccess=1');
        }, 2500);
      } else {
        setError(data.detail || 'Could not reset password. The link may have expired.');
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Set New Password — Deals Seller Portal</title>
        <meta name="description" content="Create a new password for your deals.seller Portal account." />
      </Head>

      <div
        className="min-h-screen flex items-center justify-center px-6 py-12"
        style={{ background: 'linear-gradient(135deg, #090d16 0%, #150d30 50%, #090d16 100%)' }}
      >
        {/* Ambient orbs */}
        <div className="fixed top-1/4 left-1/4 w-96 h-96 rounded-full opacity-20 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #7c3aed, transparent)', filter: 'blur(80px)' }} />
        <div className="fixed bottom-1/4 right-1/4 w-64 h-64 rounded-full opacity-15 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #3b82f6, transparent)', filter: 'blur(60px)' }} />

        <div className="w-full max-w-md relative z-10">
          <div
            className="rounded-3xl p-8 overflow-hidden"
            style={{
              background: 'rgba(15,17,23,0.85)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: '1px solid rgba(124,58,237,0.25)',
              boxShadow: '0 0 60px rgba(124,58,237,0.1), 0 25px 50px rgba(0,0,0,0.5)',
            }}
          >
            {/* Logo */}
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center font-black text-white shadow-md text-sm">DS</div>
              <div>
                <p className="font-extrabold tracking-tight text-white">deals.seller</p>
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#64748b' }}>Security Portal</p>
              </div>
            </div>

            {success ? (
              /* Success state */
              <div className="text-center py-6">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                </div>
                <h1 className="text-xl font-extrabold text-white mb-2">Password Updated!</h1>
                <p className="text-sm" style={{ color: '#94a3b8' }}>
                  Your password has been reset successfully. Redirecting you to sign in…
                </p>
                <div className="mt-4 flex justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
                </div>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-violet-500/10 border border-violet-500/30 flex items-center justify-center mb-4">
                    <Lock className="w-6 h-6 text-violet-400" />
                  </div>
                  <h1 className="text-2xl font-extrabold text-white mb-1">Create new password</h1>
                  <p className="text-sm" style={{ color: '#94a3b8' }}>
                    Choose a strong password you haven't used before.
                  </p>
                </div>

                {/* Error */}
                {error && (
                  <div className="mb-5 p-4 rounded-2xl border text-sm flex items-start gap-2 animate-slide-in"
                    style={{ background: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.25)', color: '#f87171' }}>
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    {error}
                  </div>
                )}

                {!token && (
                  <div className="mb-5 p-4 rounded-2xl border text-sm"
                    style={{ background: 'rgba(245,158,11,0.08)', borderColor: 'rgba(245,158,11,0.25)', color: '#fbbf24' }}>
                    This link appears to be invalid or missing the reset token. Please request a new reset link.
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5" id="reset-password-form">
                  {/* New Password */}
                  <div>
                    <label htmlFor="new-password" className="block text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: '#64748b' }}>
                      New Password *
                    </label>
                    <div className="relative">
                      <input
                        id="new-password"
                        type={showPwd ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Min. 8 characters"
                        className="input rounded-xl pr-10"
                        required
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPwd(!showPwd)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
                        aria-label={showPwd ? 'Hide password' : 'Show password'}
                      >
                        {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {/* Password strength bar */}
                    {strength && (
                      <div className="mt-2">
                        <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: strength.width, background: strength.color }}
                          />
                        </div>
                        <p className="text-[11px] font-semibold mt-1" style={{ color: strength.color }}>
                          {strength.label} password
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label htmlFor="confirm-password" className="block text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: '#64748b' }}>
                      Confirm Password *
                    </label>
                    <div className="relative">
                      <input
                        id="confirm-password"
                        type={showConfirm ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter your new password"
                        className="input rounded-xl pr-10"
                        required
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
                        aria-label={showConfirm ? 'Hide password' : 'Show password'}
                      >
                        {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {confirmPassword && password !== confirmPassword && (
                      <p className="text-[11px] text-rose-400 font-semibold mt-1">Passwords do not match</p>
                    )}
                    {confirmPassword && password === confirmPassword && password.length >= 8 && (
                      <p className="text-[11px] text-emerald-400 font-semibold mt-1 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Passwords match
                      </p>
                    )}
                  </div>

                  <button
                    id="reset-password-btn"
                    type="submit"
                    disabled={loading || !token}
                    className="btn btn-primary btn-lg w-full rounded-xl"
                  >
                    {loading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Updating password...</>
                    ) : (
                      <><ShieldCheck className="w-4 h-4" /> Set New Password</>
                    )}
                  </button>
                </form>

                <p className="text-center text-xs mt-6" style={{ color: '#475569' }}>
                  <a href="/login" className="font-semibold hover:text-violet-400 transition-colors" style={{ color: '#7c3aed' }}>
                    ← Back to Sign In
                  </a>
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
