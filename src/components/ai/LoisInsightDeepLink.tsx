'use client';

import { Suspense, useEffect, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useSelector } from 'react-redux';
import type { RootState } from '@/lib/store/store';
import { useGetLoisInsightQuery } from '@/lib/store/api/aiApi';
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

  const { data, isError, isFetching } = useGetLoisInsightQuery(
    { schoolId: schoolId || '', insightId: insightId || '' },
    { skip: !schoolId || !insightId },
  );

  useEffect(() => {
    if (!insightId) return;

    if (!schoolId || isError) {
      router.replace(stripInsightParam(pathname, searchParams), { scroll: false });
      return;
    }

    const prompt = data?.data?.askPrompt || (data?.data?.title ? `Explain this insight: ${data.data.title}` : null);
    if (!prompt || isFetching) return;
    if (opened.current === insightId) return;
    opened.current = insightId;

    workspace?.askLois(prompt);
    router.replace(stripInsightParam(pathname, searchParams), { scroll: false });
  }, [insightId, schoolId, data, isError, isFetching, workspace, router, pathname, searchParams]);

  return null;
}

export function LoisInsightDeepLink() {
  return (
    <Suspense fallback={null}>
      <LoisInsightDeepLinkInner />
    </Suspense>
  );
}
