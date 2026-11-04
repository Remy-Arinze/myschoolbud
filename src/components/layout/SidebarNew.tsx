'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store/store';
import { SidebarBody, SidebarLink, useSidebar } from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Building2, CalendarRange, ChevronDown, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { LoisOrb } from '@/components/ai/LoisOrb';
import { SchoolBrandMark } from '@/components/layout/SchoolBrandMark';
import { getActivePluginsForTeacher } from '@/lib/plugins';
import { usePermissionFilteredSidebar } from '@/hooks/useSidebarConfig';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useGetUnreadNotificationCountQuery } from '@/lib/store/api/notificationsApi';
import '@/lib/store/api/notificationsApi';

function LogoutButton({ collapsed = false }: { collapsed?: boolean }) {
  const { logout } = useAuth();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={logout}
      title={collapsed ? 'Logout' : undefined}
      aria-label="Logout"
      className={cn(
        'text-[var(--light-text-primary)] dark:text-[var(--dark-text-primary)] hover:bg-[var(--light-card)] dark:hover:bg-[var(--dark-surface)] h-9 overflow-hidden',
        collapsed ? 'w-9 px-0 justify-center' : 'flex-1 justify-start gap-2 px-2'
      )}
    >
      <LogOut className="h-4 w-4 flex-shrink-0" />
      {!collapsed && (
        <span className="font-semibold transition-opacity duration-200" style={{ fontSize: 'var(--text-body)' }}>
          Logout
        </span>
      )}
    </Button>
  );
}

export function SidebarNew({ hideMobileHeader }: { hideMobileHeader?: boolean }) {
  const user = useSelector((state: RootState) => state.auth.user);
  const pathname = usePathname();
  const { sections, isLoadingPermissions } = usePermissionFilteredSidebar();

  const canFetchUnread =
    !!user && ['SCHOOL_ADMIN', 'TEACHER', 'STUDENT'].includes(user.role);
  const schoolId = useSelector(
    (state: RootState) => state.auth.tenantId || state.auth.user?.schoolId,
  );
  const { data: unreadRes } = useGetUnreadNotificationCountQuery(
    { schoolId: schoolId || undefined },
    {
      skip: !canFetchUnread,
      pollingInterval: 60_000,
      refetchOnMountOrArgChange: true,
    },
  );
  const unreadCount = unreadRes?.data?.count ?? 0;

  const processedSections = useMemo(() => {
    return sections.map((section) => {
      const items = section.items.filter(
        (item) => item.href !== '/dashboard/teacher/history' && !item.href.endsWith('/notifications'),
      );

      return {
        ...section,
        items: items.map((item) => {
          const Icon = item.icon;
          const isNotifications = item.href.includes('/notifications');
          const isBud = item.href === '/dashboard/student/bud';
          return {
            label: item.label,
            href: item.href,
            icon: isBud ? (
              <LoisOrb size="xs" className="flex-shrink-0" />
            ) : (
              <Icon className="h-4 w-4 flex-shrink-0" />
            ),
            badge: isNotifications
              ? unreadCount > 0
                ? unreadCount
                : undefined
              : item.badge,
          };
        }),
      };
    });
  }, [sections, unreadCount]);

  const finalSections = useMemo(() => {
    const base = [...processedSections];
    if (user?.role === 'TEACHER') {
      const activePlugins = getActivePluginsForTeacher();
      if (activePlugins.length > 0 && base.length > 0) {
        const pluginItems = activePlugins.map((plugin) => {
          const isLois = plugin.slug === 'agora-ai';
          const Icon = plugin.icon;

          return {
            label: isLois ? 'LOIS' : plugin.name,
            href: `/dashboard/teacher/plugins/${plugin.slug}`,
            icon: isLois ? (
              <div className="h-5 w-5 flex items-center justify-center overflow-hidden rounded-md bg-white shadow-sm ring-1 ring-black/5">
                <Image
                  src="/assets/logos/agora_main.png"
                  alt="Lois"
                  width={16}
                  height={16}
                  className="object-contain"
                />
              </div>
            ) : (
              <Icon className="h-4 w-4 flex-shrink-0" />
            ),
            badge: undefined,
          };
        });

        base[0] = {
          ...base[0],
          items: [...base[0].items, ...pluginItems],
        };
      }
    }
    return base;
  }, [processedSections, user?.role]);

  if (!user) return null;

  const hasNavItems = finalSections.some((section) => section.items.length > 0);
  const showLoadingSkeleton = user.role === 'SCHOOL_ADMIN' && isLoadingPermissions && !hasNavItems;

  return (
    <SidebarBody className="justify-between gap-3 overflow-hidden" hideMobileHeader={hideMobileHeader}>
      <SidebarContent
        user={user}
        pathname={pathname}
        sections={finalSections}
        showLoadingSkeleton={showLoadingSkeleton}
      />
    </SidebarBody>
  );
}

type SidebarSection = {
  title?: string;
  items: { label: string; href: string; icon: React.ReactNode; badge?: string | number }[];
};

