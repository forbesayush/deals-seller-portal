// core/ClientApp.tsx — Client-only application shell
// This file is dynamically imported with ssr:false to prevent SSR prerender failures
// from browser-only hooks (zustand, React Query, localStorage)
import React, { useEffect } from 'react';
import type { AppProps } from 'next/app';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';

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

function AppInner({ Component, pageProps }: AppProps) {
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

  return <Component {...pageProps} />;
}

export function ClientApp(props: AppProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <AppInner {...props} />
    </QueryClientProvider>
  );
}
