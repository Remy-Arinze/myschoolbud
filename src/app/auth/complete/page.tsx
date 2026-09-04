'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDispatch } from 'react-redux';
import { setCredentials } from '@/lib/store/slices/authSlice';
import { postLoginPath } from '@/lib/auth/postLoginPath';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function CompleteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useDispatch();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams?.get('code');
    if (!code) {
      setError('This sign-in link is missing. Please log in again.');
      return;
    }

    (async () => {
      try {
        const response = await fetch(`${API}/auth/exchange-portal-code`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ code }),
        });
        const data = await response.json();
        if (!response.ok || !data.success || !data.data?.accessToken) {
          throw new Error(data.message || 'This sign-in link has expired. Please log in again.');
        }
        dispatch(
          setCredentials({
            accessToken: data.data.accessToken,
            refreshToken: data.data.refreshToken,
            user: data.data.user,
            tenantId: data.data.user.tenantId,
          }),
        );
        if (data.data.user.schoolId) {
          localStorage.setItem('currentSchoolId', data.data.user.schoolId);
        }
        if (data.data.user.tenantId) {
          localStorage.setItem('tenantId', data.data.user.tenantId);
        }
        router.replace(postLoginPath(data.data.user));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Sign-in failed');
      }
    })();
  }, [dispatch, router, searchParams]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center space-y-3">
          <p className="text-[var(--light-text-primary)] dark:text-[var(--dark-text-primary)]">{error}</p>
          <a href="/auth/login" className="text-[#2490FD] hover:underline">
            Back to login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <LoadingSpinner />
    </div>
  );
}

export default function AuthCompletePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><LoadingSpinner /></div>}>
      <CompleteContent />
    </Suspense>
  );
}
