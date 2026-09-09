'use client';

import { Suspense, useEffect, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useSelector } from 'react-redux';
import type { RootState } from '@/lib/store/store';
import { useLoisWorkspaceOptional } from './LoisWorkspace';

function stripInsightParam(pathname: string, searchParams: URLSearchParams) {
  const next = new URLSearchParams(searchParams.toString());
  next.delete('loisInsight');
  const qs = next.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

function LoisInsightDeepLinkInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const insightId = searchParams.get('loisInsight');
  const workspace = useLoisWorkspaceOptional();
  const schoolId = useSelector(
    (state: RootState) => state.auth.tenantId || state.auth.user?.schoolId,
  );
  const opened = useRef<string | null>(null);

  useEffect(() => {
    if (!insightId) return;

    if (!schoolId) {
      router.replace(stripInsightParam(pathname, searchParams), { scroll: false });
      return;
    }
    if (opened.current === insightId) return;
    opened.current = insightId;

    workspace?.openBriefing(insightId);
    router.replace(stripInsightParam(pathname, searchParams), { scroll: false });
  }, [insightId, schoolId, workspace, router, pathname, searchParams]);

  return null;
}

export function LoisInsightDeepLink() {
  return (
    <Suspense fallback={null}>
      <LoisInsightDeepLinkInner />
    </Suspense>
  );
}
