import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks/useAuth';
import { ShieldAlert, Loader2, ArrowLeft, LogOut } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const router = useRouter();
  const { user, isAuthenticated, loading, logout } = useAuth();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace(`/login?returnUrl=${encodeURIComponent(router.asPath)}`);
    }
  }, [loading, isAuthenticated, router]);

  // Render full-screen loading spinner while auth state is resolving
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white">
        <div className="relative flex items-center justify-center">
          <div className="w-16 h-16 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
          <Loader2 className="w-6 h-6 text-indigo-400 absolute animate-pulse" />
        </div>
        <p className="mt-4 text-sm font-semibold tracking-wide text-slate-400">
          Verifying security credentials...
        </p>
      </div>
    );
  }

  // Redirecting state if unauthenticated
  if (!isAuthenticated || !user) {
    return null;
  }

  // Role validation check
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    const isBuyerPage = allowedRoles.includes('buyer');
    const redirectTarget = isBuyerPage ? '/admin/dashboard' : '/buyer/dashboard';

    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6 text-white">
        <div className="max-w-md w-full p-8 rounded-3xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl text-center shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-5">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black tracking-tight mb-2">403 — Access Denied</h2>
          <p className="text-slate-400 text-sm mb-6 leading-relaxed">
            Your current account role <span className="text-indigo-400 font-mono font-bold">[{user.role}]</span> does not have authorization to view this protected area.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => router.push(redirectTarget)}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Go to Your Portal
            </button>
            <button
              onClick={() => logout()}
              className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm transition-all flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" /> Sign In as Different User
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
