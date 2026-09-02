'use client';

import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store/store';
import { useSchoolType } from '@/hooks/useSchoolType';
import { Terminology } from '@/lib/utils/terminology';
import { useTerminology } from '@/hooks/useTerminology';
import { useRuntimePolicies } from '@/hooks/useRuntimePolicies';
import { useCurrentAdminPermissions, PermissionResource } from '@/hooks/usePermissions';
import { useTeacherDashboard } from '@/hooks/useTeacherDashboard';
import {
  LayoutDashboard,
  Building2,
  Users,
  BarChart3,
  GraduationCap,
  UserPlus,
  ArrowRightLeft,
  Puzzle,
  BookOpen,
  BookMarked,
  Calendar,
  Clock,
  FileText,
  CreditCard,
  Library,
  User,
  Settings,
  Bot,
  LucideIcon,
  Megaphone,
  Bell,
} from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  roles?: string[];
  schoolTypes?: Array<'PRIMARY' | 'SECONDARY' | 'TERTIARY'>;
  badge?: string | number;
  /** Permission resource required to view this item (school admin only) */
  permission?: PermissionResource;
  /** If true, only Principals (Owner, Head, etc.) can see this item, regardless of permissions */
  principalOnly?: boolean;
}

export interface SidebarSection {
  title?: string;
  items: NavItem[];
}

/**
 * Hook to get sidebar configuration based on user role and school type
 * This centralizes all sidebar logic for easier maintenance
 */
export function useSidebarConfig(): {
  sections: SidebarSection[];
  terminology: Terminology;
  currentType: 'PRIMARY' | 'SECONDARY' | 'TERTIARY' | null;
} {
  const user = useSelector((state: RootState) => state.auth.user);
  const { currentType } = useSchoolType();
  const terminology = useTerminology();
  const { policies } = useRuntimePolicies();
  
  // For teachers, we need to know if they are a form teacher
  const { formClasses } = useTeacherDashboard();

  const sections = useMemo(() => {
    if (!user) return [];

    const role = user.role;

    // Super Admin sidebar
    if (role === 'SUPER_ADMIN') {
      return [
        {
          items: [
            { label: 'Overview', href: '/dashboard/super-admin/overview', icon: LayoutDashboard },
            { label: 'Schools', href: '/dashboard/super-admin/schools', icon: Building2 },
            { label: 'Subjects', href: '/dashboard/super-admin/subjects', icon: BookMarked },
            { label: 'Curriculum', href: '/dashboard/super-admin/curriculum', icon: BookOpen },
            { label: 'Analytics', href: '/dashboard/super-admin/analytics', icon: BarChart3 },
            { label: 'Plans', href: '/dashboard/super-admin/plans', icon: CreditCard },
            { label: 'Campaigns', href: '/dashboard/super-admin/campaigns', icon: Megaphone },
            { label: 'Lois AI', href: '/dashboard/super-admin/lois', icon: Bot },
            { label: 'Plugins', href: '/dashboard/super-admin/plugins', icon: Puzzle },
            { label: 'Profile', href: '/dashboard/profile', icon: User },
          ],
        },
      ];
    }

    // School Admin sidebar - dynamic based on school type and permissions
    if (role === 'SCHOOL_ADMIN') {
      const baseItems: NavItem[] = [
        { label: 'Overview', href: '/dashboard/school/overview', icon: LayoutDashboard, permission: PermissionResource.OVERVIEW },
        { label: 'Students', href: '/dashboard/school/students', icon: GraduationCap, permission: PermissionResource.STUDENTS },
        { label: 'Staff', href: '/dashboard/school/staff', icon: Users, permission: PermissionResource.STAFF },
      ];

      // Add Faculties for tertiary (before Departments/Classes)
      if (currentType === 'TERTIARY' && policies.facultyStructureVisible !== false) {
        baseItems.push({
          label: 'Faculties',
          href: '/dashboard/school/faculties',
          icon: Library,
          schoolTypes: ['TERTIARY'],
          permission: PermissionResource.CLASSES,
        });
      }

      // Add Classes/Departments based on type
      baseItems.push({
        label: currentType === 'TERTIARY' ? 'Departments' : terminology.courses,
        href: '/dashboard/school/courses',
        icon: BookOpen,
        permission: PermissionResource.CLASSES,
      });

      // Common items after Classes/Departments
      baseItems.push(
        { label: currentType === 'TERTIARY' ? 'Courses' : 'Subjects', href: '/dashboard/school/subjects', icon: BookMarked, permission: PermissionResource.SUBJECTS },
        { label: 'Timetables', href: '/dashboard/school/timetables', icon: Clock, permission: PermissionResource.TIMETABLES },
        { label: 'Calendar', href: '/dashboard/school/calendar', icon: Calendar, permission: PermissionResource.CALENDAR },
        { label: 'Applications', href: '/dashboard/school/applications', icon: ArrowRightLeft, permission: PermissionResource.ADMISSIONS }, // Transfers/Applications use same permission as admissions
        { label: 'Subscription', href: '/dashboard/school/subscription', icon: CreditCard, permission: PermissionResource.SUBSCRIPTIONS, principalOnly: true },
        { label: 'Notifications', href: '/dashboard/school/notifications', icon: Bell, permission: PermissionResource.OVERVIEW },
        { label: 'Settings', href: '/dashboard/school/settings/profile', icon: Settings, principalOnly: true }
      );

      return [{ items: baseItems }];
    }

    // Teacher sidebar — Primary: My Class only; Secondary/Tertiary: Classes list (form flag on cards)
    if (role === 'TEACHER') {
      const items: NavItem[] = [
        { label: 'Overview', href: '/dashboard/teacher/overview', icon: LayoutDashboard },
        { label: 'Notifications', href: '/dashboard/teacher/notifications', icon: Bell },
        { label: 'Timetables', href: '/dashboard/teacher/timetables', icon: Clock },
      ];

      if (currentType === 'PRIMARY') {
        // Primary teachers are class teachers for one arm — deep-link My Class, hide Classes list
        if (formClasses && formClasses.length > 0) {
          formClasses.forEach((fc) => {
            items.push({
              label: formClasses.length > 1 ? `My Class (${fc.name})` : 'My Class',
              href: `/dashboard/teacher/classes/${fc.id}`,
              icon: Users,
            });
          });
        } else {
          // Fallback until form assignment loads / exists
          items.push({ label: 'Classes', href: '/dashboard/teacher/classes', icon: BookOpen });
        }
      } else {
        // SECONDARY / TERTIARY: multi-class subject teachers — Classes list only (no separate My Form nav)
        items.push({ label: 'Classes', href: '/dashboard/teacher/classes', icon: BookOpen });
      }

      items.push({ label: 'Calendar', href: '/dashboard/teacher/calendar', icon: Calendar });

      return [{ items }];
    }

    // Student sidebar
    if (role === 'STUDENT') {
      return [
        {
          items: [
            { label: 'Overview', href: '/dashboard/student/overview', icon: LayoutDashboard },
            { label: 'Notifications', href: '/dashboard/student/notifications', icon: Bell },
            { label: 'Classes', href: '/dashboard/student/classes', icon: BookOpen },
            { label: 'Timetables', href: '/dashboard/student/timetables', icon: Clock },
            { label: 'Results', href: '/dashboard/student/results', icon: FileText },
            { label: 'Calendar', href: '/dashboard/student/calendar', icon: Calendar },
            { label: 'Resources', href: '/dashboard/student/resources', icon: FileText },
            { label: 'History', href: '/dashboard/student/history', icon: GraduationCap },
            { label: 'Applications', href: '/dashboard/student/applications', icon: ArrowRightLeft },
          ],
        },
      ];
    }

    return [];
  }, [user, currentType, terminology, formClasses, policies.facultyStructureVisible]);

  return {
    sections,
    terminology,
    currentType,
  };
}

