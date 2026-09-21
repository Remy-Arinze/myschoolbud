'use client';

import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@/lib/store/store';
import { useCurrentAdminPermissions } from '@/hooks/usePermissions';
import { usePermissionFilteredSidebar } from '@/hooks/useSidebarConfig';
import { AccessUnavailable } from '@/components/permissions/PermissionGate';

/**
 * School index is not a fallback home. Once the permission table is known,
 * send the admin to the first screen they were actually granted.
 */
export default function SchoolDashboardIndex() {
  const user = useSelector((state: RootState) => state.auth.user);
  const { permissionsReady, permissionsUnavailable, retryPermissions } = useCurrentAdminPermissions();
  const { sections } = usePermissionFilteredSidebar();
  const redirected = useRef(false);

  useEffect(() => {
    if (redirected.current) return;
    if (user?.role !== 'SCHOOL_ADMIN' || !permissionsReady) return;
    const first = sections.flatMap((section) => section.items)[0]?.href;
    redirected.current = true;
    window.location.replace(first || '/dashboard/school/overview');
  }, [user?.role, permissionsReady, sections]);

  if (permissionsUnavailable) {
    return <AccessUnavailable onRetry={retryPermissions} />;
  }

  return (
    <div className="flex items-center justify-center min-h-[200px]">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 dark:border-blue-400" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Opening your pages...</p>
      </div>
    </div>
  );
}
