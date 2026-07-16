import type { AppProps } from 'next/app';
import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import '@/styles/globals.css';

// Import client-side API mock interceptor for zero-dependency Netlify deployment
if (typeof window !== 'undefined') {
  require('@/utils/mockApi');
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
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
    </QueryClientProvider>
  );
}
