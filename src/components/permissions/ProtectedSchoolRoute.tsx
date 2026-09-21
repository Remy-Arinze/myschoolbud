'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store/store';
import { useCurrentAdminPermissions, getRoutePermission, PermissionResource, PermissionType } from '@/hooks/usePermissions';
import { AccessDenied, AccessUnavailable } from './PermissionGate';

interface ProtectedSchoolRouteProps {
  children: ReactNode;
  /**
   * Override the automatic route-based permission detection
   */
  resource?: PermissionResource;
}

/**
 * Wrapper component for school admin routes that enforces permissions
 * 
 * Usage:
 * ```tsx
 * // In a layout or page component
 * export default function StudentsPage() {
 *   return (
 *     <ProtectedSchoolRoute>
 *       <StudentsList />
 *     </ProtectedSchoolRoute>
 *   );
 * }
 * 
 * // Or with explicit resource
 * <ProtectedSchoolRoute resource={PermissionResource.STUDENTS}>
 *   <StudentsList />
 * </ProtectedSchoolRoute>
 * ```
 */
export function ProtectedSchoolRoute({ children, resource }: ProtectedSchoolRouteProps) {
  const pathname = usePathname();
  const user = useSelector((state: RootState) => state.auth.user);
  const {
    hasPermission,
    permissionsReady,
    permissionsUnavailable,
    retryPermissions,
    isPrincipal,
  } = useCurrentAdminPermissions();

  const isSchoolAdmin = user?.role === 'SCHOOL_ADMIN';

  const routePermission = resource
    ? { resource, type: PermissionType.READ }
    : getRoutePermission(pathname);

  // Non-school admins get through without permission checks
  if (!isSchoolAdmin) {
    return <>{children}</>;
  }

  // School index has no mapped permission — it redirects after the table is known
  if (!routePermission) {
    return <>{children}</>;
  }

  // Principals have permanent full access (uneditable)
  if (isPrincipal) {
    return <>{children}</>;
  }

  // The table never arrived. Say so instead of spinning — and do not guess either way.
  if (permissionsUnavailable) {
    return <AccessUnavailable onRetry={retryPermissions} />;
  }

  // Wait until the permission table is known, then open or Access Denied
  if (!permissionsReady) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 dark:border-blue-400"></div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Loading access...
          </p>
        </div>
      </div>
    );
  }

  if (!hasPermission(routePermission.resource, routePermission.type)) {
    return <AccessDenied resource={routePermission.resource} type={routePermission.type} />;
  }

  return <>{children}</>;
}

/**
 * HOC version for wrapping page components
 */
export function withSchoolRouteProtection<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  resource?: PermissionResource
) {
  return function ProtectedPage(props: P) {
    return (
      <ProtectedSchoolRoute resource={resource}>
        <WrappedComponent {...props} />
      </ProtectedSchoolRoute>
    );
  };
}
