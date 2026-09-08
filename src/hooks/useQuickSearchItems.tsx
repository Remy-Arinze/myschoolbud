'use client';

import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  GraduationCap,
  Users,
  BookOpen,
  BookMarked,
  Clock,
  Calendar,
  ArrowRightLeft,
  CreditCard,
  Bell,
  Settings,
  UserPlus,
  Library,
  ClipboardList,
  Shield,
  Wallet,
  Bot,
  HardDrive,
  Building2,
  UserCheck,
  Puzzle,
} from 'lucide-react';
import type { RootState } from '@/lib/store/store';
import { useSchoolType } from '@/hooks/useSchoolType';
import { useTerminology } from '@/hooks/useTerminology';
import { useRuntimePolicies } from '@/hooks/useRuntimePolicies';
import { useCurrentAdminPermissions, PermissionResource, PermissionType } from '@/hooks/usePermissions';
import type { SidebarSearchItem } from '@/components/layout/SidebarQuickSearch';

type CatalogEntry = {
  label: string;
  href: string;
  icon: LucideIcon;
  group: string;
  keywords?: string[];
  permission?: PermissionResource;
  permissionType?: PermissionType;
  principalOnly?: boolean;
  schoolTypes?: Array<'PRIMARY' | 'SECONDARY' | 'TERTIARY'>;
};