/**
 * Get flat list of nav items (for backwards compatibility with existing sidebar)
 */
export function useFlatNavItems(): NavItem[] {
  const { sections } = useSidebarConfig();
  return sections.flatMap((section) => section.items);
}

/**
 * Hook to get sidebar items filtered by user permissions
 * For school admins, items are filtered based on READ permission
 */
export function usePermissionFilteredSidebar(): {
  sections: SidebarSection[];
  terminology: Terminology;
  currentType: 'PRIMARY' | 'SECONDARY' | 'TERTIARY' | null;
  isLoadingPermissions: boolean;
} {
  const { sections, terminology, currentType } = useSidebarConfig();
  const user = useSelector((state: RootState) => state.auth.user);
  const { canView, isLoading: isLoadingPermissions, isPrincipal } = useCurrentAdminPermissions();

  const filteredSections = useMemo(() => {
    // Only filter for school admins
    if (user?.role !== 'SCHOOL_ADMIN') {
      return sections;
    }

    // Principals have permanent full access - see everything (no loading needed)
    if (isPrincipal) {
      return sections;
    }

    // While loading permissions, show empty sidebar to prevent flash
    if (isLoadingPermissions) {
      return sections.map((section) => ({ ...section, items: [] }));
    }

    // Filter items based on permissions
    return sections.map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        // If it's a principal-only feature and user is not principal, hide it
        if (item.principalOnly && !isPrincipal) return false;

        // If no permission specified, show the item
        if (!item.permission) return true;
        // Check if user has READ access to this resource
        return canView(item.permission);
      }),
    }));
  }, [sections, user?.role, isLoadingPermissions, isPrincipal, canView]);

  return {
    sections: filteredSections,
    terminology,
    currentType,
    isLoadingPermissions,
  };
}

