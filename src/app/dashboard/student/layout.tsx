'use client';

import { ReactNode } from 'react';
import { useDashboardBodyClass } from '@/hooks/useDashboardBodyClass';
import { DASHBOARD_BODY_CLASSES } from '@/lib/constants/dashboard-theme';

export default function StudentDashboardLayout({ children }: { children: ReactNode }) {
    useDashboardBodyClass(DASHBOARD_BODY_CLASSES.student);

    return (
        <div className="relative min-h-[calc(100vh-80px)] w-full">
            {/* Background blobs for premium glassmorphism effect */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 dark:bg-blue-600/20 blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-500/10 dark:bg-purple-600/15 blur-[120px]" />
                <div className="absolute top-[40%] right-[20%] w-[40%] h-[40%] rounded-full bg-sky-500/10 dark:bg-sky-600/20 blur-[120px]" />
            </div>

            <div className="relative z-10 w-full h-full student-glass-content">
                {children}
            </div>
        </div>
    );
}
