// hooks/useIdleTimeout.ts — FR-07: Auto-logout after 15 minutes of inactivity
import { useEffect, useRef, useState, useCallback } from 'react';

const IDLE_TIMEOUT_MS = 15 * 60 * 1000;  // 15 minutes
const WARNING_BEFORE_MS = 60 * 1000;      // Show warning 1 minute before logout

interface UseIdleTimeoutOptions {
  enabled?: boolean;
  onLogout?: () => void | Promise<void>;
}

interface IdleTimeoutState {
  showWarning: boolean;
  secondsLeft: number;
  resetTimer: () => void;
  logoutNow: () => void;
}

export function useIdleTimeout({ enabled = true, onLogout }: UseIdleTimeoutOptions = {}): IdleTimeoutState {
  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(60);

  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearAllTimers = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
  }, []);

  const performLogout = useCallback(async () => {
    clearAllTimers();
    setShowWarning(false);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch { /* silent */ }
    if (typeof window !== 'undefined') {
      localStorage.removeItem('ds_jwt_token');
      sessionStorage.removeItem('ds_session_user_id');
      window.location.href = '/login?loggedOut=1&reason=idle';
    }
    onLogout?.();
  }, [clearAllTimers, onLogout]);

  const startWarningCountdown = useCallback(() => {
    setShowWarning(true);
    setSecondsLeft(60);

    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          performLogout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [performLogout]);

  const resetTimer = useCallback(() => {
    if (!enabled) return;
    clearAllTimers();
    setShowWarning(false);
    setSecondsLeft(60);

    // Show warning 1 minute before timeout
    warningTimerRef.current = setTimeout(() => {
      startWarningCountdown();
    }, IDLE_TIMEOUT_MS - WARNING_BEFORE_MS);

    // Hard logout after full timeout (safety net)
    idleTimerRef.current = setTimeout(() => {
      performLogout();
    }, IDLE_TIMEOUT_MS);
  }, [enabled, clearAllTimers, startWarningCountdown, performLogout]);

  // Attach activity listeners
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];

    const handleActivity = () => {
      if (!showWarning) {
        resetTimer();
      }
    };

    events.forEach(event => window.addEventListener(event, handleActivity, { passive: true }));
    resetTimer(); // Start the timer on mount

    return () => {
      events.forEach(event => window.removeEventListener(event, handleActivity));
      clearAllTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, showWarning]);

  const logoutNow = useCallback(() => {
    performLogout();
  }, [performLogout]);

  return { showWarning, secondsLeft, resetTimer, logoutNow };
}
