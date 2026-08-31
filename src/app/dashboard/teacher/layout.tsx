'use client';

import { ReactNode } from 'react';
import { TeacherBillingStrip } from '@/components/billing/TeacherBillingStrip';
import { StaffDashboardShell } from '@/components/layout/StaffDashboardShell';
import { useDashboardBodyClass } from '@/hooks/useDashboardBodyClass';
import { DASHBOARD_BODY_CLASSES } from '@/lib/constants/dashboard-theme';

export default function TeacherDashboardLayout({ children }: { children: ReactNode }) {
    useDashboardBodyClass(DASHBOARD_BODY_CLASSES.staff);

    return (
        <StaffDashboardShell header={<TeacherBillingStrip />}>
            {children}
        </StaffDashboardShell>
    );
}
