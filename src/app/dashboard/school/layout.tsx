'use client';

import { ReactNode } from 'react';
import { ProtectedSchoolRoute } from '@/components/permissions/ProtectedSchoolRoute';
import { SchoolBillingShell } from '@/components/billing/SchoolBillingShell';
import { StaffDashboardShell } from '@/components/layout/StaffDashboardShell';
import { useDashboardBodyClass } from '@/hooks/useDashboardBodyClass';
import { DASHBOARD_BODY_CLASSES } from '@/lib/constants/dashboard-theme';

/**
 * Layout for school admin pages
 * Applies permission-based route protection to all school admin routes
 */
export default function SchoolAdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  useDashboardBodyClass(DASHBOARD_BODY_CLASSES.staff);

  return (
    <ProtectedSchoolRoute>
      <StaffDashboardShell header={<SchoolBillingShell />}>
        {children}
      </StaffDashboardShell>
    </ProtectedSchoolRoute>
  );
}
