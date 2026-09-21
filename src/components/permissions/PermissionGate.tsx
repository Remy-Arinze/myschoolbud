'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { useCurrentAdminPermissions, PermissionResource, PermissionType } from '@/hooks/usePermissions';
import { usePermissionFilteredSidebar } from '@/hooks/useSidebarConfig';
import { resourceLabel, typeLabel } from '@/lib/constants/permission-metadata';

interface PermissionGateProps {
  /**
   * The resource to check permission for
   */
  resource: PermissionResource;

  /**
   * The type of permission required (default: READ)
   */
  type?: PermissionType;

  /**
   * Content to render if permission is granted
   */
  children: ReactNode;

  /**
   * Optional fallback to render if permission is denied
   * If not provided, nothing is rendered
   */
  fallback?: ReactNode;

  /**
   * If true, shows a loading skeleton while permissions are being fetched
   */
  showLoading?: boolean;
}

/**
 * Component that conditionally renders children based on user permissions
 * 
 * Usage:
 * ```tsx
 * <PermissionGate resource={PermissionResource.STUDENTS} type={PermissionType.WRITE}>
 *   <Button>Add Student</Button>
 * </PermissionGate>
 * 
 * // With fallback
 * <PermissionGate 
 *   resource={PermissionResource.STAFF} 
 *   fallback={<p>You don't have access to this section</p>}
 * >
 *   <StaffList />
 * </PermissionGate>
 * ```
 */
export function PermissionGate({
  resource,
  type = PermissionType.READ,
  children,
  fallback = null,
  showLoading = false,
}: PermissionGateProps) {
  const { hasPermission, permissionsReady } = useCurrentAdminPermissions();

  if (!permissionsReady && showLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
      </div>
    );
  }

  if (!permissionsReady) {
    // Hide write/gated controls until the table is known — do not flash them
    return null;
  }

  if (hasPermission(resource, type)) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}

/**
 * Higher-order component version for wrapping entire pages
 */
export function withPermission<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  resource: PermissionResource,
  type: PermissionType = PermissionType.READ,
  FallbackComponent?: React.ComponentType
) {
  return function PermissionProtectedComponent(props: P) {
    const { hasPermission, permissionsReady } = useCurrentAdminPermissions();

    if (!permissionsReady) {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
        </div>
      );
    }

    if (!hasPermission(resource, type)) {
      if (FallbackComponent) {
        return <FallbackComponent />;
      }
      return <AccessDenied resource={resource} type={type} />;
    }

    return <WrappedComponent {...props} />;
  };
}

/**
 * Default access denied component.
 *
 * Worded the way Lois words the same refusal — "You need Students (read) access
 * to look up student records" — so the admin learns what to ask for and who to
 * ask, instead of being told only that they cannot be here.
 */
function AccessDenied({
  resource,
  type = PermissionType.READ,
}: {
  resource: PermissionResource;
  type?: PermissionType;
}) {
  const { sections } = usePermissionFilteredSidebar();
  const homeHref =
    sections.flatMap((section) => section.items)[0]?.href || '/dashboard/school';

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center px-4">
      <h2 className="font-heading text-xl font-semibold text-gray-900 dark:text-white mb-2">
        You need {resourceLabel(resource)} access
      </h2>
      <p className="text-gray-600 dark:text-gray-400 max-w-md mb-6">
        This page needs{' '}
        <span className="font-medium">
          {resourceLabel(resource)} ({typeLabel(type).toLowerCase()})
        </span>{' '}
        access, which your school hasn&apos;t given you. Anyone with principal-level
        access can add it from your profile on the Staff page.
      </p>
      <Link
        href={homeHref}
        className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white transition-colors border border-transparent rounded-lg bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        Go to a page you can use
      </Link>
    </div>
  );
}

/**
 * Shown when the permission table could not be loaded. This is not a denial —
 * the admin's access is simply unknown, so we ask rather than assume.
 */
function AccessUnavailable({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center px-4">
      <h2 className="font-heading text-xl font-semibold text-gray-900 dark:text-white mb-2">
        We couldn&apos;t load your access
      </h2>
      <p className="text-gray-600 dark:text-gray-400 max-w-md mb-6">
        Your pages are decided by the access your school gave you, and that list didn&apos;t load.
        Try again — nothing about your account has changed.
      </p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white transition-colors border border-transparent rounded-lg bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}

export { AccessDenied, AccessUnavailable };

