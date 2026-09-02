'use client';

import React, { useState, useEffect, lazy, Suspense } from 'react';
import { FloatingAiCta } from './FloatingAiCta';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store/store';
import { useParams, usePathname } from 'next/navigation';
import { useSubscription } from '@/hooks/useSubscription';
import { useLoisWorkspaceOptional } from './LoisWorkspace';

const AiChatDrawer = lazy(() =>
  import('./AiChatDrawer').then((mod) => ({ default: mod.AiChatDrawer }))
);

function TeacherReadinessGate({ children }: { children: (ready: boolean) => React.ReactNode }) {
  const { useTeacherDashboard } = require('@/hooks/useTeacherDashboard');
  const { isReady } = useTeacherDashboard();
  return <>{children(isReady)}</>;
}

export const GlobalAiAssistant: React.FC = () => {
  const [isHydrated, setIsHydrated] = useState(false);
  const workspace = useLoisWorkspaceOptional();

  const user = useSelector((state: RootState) => state.auth.user);
  const tenantId = useSelector((state: RootState) => state.auth.tenantId);
  const params = useParams();
  const pathname = usePathname();
  const schoolId = (params?.schoolId as string) || (params?.id as string) || tenantId || user?.schoolId;

  const { summary, isLoading: isLoadingSub } = useSubscription();

  const isSchoolAdmin = user?.role === 'SCHOOL_ADMIN' || (user as any)?.roleRank === 'PRINCIPAL';
  const isAuthorized =
    isSchoolAdmin ||
    user?.role === 'SUPER_ADMIN' ||
    user?.role === 'TEACHER';

  const isFullscreenLois = pathname?.includes('/plugins/agora-ai');
  const isHiddenPage = isSchoolAdmin
    ? isFullscreenLois
    : pathname?.includes('/assessments/new') ||
      pathname?.includes('/assessments/edit') ||
      (pathname?.includes('/assessments/') && pathname.split('/').length > 4) ||
      isFullscreenLois ||
      pathname?.includes('/timetables') ||
      pathname?.includes('/settings') ||
      pathname?.includes('/calendar');

  const isOpen = workspace ? workspace.isOpen : false;
  const [localOpen, setLocalOpen] = useState(false);
  const panelOpen = workspace ? isOpen : localOpen;
  const setPanelOpen = (open: boolean) => {
    if (workspace) workspace.setOpen(open);
    else setLocalOpen(open);
  };

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  if (!isHydrated) return null;
  if (!isAuthorized || !user || !schoolId || isHiddenPage) return null;

  const hasAiAccess = !summary ? true : (summary?.tools?.find(t => t.slug === 'agora-ai')?.hasAccess ?? true);
  if (isLoadingSub) return null;
  if (!hasAiAccess) return null;

  const renderAssistant = (dataReady: boolean) => {
    if (!dataReady) return null;
    return (
      <>
        {!panelOpen && (
          <FloatingAiCta
            onClick={() => setPanelOpen(true)}
            schoolId={isSchoolAdmin ? schoolId : undefined}
          />
        )}
        {panelOpen && (
          <Suspense fallback={null}>
            <AiChatDrawer
              schoolId={schoolId}
              isOpen={panelOpen}
              onClose={() => setPanelOpen(false)}
              docked={isSchoolAdmin}
              pageContext={workspace?.focus}
            />
          </Suspense>
        )}
      </>
    );
  };

  if (user.role === 'TEACHER') {
    return <TeacherReadinessGate>{renderAssistant}</TeacherReadinessGate>;
  }

  return <>{renderAssistant(true)}</>;
};