const SETTINGS_BASE = '/dashboard/school/settings';
const SETTINGS_CHILDREN = [
  { label: 'School profile', href: `${SETTINGS_BASE}/profile`, icon: <Building2 className="h-4 w-4 flex-shrink-0" /> },
  { label: 'Session & terms', href: `${SETTINGS_BASE}/session`, icon: <CalendarRange className="h-4 w-4 flex-shrink-0" /> },
];

function SettingsGroup({
  link,
  pathname,
}: {
  link: SidebarSection['items'][number];
  pathname: string;
}) {
  const { collapsed } = useSidebar();
  const inSettings = pathname.startsWith(SETTINGS_BASE);
  const [expanded, setExpanded] = useState(inSettings);

  useEffect(() => {
    if (inSettings) setExpanded(true);
  }, [inSettings]);

  if (collapsed) {
    return <SidebarLink link={link} isActive={inSettings} />;
  }

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className={cn(
          'flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 transition-colors',
          inSettings
            ? 'bg-[var(--light-sidebar-active)] dark:bg-[var(--dark-surface)] text-[var(--agora-blue)]'
            : 'text-[var(--light-text-secondary)] dark:text-[var(--dark-text-secondary)] hover:bg-[var(--light-hover)] dark:hover:bg-[var(--dark-surface)]'
        )}
      >
        <span className="flex items-center gap-2.5 min-w-0">
          {link.icon}
          <span className="font-semibold truncate" style={{ fontSize: 'var(--text-body)' }}>
            {link.label}
          </span>
        </span>
        <ChevronDown className={cn('h-4 w-4 flex-shrink-0 transition-transform duration-200', expanded && 'rotate-180')} />
      </button>
      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-300 ease-out',
          expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        )}
      >
        <div className="overflow-hidden">
          <div className="ml-5 mt-1 flex flex-col gap-0.5 border-l border-[var(--light-border)] dark:border-[var(--dark-border)] pl-2">
            {SETTINGS_CHILDREN.map((child) => (
              <SidebarLink key={child.href} link={child} isActive={pathname === child.href} className="py-2" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SidebarContent({
  user,
  pathname,
  sections,
  showLoadingSkeleton,
}: {
  user: { role: string };
  pathname: string;
  sections: SidebarSection[];
  showLoadingSkeleton: boolean;
}) {
  const { collapsed } = useSidebar();
  const finalSections = sections;

  return (
    <>
      <div className="flex min-h-0 flex-col flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide">
        <div className="mb-4 flex items-center gap-1">
          <div className="min-w-0 flex-1">
            <SchoolBrandMark size="md" iconOnly={collapsed} />
          </div>
        </div>

        <div className="flex flex-col gap-1 my-auto py-4">
          {showLoadingSkeleton ? (
            <>
              {[...Array(6)].map((_, idx) => (
                <div key={idx} className="flex items-center gap-3 px-3 py-2 animate-pulse">
                  <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded" />
                  {!collapsed && <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />}
                </div>
              ))}
            </>
          ) : (
            finalSections.map((section, sectionIdx) => (
              <div key={sectionIdx} className="flex flex-col gap-1">
                {section.title && !collapsed && (
                  <p className="sidebar-section-title px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50 mb-2 mt-4">
                    {section.title}
                  </p>
                )}
                {section.items.map((link, idx) => {
                  const hasExactMatchInSidebar = finalSections.some((s) =>
                    s.items.some((i) => i.href !== link.href && pathname === i.href),
                  );

                  const isActive =
                    pathname === link.href ||
                    (pathname.startsWith(link.href + '/') && !hasExactMatchInSidebar) ||
                    (link.href === '/dashboard/super-admin/overview' &&
                      pathname === '/dashboard/super-admin') ||
                    (link.href === '/dashboard/school/overview' &&
                      (pathname === '/dashboard/school' || pathname === '/dashboard')) ||
                    (link.href === '/dashboard/student/overview' &&
                      (pathname === '/dashboard/student' || pathname === '/dashboard')) ||
                    (link.href === '/dashboard/teacher/timetables' &&
                      (pathname === '/dashboard/teacher' || pathname === '/dashboard')) ||
                    (link.href === '/dashboard/teacher/overview' &&
                      (pathname === '/dashboard/teacher' || pathname === '/dashboard'));

                  const separated =
                    user.role === 'STUDENT' && link.href === '/dashboard/student/notifications';
                  const isSettings =
                    user.role === 'SCHOOL_ADMIN' && link.href === `${SETTINGS_BASE}/profile`;
                  return (
                    <div key={idx} className={separated ? 'mb-4' : undefined}>
                      {isSettings ? (
                        <SettingsGroup link={link} pathname={pathname} />
                      ) : (
                        <SidebarLink link={link} isActive={isActive} />
                      )}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="flex-shrink-0 pt-3 px-2 pb-3 relative z-10 bg-[var(--light-bg)] dark:bg-[var(--dark-bg)]">
        <div
          className={cn(
            'border-t border-gray-200 dark:border-[var(--dark-border)] pt-4 flex items-center gap-2',
            collapsed && 'flex-col'
          )}
        >
          <LogoutButton collapsed={collapsed} />
          <ThemeToggle className="h-7 w-7 min-w-[28px] focus-visible:ring-0 active:scale-95 transition-all" />
        </div>
      </div>
    </>
  );
}

