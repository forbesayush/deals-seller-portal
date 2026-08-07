import type { AppProps } from 'next/app';
import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { IdleTimeoutWarning } from '@/components/IdleTimeoutWarning';
import '@/styles/globals.css';

// Import client-side API JWT header interceptor for cloud MongoDB backend sync
if (typeof window !== 'undefined') {
  require('@/utils/apiClient');
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 30 * 1000,      // 30 seconds stale time (prevents query spam during high traffic)
      gcTime: 5 * 60 * 1000,     // Keep in cache for 5 minutes
      retry: 2,                  // Exponential backoff retry logic
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

export default function App({ Component, pageProps }: AppProps) {
  const checkAuth = useAuth((state) => state.checkAuth);

  useEffect(() => {
    // Run authentication verify on startup
    checkAuth();

    // Manage dark mode classes
    const savedTheme = localStorage.getItem('theme') || 'light';
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [checkAuth]);

  return (
    <QueryClientProvider client={queryClient}>
      <Component {...pageProps} />
      {/* FR-07: Global idle auto-logout warning — active for all authenticated pages */}
      <IdleTimeoutWarning />
    </QueryClientProvider>
  );
}
