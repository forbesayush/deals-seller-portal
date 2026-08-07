// components/IdleTimeoutWarning.tsx — FR-07: Premium idle session warning modal
import React, { useEffect } from 'react';
import { Clock, LogOut, RefreshCw, ShieldAlert } from 'lucide-react';
import { useIdleTimeout } from '@/hooks/useIdleTimeout';
import { useAuth } from '@/hooks/useAuth';

interface IdleTimeoutWarningProps {
  /** Only mount / activate when user is authenticated */
  enabled?: boolean;
}

export function IdleTimeoutWarning({ enabled = true }: IdleTimeoutWarningProps) {
  const { user } = useAuth();
  const isActive = enabled && !!user;

  const { showWarning, secondsLeft, resetTimer, logoutNow } = useIdleTimeout({
    enabled: isActive,
  });

  // Lock body scroll when warning is shown
  useEffect(() => {
    if (showWarning) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [showWarning]);

  if (!isActive || !showWarning) return null;

  const progress = (secondsLeft / 60) * 100;
  const isUrgent = secondsLeft <= 20;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
      aria-modal="true"
      role="alertdialog"
      aria-labelledby="idle-warning-title"
    >
      <div
        className="relative w-full max-w-sm rounded-3xl p-8 overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, #0f1117 0%, #1a1030 100%)',
          border: '1px solid rgba(124,58,237,0.3)',
          boxShadow: '0 0 60px rgba(124,58,237,0.15), 0 25px 50px rgba(0,0,0,0.5)',
          animation: 'scaleIn 0.25s cubic-bezier(0.175,0.885,0.32,1.275)',
        }}
      >
        {/* Animated ambient orb */}
        <div
          className="absolute -top-16 -right-16 w-48 h-48 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #7c3aed, transparent)', filter: 'blur(40px)' }}
        />

        {/* Icon */}
        <div className="flex items-center justify-center mb-5">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center relative"
            style={{ background: isUrgent ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)', border: `1.5px solid ${isUrgent ? 'rgba(239,68,68,0.4)' : 'rgba(245,158,11,0.4)'}` }}
          >
            <ShieldAlert
              className="w-8 h-8"
              style={{ color: isUrgent ? '#ef4444' : '#f59e0b' }}
            />
            {/* Pulse ring */}
            <div
              className="absolute inset-0 rounded-2xl animate-ping opacity-30"
              style={{ background: isUrgent ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)' }}
            />
          </div>
        </div>

        {/* Title */}
        <h2
          id="idle-warning-title"
          className="text-center font-extrabold text-xl text-white mb-2"
        >
          Session Expiring Soon
        </h2>
        <p className="text-center text-sm mb-6" style={{ color: '#94a3b8' }}>
          You've been inactive. For your security, you'll be automatically signed out.
        </p>

        {/* Countdown display */}
        <div className="flex flex-col items-center mb-6">
          {/* Circular progress */}
          <div className="relative w-24 h-24 mb-3">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50" cy="50" r="40"
                fill="none" stroke="rgba(255,255,255,0.08)"
                strokeWidth="8"
              />
              <circle
                cx="50" cy="50" r="40"
                fill="none"
                stroke={isUrgent ? '#ef4444' : '#f59e0b'}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 40}`}
                strokeDashoffset={`${2 * Math.PI * 40 * (1 - progress / 100)}`}
                style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s ease' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span
                className="text-2xl font-black tabular-nums"
                style={{ color: isUrgent ? '#ef4444' : '#f59e0b' }}
              >
                {secondsLeft}
              </span>
              <span className="text-[10px] font-bold uppercase" style={{ color: '#64748b' }}>
                seconds
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" style={{ color: '#64748b' }} />
            <span className="text-xs font-semibold" style={{ color: '#64748b' }}>
              Signing out automatically…
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={resetTimer}
            className="w-full py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all hover:brightness-110 active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #7c3aed, #3b82f6)',
              boxShadow: '0 0 20px rgba(124,58,237,0.3)',
            }}
          >
            <RefreshCw className="w-4 h-4" />
            Stay Signed In
          </button>
          <button
            onClick={logoutNow}
            className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all hover:bg-rose-500/10 active:scale-95"
            style={{ color: '#f87171', border: '1px solid rgba(248,113,113,0.3)' }}
          >
            <LogOut className="w-4 h-4" />
            Sign Out Now
          </button>
        </div>

        <style jsx>{`
          @keyframes scaleIn {
            from { transform: scale(0.85); opacity: 0; }
            to   { transform: scale(1);    opacity: 1; }
          }
        `}</style>
      </div>
    </div>
  );
}
