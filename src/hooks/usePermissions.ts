'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store/store';
import {
  useGetMySchoolQuery,
  useGetMyPermissionsQuery,
  PermissionResource,
  PermissionType,
  Permission,
} from '@/lib/store/api/schoolAdminApi';
import { hasPrincipalAccess, isPrincipalRole } from '@/lib/constants/roles';

export { PermissionResource, PermissionType };
export { isPrincipalRole };

/**
 * Backstop only. A failed request reports itself, so this needs to sit well
 * clear of the request timeout and its retry — otherwise a merely slow school
 * is told its access is broken while the answer is still on the way.
 */
const ACCESS_SETTLE_TIMEOUT_MS = 40000;

/**
 * Hook to get the current admin's permissions and check access
 * 
 * Usage:
 * ```tsx
 * const { hasPermission, hasReadAccess, canView, canEdit, isLoading } = useCurrentAdminPermissions();
 * 
 * // Check specific permission
 * if (hasPermission(PermissionResource.STUDENTS, PermissionType.WRITE)) { ... }
 * 
 * // Shorthand for READ access (screen visibility)
 * if (canView(PermissionResource.STUDENTS)) { ... }
 * 
 * // Shorthand for WRITE access (edit/create/delete)
 * if (canEdit(PermissionResource.STUDENTS)) { ... }
 * ```
 */
