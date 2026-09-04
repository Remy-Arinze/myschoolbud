'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import {
  Bot,
  Calendar,
  GraduationCap,
  Users,
  ClipboardList,
  Clock,
  UserCheck,
  Bell,
  Wallet,
  Shield,
  Building2,
  HardDrive,
} from 'lucide-react';
import { SectionTabs, type SectionTab } from '@/components/ui/SectionTabs';

export type SchoolSettingsTab =
  | 'school'
  | 'calendar'
  | 'grading'
  | 'permissions'
  | 'admissions'
  | 'timetable'
  | 'attendance'
  | 'communications'
  | 'finance'
  | 'lois'
  | 'data'
  | 'security';

const PROFILE_BASE = '/dashboard/school/settings/profile';

/**
 * Tab order follows admin setup priority:
 * 1. Foundation — school identity & academic calendar
 * 2. People — access control & student intake
 * 3. Academics — day-to-day teaching policies
 * 4. Operations — fees, comms, curriculum/AI
 * 5. Compliance — security (infrequent, last)
 */
const TABS: SectionTab<SchoolSettingsTab>[] = [
  { key: 'school', label: 'School', href: `${PROFILE_BASE}?tab=school`, icon: <Building2 className="h-4 w-4" /> },
  { key: 'calendar', label: 'Academic Calendar', href: `${PROFILE_BASE}?tab=calendar`, icon: <Calendar className="h-4 w-4" />, dividerAfter: true },
  { key: 'permissions', label: 'People & Permissions', href: `${PROFILE_BASE}?tab=permissions`, icon: <Users className="h-4 w-4" /> },
  { key: 'admissions', label: 'Admissions & Transfers', href: `${PROFILE_BASE}?tab=admissions`, icon: <ClipboardList className="h-4 w-4" />, dividerAfter: true },
  { key: 'grading', label: 'Grading & Assessment', href: `${PROFILE_BASE}?tab=grading`, icon: <GraduationCap className="h-4 w-4" /> },
  { key: 'attendance', label: 'Attendance', href: `${PROFILE_BASE}?tab=attendance`, icon: <UserCheck className="h-4 w-4" /> },
  { key: 'timetable', label: 'Timetable', href: `${PROFILE_BASE}?tab=timetable`, icon: <Clock className="h-4 w-4" />, dividerAfter: true },
  { key: 'finance', label: 'Finance & Fees', href: `${PROFILE_BASE}?tab=finance`, icon: <Wallet className="h-4 w-4" /> },
  { key: 'communications', label: 'Communications', href: `${PROFILE_BASE}?tab=communications`, icon: <Bell className="h-4 w-4" /> },
  { key: 'lois', label: 'Curriculum & AI', href: `${PROFILE_BASE}?tab=lois`, icon: <Bot className="h-4 w-4" />, dividerAfter: true },
  { key: 'data', label: 'Data & Backup', href: `${PROFILE_BASE}?tab=data`, icon: <HardDrive className="h-4 w-4" />, dividerAfter: false },
  { key: 'security', label: 'Security & Compliance', href: `${PROFILE_BASE}?tab=security`, icon: <Shield className="h-4 w-4" /> },
];

interface SchoolSettingsTabsProps {
  activeTab: SchoolSettingsTab;
  className?: string;
}

export function SchoolSettingsTabs({ activeTab, className }: SchoolSettingsTabsProps) {
  return (
    <SectionTabs
      ariaLabel="Settings sections"
      tabs={TABS}
      activeTab={activeTab}
      className={className}
    />
  );
}

const VALID_TABS = new Set<string>(TABS.map((t) => t.key));

/** @deprecated use 'school' */
const LEGACY_TAB_MAP: Record<string, SchoolSettingsTab> = {
  profile: 'school',
  sessions: 'calendar',
};

export function useSchoolSettingsTab(defaultTab: SchoolSettingsTab = 'school'): SchoolSettingsTab {
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab');
  if (tab && VALID_TABS.has(tab)) return tab as SchoolSettingsTab;
  if (tab && LEGACY_TAB_MAP[tab]) return LEGACY_TAB_MAP[tab];
  return defaultTab;
}

export function useSetSchoolSettingsTab() {
  const router = useRouter();
  return (tab: SchoolSettingsTab) => {
    router.replace(`${PROFILE_BASE}?tab=${tab}`);
  };
}
