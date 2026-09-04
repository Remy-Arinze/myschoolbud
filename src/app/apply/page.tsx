'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { usePortal } from '@/components/portal/PortalProvider';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

function ApplyRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { branding, isLoading, isPortalHost } = usePortal();
  const qid = searchParams?.get('schoolId');

  useEffect(() => {
    if (isLoading) return;
    const id = branding?.schoolId || qid;
    if (id) {
      router.replace(`/admission/${id}`);
      return;
    }
    if (!isPortalHost) {
      router.replace('/');
    }
  }, [branding, isLoading, isPortalHost, qid, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <LoadingSpinner />
    </div>
  );
}

export default function ApplyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><LoadingSpinner /></div>}>
      <ApplyRedirect />
    </Suspense>
  );
}
