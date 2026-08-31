'use client';

import React, { useState, useEffect, lazy, Suspense } from 'react';
import { FloatingAiCta } from './FloatingAiCta';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store/store';
import { useParams, usePathname } from 'next/navigation';
import { useSubscription } from '@/hooks/useSubscription';

// Dynamically import the heavy chat drawer to keep the dashboard layout chunk small
const AiChatDrawer = lazy(() =>
  import('./AiChatDrawer').then((mod) => ({ default: mod.AiChatDrawer }))
);

/**
 * Inner component that gates on teacher data readiness.
 * By isolating useTeacherDashboard here, the hook ONLY runs
 * when the user is actually a TEACHER — preventing 401s for
 * other roles and avoiding the cascading ChunkLoadError.
 */
function TeacherReadinessGate({ children }: { children: (ready: boolean) => React.ReactNode }) {
  // Lazy-require the hook so it's only evaluated when this component mounts
  const { useTeacherDashboard } = require('@/hooks/useTeacherDashboard');
  const { isReady } = useTeacherDashboard();
  return <>{children(isReady)}</>;
}

export const GlobalAiAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  
  const user = useSelector((state: RootState) => state.auth.user);
  const tenantId = useSelector((state: RootState) => state.auth.tenantId);
  const params = useParams();
  const pathname = usePathname();
  const schoolId = (params?.schoolId as string) || (params?.id as string) || tenantId || user?.schoolId;

  const { summary, isLoading: isLoadingSub } = useSubscription();
  
  // Define target roles for the floating assistant
  const isAuthorized = 
    user?.role === 'SCHOOL_ADMIN' || 
    user?.role === 'SUPER_ADMIN' ||
    user?.role === 'TEACHER' ||
    (user as any)?.roleRank === 'PRINCIPAL';

  // Hiding the assistant on specific "Heavy Focus" screens
  const isHiddenPage = 
    pathname?.includes('/assessments/new') || 
    pathname?.includes('/assessments/edit') ||
    (pathname?.includes('/assessments/') && pathname.split('/').length > 4) ||
    pathname?.includes('/plugins/agora-ai') ||
    pathname?.includes('/timetables') ||
    pathname?.includes('/settings') ||
    pathname?.includes('/calendar');

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  if (!isHydrated) return null;
  
  // Basic validation - if not authorized or on a hidden page, exit immediately
  if (!isAuthorized || !user || !schoolId || isHiddenPage) return null;

  // Verify the school actually has the AI tool in their subscription
  // For admins, we are more optimistic — we show the button if they are authorized
  // and handle the access check deeper to avoid "disappearing button" UX issues.
  const hasAiAccess = !summary ? true : (summary?.tools?.find(t => t.slug === 'agora-ai')?.hasAccess ?? true);
  
  // Only hide if we are CERTAIN they don't have access (after loading)
  if (isLoadingSub) return null; // Wait for subscription data
  if (!hasAiAccess) return null; // Hide if explicitly denied

  // For teachers, wrap in the readiness gate; for other roles, render immediately
  const renderAssistant = (dataReady: boolean) => {
    if (!dataReady) return null;
    return (
      <>
        <FloatingAiCta onClick={() => setIsOpen(true)} />
        {isOpen && (
          <Suspense fallback={null}>
            <AiChatDrawer
              schoolId={schoolId}
              isOpen={isOpen}
              onClose={() => setIsOpen(false)}
            />
          </Suspense>
        )}
      </>
    );
  };

  if (user.role === 'TEACHER') {
    return <TeacherReadinessGate>{renderAssistant}</TeacherReadinessGate>;
  }

  // Non-teacher authorized roles — no teacher data gate needed
  return <>{renderAssistant(true)}</>;
};
