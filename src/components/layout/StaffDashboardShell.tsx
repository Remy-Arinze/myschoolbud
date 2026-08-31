'use client';

import { ReactNode } from 'react';
import { DASHBOARD_CONTENT_CLASS } from '@/lib/constants/dashboard-theme';
import { cn } from '@/lib/utils';

interface StaffDashboardShellProps {
  children: ReactNode;
  /** Optional billing banner or other top-of-page chrome */
  header?: ReactNode;
  className?: string;
}

/** Shared page shell for teacher and school admin dashboards */
export function StaffDashboardShell({ children, header, className }: StaffDashboardShellProps) {
  return (
    <div className={cn('relative min-h-[calc(100vh-80px)] w-full', className)}>
      <div className={cn('relative z-10 w-full h-full', DASHBOARD_CONTENT_CLASS)}>
        {header}
        {children}
      </div>
    </div>
  );
}