export function useCurrentAdminPermissions() {
  const auth = useSelector((state: RootState) => state.auth);
  const user = auth.user;

  // Get school info (includes current admin's role)
  const {
    data: schoolResponse,
    isLoading: isLoadingSchool,
    refetch: refetchSchool,
  } = useGetMySchoolQuery(undefined, {
    skip: user?.role !== 'SCHOOL_ADMIN',
  });

  // School id from getMySchool, with JWT as bootstrap so /permissions/me can
  // fire before (or if) the school payload arrives. Role bypass still comes
  // from getMySchool.currentAdmin, not JWT.
  const schoolId = schoolResponse?.data?.id || user?.schoolId || undefined;
  const isSchoolAdmin = user?.role === 'SCHOOL_ADMIN';

  // Principal bypass comes from getMySchool.currentAdmin when it is known.
  // Until then the tier on the session is an optimistic hint, so owners are not
  // stuck on Loading access while the school payload is still in flight.
  // Both read the stored tier — never the job title.
  const currentAdmin = schoolResponse?.data?.currentAdmin;
  const isPrincipalEarly = useMemo(() => {
    if (currentAdmin) return hasPrincipalAccess(currentAdmin);
    return user?.adminAccessTier === 'PRINCIPAL';
  }, [currentAdmin, user?.adminAccessTier]);

  const skipMyPermissions = !schoolId || !isSchoolAdmin || isPrincipalEarly;

  // Get current admin's own permissions (uses /permissions/me endpoint - no STAFF:READ required)
  // Skip for Principals - they have permanent full access
  const {
    data: permissionsResponse,
    isLoading: isLoadingPermissions,
    isFetching,
    isSuccess: isPermissionsSuccess,
    isError: isPermissionsError,
    refetch: refetchPermissions,
  } = useGetMyPermissionsQuery(
    { schoolId: schoolId! },
    { skip: skipMyPermissions }
  );

  const permissions = permissionsResponse?.data?.permissions || [];
  const adminRole = permissionsResponse?.data?.role || currentAdmin?.role || '';

  // Final Principal check (from either source), always by tier
  const isPrincipal = useMemo(() => {
    if (isPrincipalEarly) return true;
    return hasPrincipalAccess(permissionsResponse?.data);
  }, [isPrincipalEarly, permissionsResponse?.data]);

  /**
   * Check if admin has a specific permission
   * Principals automatically have ALL permissions (permanent, uneditable)
   */
  const hasPermission = useMemo(() => {
    return (resource: PermissionResource, type: PermissionType): boolean => {
      // Principals have permanent full access to everything
      if (isPrincipal) return true;

      const hasAdmin = permissions.some(
        (p: Permission) => p.resource === resource && p.type === PermissionType.ADMIN
      );
      if (hasAdmin) return true;

      if (type === PermissionType.READ) {
        return permissions.some(
          (p: Permission) =>
            p.resource === resource &&
            (p.type === PermissionType.READ ||
              p.type === PermissionType.WRITE ||
              p.type === PermissionType.ADMIN)
        );
      }

      if (type === PermissionType.WRITE) {
        return permissions.some(
          (p: Permission) =>
            p.resource === resource &&
            (p.type === PermissionType.WRITE || p.type === PermissionType.ADMIN)
        );
      }

      return permissions.some(
        (p: Permission) => p.resource === resource && p.type === type
      );
    };
  }, [permissions, isPrincipal]);

  /**
   * Check if admin has READ access to a resource (for viewing screens)
   */
  const hasReadAccess = useMemo(() => {
    return (resource: PermissionResource): boolean => {
      return hasPermission(resource, PermissionType.READ);
    };
  }, [hasPermission]);

  /**
   * Check if admin has WRITE access to a resource (for creating/editing)
   */
  const hasWriteAccess = useMemo(() => {
    return (resource: PermissionResource): boolean => {
      return hasPermission(resource, PermissionType.WRITE);
    };
  }, [hasPermission]);

  /**
   * Check if admin has ADMIN access to a resource (full control)
   */
  const hasAdminAccess = useMemo(() => {
    return (resource: PermissionResource): boolean => {
      if (isPrincipal) return true;
      return permissions.some(
        (p: Permission) => p.resource === resource && p.type === PermissionType.ADMIN
      );
    };
  }, [permissions, isPrincipal]);

  // Aliases for cleaner API
  const canView = hasReadAccess;
  const canEdit = hasWriteAccess;
  const canManage = hasAdminAccess;

  const isLoading = isLoadingSchool || isLoadingPermissions;

  // Principal: ready once school role is known. Staff: ready only once
  // /permissions/me has actually answered. A failed call means we do not know
  // this admin's access — it never means they were given none.
  const permissionsReady = useMemo(() => {
    if (!isSchoolAdmin) return true;
    if (isPrincipalEarly) return true;
    if (isLoadingSchool && !schoolId) return false;
    if (skipMyPermissions) return !isLoadingSchool;
    return isPermissionsSuccess;
  }, [
    isSchoolAdmin,
    isPrincipalEarly,
    isLoadingSchool,
    schoolId,
    skipMyPermissions,
    isPermissionsSuccess,
  ]);

  // Still waiting on the table that decides every screen for this admin.
  const isAwaitingPermissions = isSchoolAdmin && !permissionsReady && !isPermissionsError;

  const [settleExpired, setSettleExpired] = useState(false);

  useEffect(() => {
    if (!isAwaitingPermissions) {
      setSettleExpired(false);
      return;
    }
    const timer = setTimeout(() => setSettleExpired(true), ACCESS_SETTLE_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [isAwaitingPermissions]);

  // Either the call failed or it never came back. Both mean "unknown", and the
  // shell must say so rather than quietly draw an empty dashboard.
  const permissionsUnavailable = !permissionsReady && (isPermissionsError || settleExpired);

  const retryPermissions = useCallback(() => {
    setSettleExpired(false);
    if (isSchoolAdmin) refetchSchool();
    if (!skipMyPermissions) refetchPermissions();
  }, [isSchoolAdmin, skipMyPermissions, refetchSchool, refetchPermissions]);

  return {
    // Permission check functions
    hasPermission,
    hasReadAccess,
    hasWriteAccess,
    hasAdminAccess,
    // Aliases
    canView,
    canEdit,
    canManage,
    // State
    permissions,
    isPrincipal, // Principals have permanent full access (uneditable)
    isLoading,
    isFetching,
    permissionsReady,
    /** The table never arrived. Not "no access" — unknown access. */
    permissionsUnavailable,
    retryPermissions,
    // Context
    schoolId,
    /** Display title only. For authority use `isPrincipal` / `accessTier`. */
    adminRole,
    accessTier: isPrincipal ? ('PRINCIPAL' as const) : ('STAFF' as const),
  };
}

/**
 * Map of routes to their required permissions
 * Used for protecting routes and sidebar items
 */
export const ROUTE_PERMISSIONS: Record<string, { resource: PermissionResource; type: PermissionType }> = {
  '/dashboard/school/overview': { resource: PermissionResource.OVERVIEW, type: PermissionType.READ },

  // Analytics
  '/dashboard/school/analytics': { resource: PermissionResource.ANALYTICS, type: PermissionType.READ },

  // Students
  '/dashboard/school/students': { resource: PermissionResource.STUDENTS, type: PermissionType.READ },
  '/dashboard/school/students/add': { resource: PermissionResource.STUDENTS, type: PermissionType.WRITE },

  // Staff
  '/dashboard/school/staff': { resource: PermissionResource.STAFF, type: PermissionType.READ },
  '/dashboard/school/staff/add': { resource: PermissionResource.STAFF, type: PermissionType.WRITE },

  // Classes (and related variations based on school type)
  '/dashboard/school/classes': { resource: PermissionResource.CLASSES, type: PermissionType.READ },
  '/dashboard/school/courses': { resource: PermissionResource.CLASSES, type: PermissionType.READ },
  '/dashboard/school/faculties': { resource: PermissionResource.CLASSES, type: PermissionType.READ },
  '/dashboard/school/departments': { resource: PermissionResource.CLASSES, type: PermissionType.READ },

  // Subjects
  '/dashboard/school/subjects': { resource: PermissionResource.SUBJECTS, type: PermissionType.READ },

  // Timetables
  '/dashboard/school/timetables': { resource: PermissionResource.TIMETABLES, type: PermissionType.READ },
  '/dashboard/school/exam-timetables': { resource: PermissionResource.TIMETABLES, type: PermissionType.READ }, // redirects to timetables?tab=exam
  '/dashboard/school/timetable': { resource: PermissionResource.TIMETABLES, type: PermissionType.READ },

  // Calendar
  '/dashboard/school/calendar': { resource: PermissionResource.CALENDAR, type: PermissionType.READ },

  // Sessions
  '/dashboard/school/session': { resource: PermissionResource.SESSIONS, type: PermissionType.READ },

  // Admissions
  '/dashboard/school/admission': { resource: PermissionResource.ADMISSIONS, type: PermissionType.READ },
  '/dashboard/school/applications': { resource: PermissionResource.ADMISSIONS, type: PermissionType.READ },

  // Subscriptions
  '/dashboard/school/subscription': { resource: PermissionResource.SUBSCRIPTIONS, type: PermissionType.READ },

  // Events
  '/dashboard/school/events': { resource: PermissionResource.EVENTS, type: PermissionType.READ },

  // Grades (new)
  '/dashboard/school/grades': { resource: PermissionResource.GRADES, type: PermissionType.READ },

  // Curriculum (new)
  '/dashboard/school/curriculum': { resource: PermissionResource.CURRICULUM, type: PermissionType.READ },

  // Transfers (new)
  '/dashboard/school/transfers': { resource: PermissionResource.TRANSFERS, type: PermissionType.READ },

  // Settings
  '/dashboard/school/settings/profile': { resource: PermissionResource.SETTINGS, type: PermissionType.READ },
  '/dashboard/school/settings/session': { resource: PermissionResource.SETTINGS, type: PermissionType.READ },

  // Personal / adjacent screens
  '/dashboard/school/notifications': { resource: PermissionResource.OVERVIEW, type: PermissionType.READ },
  '/dashboard/school/levels': { resource: PermissionResource.CLASSES, type: PermissionType.READ },
  '/dashboard/school/marketplace': { resource: PermissionResource.INTEGRATIONS, type: PermissionType.READ },
  '/dashboard/school/reactivate': { resource: PermissionResource.SETTINGS, type: PermissionType.READ },
  '/dashboard/school/subscription/callback': { resource: PermissionResource.SUBSCRIPTIONS, type: PermissionType.READ },
  '/dashboard/school/subscription/downgrade': { resource: PermissionResource.SUBSCRIPTIONS, type: PermissionType.READ },
};

/**
 * Get the required permission for a given route
 */
export function getRoutePermission(pathname: string): { resource: PermissionResource; type: PermissionType } | null {
  // School index redirects to the first permitted page once the table is known
  if (pathname === '/dashboard/school' || pathname === '/dashboard/school/') {
    return null;
  }

  // Check for exact match first
  if (ROUTE_PERMISSIONS[pathname]) {
    return ROUTE_PERMISSIONS[pathname];
  }

  // Check for prefix matches (for dynamic routes)
  // Sort by length descending to ensure deeper routes (e.g. /students/add) match before shallow ones (/students)
  const sortedRoutes = Object.entries(ROUTE_PERMISSIONS).sort((a, b) => b[0].length - a[0].length);
  for (const [route, permission] of sortedRoutes) {
    if (pathname.startsWith(route)) {
      return permission;
    }
  }

  // Unknown school routes: deny for staff (principals still bypass the guard).
  if (pathname.startsWith('/dashboard/school')) {
    return { resource: PermissionResource.OVERVIEW, type: PermissionType.ADMIN };
  }

  return null;
}

