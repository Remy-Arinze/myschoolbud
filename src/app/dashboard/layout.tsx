'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { SidebarNew } from '@/components/layout/SidebarNew';
import { Navbar } from '@/components/layout/Navbar';
import { DashboardAppBar } from '@/components/layout/DashboardAppBar';
import { SidebarProvider, useSidebar } from '@/components/ui/sidebar';
import { DashboardSmoothScroll } from '@/components/layout/DashboardSmoothScroll';
import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@/lib/store/store';
import { cn } from '@/lib/utils';
import { GlobalAiAssistant } from '@/components/ai/GlobalAiAssistant';
import { NotificationProvider } from '@/components/notifications/NotificationProvider';
import { LoisWorkspaceProvider } from '@/components/ai/LoisWorkspace';
import { LoisInsightDeepLink } from '@/components/ai/LoisInsightDeepLink';
import { SchoolLifecycleBanners, SchoolLifecycleProvider } from '@/components/lifecycle/SchoolLifecycleProvider';

function MainContent({ children, showNavbar, userRole }: { children: React.ReactNode, showNavbar: boolean, userRole?: string }) {
  const { collapsed } = useSidebar();
  const ambientBg =
    userRole === 'TEACHER' || userRole === 'STUDENT' || userRole === 'SCHOOL_ADMIN';
  return (
    <main
      className={cn(
        "flex-1 min-h-screen transition-all duration-300 scrollbar-hide overflow-y-auto overflow-x-hidden w-full",
        ambientBg ? "bg-transparent" : "bg-[var(--light-bg)] dark:bg-[var(--dark-bg)]",
        collapsed ? "md:ml-[84px]" : "md:ml-[250px]",
        showNavbar ? "pt-[80px] md:pt-[100px]" : "pt-[160px] md:pt-[104px]",
        "px-4 pb-20 md:px-8"
      )}
    >
      <SchoolLifecycleBanners />
      {children}
    </main>
  );
}

function DashboardContent({ children }: { children: React.ReactNode }) {
  const userRole = useSelector((state: RootState) => state.auth.user?.role);

  const showNavbar = userRole !== 'SUPER_ADMIN' && userRole !== 'SCHOOL_ADMIN' && userRole !== 'TEACHER' && userRole !== 'STUDENT';

  const ambientBg =
    userRole === 'TEACHER' || userRole === 'STUDENT' || userRole === 'SCHOOL_ADMIN';

  return (
    <NotificationProvider>
      <LoisWorkspaceProvider>
        <div className={cn(
          "min-h-screen transition-colors duration-200 flex overflow-hidden w-full relative",
          ambientBg ? "bg-transparent" : "bg-[var(--light-bg)] dark:bg-[var(--dark-bg)]"
        )}>
          {showNavbar && <Navbar />}
          {!showNavbar && <DashboardAppBar />}
          <SidebarNew hideMobileHeader={showNavbar} />
          <DashboardSmoothScroll />
          <MainContent showNavbar={showNavbar} userRole={userRole}>{children}</MainContent>
          <LoisInsightDeepLink />
          <GlobalAiAssistant />
        </div>
      </LoisWorkspaceProvider>
    </NotificationProvider>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  // Hide scrollbar on dashboard
  useEffect(() => {
    document.documentElement.classList.add('scrollbar-hide');
    document.body.classList.add('scrollbar-hide');

    return () => {
      document.documentElement.classList.remove('scrollbar-hide');
      document.body.classList.remove('scrollbar-hide');
    };
  }, []);

  return (
    <ProtectedRoute>
      <SidebarProvider animate={true}>
        <SchoolLifecycleProvider>
          <DashboardContent>{children}</DashboardContent>
        </SchoolLifecycleProvider>
      </SidebarProvider>
    </ProtectedRoute>
  );
}



