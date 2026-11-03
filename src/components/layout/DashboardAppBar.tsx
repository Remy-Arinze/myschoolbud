'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSelector } from 'react-redux';
import { Bell, ChevronDown, LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import type { RootState } from '@/lib/store/store';
import { useAuth } from '@/hooks/useAuth';
import { useSidebar } from '@/components/ui/sidebar';
import { usePermissionFilteredSidebar } from '@/hooks/useSidebarConfig';
import { useQuickSearchItems } from '@/hooks/useQuickSearchItems';
import { SidebarQuickSearch } from '@/components/layout/SidebarQuickSearch';
import { SchoolTypeSwitcher } from '@/components/dashboard/SchoolTypeSwitcher';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useGetUnreadNotificationCountQuery } from '@/lib/store/api/notificationsApi';
import { cn } from '@/lib/utils';

const NOTIFICATION_HREF: Record<string, string> = {
  SCHOOL_ADMIN: '/dashboard/school/notifications',
  TEACHER: '/dashboard/teacher/notifications',
  STUDENT: '/dashboard/student/notifications',
};

function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = null;
  };
  const openOnHover = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch') return;
    cancelClose();
    setOpen(true);
  };
  const closeOnLeave = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch') return;
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  };

  useEffect(() => () => cancelClose(), []);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDown, true);
    return () => document.removeEventListener('pointerdown', onDown, true);
  }, [open]);

  const firstName = (user as { firstName?: string } | null)?.firstName;
  const lastName = (user as { lastName?: string } | null)?.lastName;
  const displayName = firstName || user?.email?.split('@')[0] || 'Account';
  const initials =
    `${firstName?.[0] ?? displayName[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase() || '?';

  return (
    <div ref={ref} className="relative" onPointerEnter={openOnHover} onPointerLeave={closeOnLeave}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-10 items-center gap-2 rounded-full bg-black/[0.04] pl-1 pr-3 transition-colors hover:bg-black/[0.08] dark:bg-white/5 dark:hover:bg-white/10"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--agora-blue)]/15 text-[11px] font-bold text-[var(--agora-blue)]">
          {initials}
        </span>
        <span className="hidden md:block max-w-[110px] truncate text-[13px] font-semibold text-slate-800 dark:text-white">
          {displayName}
        </span>
        <ChevronDown className={cn('hidden md:block h-3.5 w-3.5 text-slate-400 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-12 z-50 w-52 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/10 dark:border-white/10 dark:bg-[#0f1520]"
        >
          <div className="px-3 py-2">
            <p className="truncate text-[13px] font-semibold text-slate-900 dark:text-white">{displayName}</p>
            <p className="truncate text-[11px] text-slate-500">{user?.email}</p>
          </div>
          <div className="flex items-center justify-between rounded-xl px-3 py-1.5 text-[13px] text-slate-700 dark:text-slate-200">
            <span>Theme</span>
            <ThemeToggle className="h-7 w-7 min-w-[28px]" />
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={logout}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-[13px] font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
          >
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </div>
      )}
    </div>
  );
}

export function DashboardAppBar() {
  const user = useSelector((state: RootState) => state.auth.user);
  const { collapsed, toggleCollapsed } = useSidebar();
  const { sections } = usePermissionFilteredSidebar();

  const schoolId = useSelector(
    (state: RootState) => state.auth.tenantId || state.auth.user?.schoolId,
  );
  const canFetchUnread = !!user && user.role in NOTIFICATION_HREF;
  const { data: unreadRes } = useGetUnreadNotificationCountQuery(
    { schoolId: schoolId || undefined },
    { skip: !canFetchUnread, pollingInterval: 60_000 },
  );
  const unreadCount = unreadRes?.data?.count ?? 0;

  const navItems = useMemo(
    () =>
      sections.flatMap((section) =>
        section.items.map((item) => {
          const Icon = item.icon;
          return { label: item.label, href: item.href, icon: <Icon className="h-4 w-4" /> };
        }),
      ),
    [sections],
  );
  const searchItems = useQuickSearchItems(navItems);

  if (!user) return null;

  return (
    <header
      className={cn(
        'fixed right-0 left-0 top-[64px] md:top-0 z-30 h-16 transition-[left] duration-300',
        '',
        'bg-[var(--light-bg)]/85 dark:bg-[var(--dark-bg)]/85 backdrop-blur-md',
        collapsed ? 'md:left-[84px]' : 'md:left-[250px]',
      )}
    >
      <div className="flex h-full items-center gap-3 px-4 md:px-8">
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="hidden md:flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-black/[0.04] text-slate-600 transition-colors hover:bg-black/[0.08] dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
        <SidebarQuickSearch items={searchItems} searchData={user.role === 'SCHOOL_ADMIN'} />
        <div className="ml-auto flex items-center gap-2">
          {user.role === 'SCHOOL_ADMIN' && <SchoolTypeSwitcher variant="appbar" />}
          {canFetchUnread && (
            <Link
              href={NOTIFICATION_HREF[user.role]}
              aria-label="Notifications"
              className="relative flex h-10 w-10 items-center justify-center rounded-full bg-black/[0.04] text-slate-600 transition-colors hover:bg-black/[0.08] dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-[var(--light-bg)] dark:ring-[var(--dark-bg)]" />
              )}
            </Link>
          )}
          <UserMenu />
        </div>
      </div>
    </header>
  );
}


