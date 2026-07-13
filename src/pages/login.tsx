import React, { useState } from 'react';
import Head from 'next/head';
import { useAuth } from '@/hooks/useAuth';
import { KeyRound, ShieldAlert, ArrowRight, Loader2, Key } from 'lucide-react';

export default function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [error, setError] = useState('');
  
  const setUser = useAuth((state) => state.setUser);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) {
      setError('Please fill in all credentials fields');
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
        // Fetch current user details
        const meRes = await fetch('/api/auth/me');
        const meData = await meRes.json();
        if (meData.success) {
          setUser(meData.user);
          // Redirect
          if (meData.user.role === 'admin' || meData.user.role === 'manager' || meData.user.role === 'auditor') {
            window.location.href = '/admin/dashboard';
          } else {
            window.location.href = '/buyer/dashboard';
          }
        }
      } else {
        setError(data.detail || 'Invalid username or password');
      }
    } catch (err) {
      setError('Connection failed. Please check your backend service.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasskey = () => {
    setPasskeyLoading(true);
    setError('');
    setTimeout(async () => {
      setPasskeyLoading(false);
      // Auto login as admin for demonstration purposes
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: 'admin', password: 'admin@123' }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          const meRes = await fetch('/api/auth/me');
          const meData = await meRes.json();
          if (meData.success) {
            setUser(meData.user);
            window.location.href = '/admin/dashboard';
          }
        }
      } catch (err) {
        setError('Passkey login simulated bypass failed.');
      }
    }, 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 transition-colors duration-300 relative overflow-hidden">
      <Head>
        <title>Login - Enterprise Order Management</title>
      </Head>
      
      {/* Decorative Blur Spheres */}
      <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-indigo-200/40 dark:bg-indigo-950/20 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[35rem] h-[35rem] bg-violet-200/40 dark:bg-violet-950/20 rounded-full blur-[80px] pointer-events-none" />

      <div className="w-full max-w-md z-10 animate-fade-in">
        <div className="glass-panel rounded-3xl p-8 shadow-glass hover:shadow-2xl hover:border-brand-500/20 transition-all duration-500 border border-slate-200/50 dark:border-slate-850/50 relative before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-gradient-to-r before:from-brand-500 before:to-indigo-500 before:rounded-t-3xl">
          <div className="text-center mb-8">
            <div className="mx-auto w-12 h-12 bg-gradient-to-tr from-brand-600 to-indigo-600 rounded-2xl flex items-center justify-center text-white font-black shadow-md shadow-brand-200/50 dark:shadow-none mb-4 animate-bounce-slow">
              AG
            </div>
            <h2 className="text-2xl font-extrabold bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 dark:from-white dark:via-slate-200 dark:to-slate-400 bg-clip-text text-transparent tracking-tight">Welcome Back</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">Sign in to manage seller orders</p>
          </div>

          {error && (
            <div className="mb-6 flex items-center gap-3 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 p-4 rounded-xl text-sm border border-rose-100 dark:border-rose-950/50">
              <ShieldAlert className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Username or Email</label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="admin, Ayush, email@example.com"
                className="w-full px-4 py-3 bg-white/70 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-500/50 transition-all text-sm"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Password</label>
                <a href="#" className="text-xs font-bold text-brand-600 hover:text-brand-700 dark:text-brand-400">Forgot?</a>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-white/70 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-500/50 transition-all text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white rounded-xl font-bold text-sm shadow-md transition-all duration-300 flex items-center justify-center gap-2 hover:scale-[1.01]"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="relative my-6 text-center">
            <span className="absolute inset-x-0 top-1/2 border-b border-slate-200 dark:border-slate-800 -z-10" />
            <span className="bg-slate-50 dark:bg-slate-900 px-3 text-xs text-slate-400 font-medium">Or use secure key</span>
          </div>

          <button
            type="button"
            onClick={handlePasskey}
            disabled={passkeyLoading}
            className="w-full py-3 bg-white/80 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-sm shadow-sm transition-all duration-300 flex items-center justify-center gap-2"
          >
            {passkeyLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
            ) : (
              <>
                <Key className="w-4 h-4 text-brand-500" />
                <span>Sign in with Passkey</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