export function useQuickSearchItems(fallbackItems: SidebarSearchItem[]): SidebarSearchItem[] {
  const user = useSelector((state: RootState) => state.auth.user);
  const { currentType } = useSchoolType();
  const terminology = useTerminology();
  const { policies } = useRuntimePolicies();
  const { canView, canEdit, isPrincipal, isLoading } = useCurrentAdminPermissions();

  return useMemo(() => {
    if (user?.role !== 'SCHOOL_ADMIN') return fallbackItems;
    if (!isPrincipal && isLoading) return [];

    const classesLabel = currentType === 'TERTIARY' ? 'Departments' : terminology.courses;
    const subjectsLabel = currentType === 'TERTIARY' ? 'Courses' : 'Subjects';

    const catalog: CatalogEntry[] = [
      {
        label: 'Overview',
        href: '/dashboard/school/overview',
        icon: LayoutDashboard,
        group: 'Pages',
        keywords: ['home', 'dashboard'],
        permission: PermissionResource.OVERVIEW,
      },
      {
        label: 'Students',
        href: '/dashboard/school/students',
        icon: GraduationCap,
        group: 'Pages',
        keywords: ['pupils', 'roster', 'enrolment', 'enrollment'],
        permission: PermissionResource.STUDENTS,
      },
      {
        label: 'Admit student',
        href: '/dashboard/school/students/add',
        icon: UserPlus,
        group: 'Actions',
        keywords: ['add student', 'new student', 'register', 'enrol'],
        permission: PermissionResource.STUDENTS,
        permissionType: PermissionType.WRITE,
      },
      {
        label: 'Staff',
        href: '/dashboard/school/staff',
        icon: Users,
        group: 'Pages',
        keywords: ['teachers', 'admins', 'employees'],
        permission: PermissionResource.STAFF,
      },
      {
        label: 'Add staff',
        href: '/dashboard/school/staff/add',
        icon: UserPlus,
        group: 'Actions',
        keywords: ['add teacher', 'new staff', 'invite'],
        permission: PermissionResource.STAFF,
        permissionType: PermissionType.WRITE,
      },
      {
        label: 'Faculties',
        href: '/dashboard/school/faculties',
        icon: Library,
        group: 'Pages',
        keywords: ['faculty'],
        permission: PermissionResource.CLASSES,
        schoolTypes: ['TERTIARY'],
      },
      {
        label: classesLabel,
        href: '/dashboard/school/courses',
        icon: BookOpen,
        group: 'Pages',
        keywords: ['classes', 'departments', 'arms'],
        permission: PermissionResource.CLASSES,
      },
      {
        label: subjectsLabel,
        href: '/dashboard/school/subjects',
        icon: BookMarked,
        group: 'Pages',
        keywords: ['curriculum', 'courses', 'subjects'],
        permission: PermissionResource.SUBJECTS,
      },
      {
        label: 'Timetables',
        href: '/dashboard/school/timetables',
        icon: Clock,
        group: 'Pages',
        keywords: ['schedule', 'periods'],
        permission: PermissionResource.TIMETABLES,
      },
      {
        label: 'Exam timetables',
        href: '/dashboard/school/timetables?tab=exam',
        icon: ClipboardList,
        group: 'Pages',
        keywords: ['exams', 'assessment timetable'],
        permission: PermissionResource.TIMETABLES,
      },
      {
        label: 'Calendar',
        href: '/dashboard/school/calendar',
        icon: Calendar,
        group: 'Pages',
        keywords: ['events', 'terms', 'holidays'],
        permission: PermissionResource.CALENDAR,
      },
      {
        label: 'Applications',
        href: '/dashboard/school/applications',
        icon: ArrowRightLeft,
        group: 'Pages',
        keywords: ['admissions', 'transfers', 'applicants'],
        permission: PermissionResource.ADMISSIONS,
      },
      {
        label: 'Notifications',
        href: '/dashboard/school/notifications',
        icon: Bell,
        group: 'Pages',
        keywords: ['alerts', 'inbox'],
        permission: PermissionResource.OVERVIEW,
      },
      {
        label: 'Marketplace',
        href: '/dashboard/school/marketplace',
        icon: Puzzle,
        group: 'Pages',
        keywords: ['plugins', 'integrations', 'apps'],
        permission: PermissionResource.INTEGRATIONS,
      },
      {
        label: 'Subscription',
        href: '/dashboard/school/subscription',
        icon: CreditCard,
        group: 'Pages',
        keywords: ['billing', 'plan', 'upgrade'],
        permission: PermissionResource.SUBSCRIPTIONS,
        principalOnly: true,
      },
      {
        label: 'Settings',
        href: '/dashboard/school/settings/profile',
        icon: Settings,
        group: 'Settings',
        keywords: ['configuration', 'preferences'],
        permission: PermissionResource.SETTINGS,
        principalOnly: true,
      },
      {
        label: 'School profile',
        href: '/dashboard/school/settings/profile?tab=school',
        icon: Building2,
        group: 'Settings',
        keywords: ['identity', 'logo', 'name'],
        permission: PermissionResource.SETTINGS,
        principalOnly: true,
      },
      {
        label: 'Academic calendar settings',
        href: '/dashboard/school/settings/profile?tab=calendar',
        icon: Calendar,
        group: 'Settings',
        keywords: ['terms', 'session dates'],
        permission: PermissionResource.SETTINGS,
        principalOnly: true,
      },
      {
        label: 'Session & term dates',
        href: '/dashboard/school/settings/session',
        icon: Calendar,
        group: 'Settings',
        keywords: ['session', 'terms'],
        permission: PermissionResource.SETTINGS,
        principalOnly: true,
      },
      {
        label: 'People & permissions',
        href: '/dashboard/school/settings/profile?tab=permissions',
        icon: Shield,
        group: 'Settings',
        keywords: ['rbac', 'roles', 'access'],
        permission: PermissionResource.SETTINGS,
        principalOnly: true,
      },
      {
        label: 'Admissions settings',
        href: '/dashboard/school/settings/profile?tab=admissions',
        icon: ClipboardList,
        group: 'Settings',
        keywords: ['transfers', 'intake'],
        permission: PermissionResource.SETTINGS,
        principalOnly: true,
      },
      {
        label: 'Grading settings',
        href: '/dashboard/school/settings/profile?tab=grading',
        icon: GraduationCap,
        group: 'Settings',
        keywords: ['assessment', 'marks', 'grades'],
        permission: PermissionResource.SETTINGS,
        principalOnly: true,
      },
      {
        label: 'Attendance settings',
        href: '/dashboard/school/settings/profile?tab=attendance',
        icon: UserCheck,
        group: 'Settings',
        keywords: ['roll call'],
        permission: PermissionResource.SETTINGS,
        principalOnly: true,
      },
      {
        label: 'Timetable settings',
        href: '/dashboard/school/settings/profile?tab=timetable',
        icon: Clock,
        group: 'Settings',
        keywords: ['periods', 'bell'],
        permission: PermissionResource.SETTINGS,
        principalOnly: true,
      },
      {
        label: 'Finance & fees',
        href: '/dashboard/school/settings/profile?tab=finance',
        icon: Wallet,
        group: 'Settings',
        keywords: ['billing', 'payments'],
        permission: PermissionResource.SETTINGS,
        principalOnly: true,
      },
      {
        label: 'Communications settings',
        href: '/dashboard/school/settings/profile?tab=communications',
        icon: Bell,
        group: 'Settings',
        keywords: ['email', 'sms'],
        permission: PermissionResource.SETTINGS,
        principalOnly: true,
      },
      {
        label: 'Curriculum & AI',
        href: '/dashboard/school/settings/profile?tab=lois',
        icon: Bot,
        group: 'Settings',
        keywords: ['lois', 'scheme of work'],
        permission: PermissionResource.SETTINGS,
        principalOnly: true,
      },
      {
        label: 'Data & backup',
        href: '/dashboard/school/settings/profile?tab=data',
        icon: HardDrive,
        group: 'Settings',
        keywords: ['export', 'backup'],
        permission: PermissionResource.SETTINGS,
        principalOnly: true,
      },
      {
        label: 'Security & compliance',
        href: '/dashboard/school/settings/profile?tab=security',
        icon: Shield,
        group: 'Settings',
        keywords: ['privacy', 'security'],
        permission: PermissionResource.SETTINGS,
        principalOnly: true,
      },
    ];

    return catalog
      .filter((entry) => {
        if (currentType === 'TERTIARY' && policies.facultyStructureVisible === false && entry.href === '/dashboard/school/faculties') {
          return false;
        }
        if (entry.principalOnly && !isPrincipal) return false;
        if (entry.schoolTypes && currentType && !entry.schoolTypes.includes(currentType)) return false;
        if (!entry.permission) return true;
        if (entry.permissionType === PermissionType.WRITE) return canEdit(entry.permission);
        return canView(entry.permission);
      })
      .map((entry) => {
        const Icon = entry.icon;
        return {
          label: entry.label,
          href: entry.href,
          icon: <Icon className="h-4 w-4 flex-shrink-0" strokeWidth={1.75} />,
          group: entry.group,
          keywords: entry.keywords,
        };
      });
  }, [
    user?.role,
    fallbackItems,
    currentType,
    terminology.courses,
    policies.facultyStructureVisible,
    canView,
    canEdit,
    isPrincipal,
    isLoading,
  ]);
}
