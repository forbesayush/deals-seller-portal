import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks/useAuth';

export default function Home() {
  const router = useRouter();
  const { user, isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (isAuthenticated && user) {
        if (user.role === 'admin' || user.role === 'manager' || user.role === 'auditor') {
          router.replace('/admin/dashboard');
        } else {
          router.replace('/buyer/dashboard');
        }
      } else {
        router.replace('/login');
      }
    }
  }, [isAuthenticated, user, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="animate-pulse text-sm text-slate-500 font-medium">
        Redirecting...
      </div>
    </div>
  );
}
