'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  useGetMySchoolQuery,
  useGetSetupProgressQuery,
  type SchoolSetupProgress,
} from '@/lib/store/api/schoolAdminApi';
import { useSchoolType } from '@/hooks/useSchoolType';
import { getTerminology } from '@/lib/utils/terminology';

export type SetupStepId =
  | 'session'
  | 'subjects'
  | 'classes'
  | 'staff'
  | 'timetable'
  | 'curriculum'
  | 'students'
  | 'midterm'
  | 'examDates'
  | 'holidays';

/** Shown only until done — hide on later terms once foundation is in place. */
const FOUNDATION_STEP_IDS: SetupStepId[] = ['subjects', 'classes', 'staff', 'students'];

/** Re-evaluated every active term. */
const TERM_STEP_IDS: SetupStepId[] = [
  'session',
  'timetable',
  'curriculum',
  'midterm',
  'examDates',
  'holidays',
];

export interface SetupStep {
  id: SetupStepId;
  title: string;
  description: string;
  href: string;
  done: boolean;
  scope: 'foundation' | 'term';
}

const dismissKey = (schoolId: string, schoolType: string | null) =>
  `agora_setup_dismissed_${schoolId}_${schoolType || 'all'}`;

const collapsedKey = (schoolId: string, schoolType: string | null) =>
  `agora_setup_collapsed_${schoolId}_${schoolType || 'all'}`;

function readFlag(key: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function writeFlag(key: string, value: boolean) {
  if (typeof window === 'undefined') return;
  try {
    if (value) localStorage.setItem(key, '1');
    else localStorage.removeItem(key);
  } catch {
    // ignore quota / private mode
  }
}

/** Missing key means collapsed — the checklist should not own the overview on first visit. */
function readCollapsed(key: string): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return localStorage.getItem(key) !== '0';
  } catch {
    return true;
  }
}

function writeCollapsed(key: string, collapsed: boolean) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, collapsed ? '1' : '0');
  } catch {
    // ignore quota / private mode
  }
}

function buildSteps(
  progress: SchoolSetupProgress | undefined,
  terminology: ReturnType<typeof getTerminology>
): SetupStep[] {
  const p = progress;
  const classId = p?.suggestedClassId;
  const hasClasses = !!p?.hasClasses;
  const hasSubjects = !!p?.hasSubjects;
  const hasStaff = !!p?.hasStaff;
  const hasTimetable = !!p?.hasTimetable;
  const hasCurriculum = !!p?.hasCurriculum;
  const hasStudents = !!p?.hasStudents;
  const hideFoundation = !!p?.isFoundationComplete;

  const all: SetupStep[] = [
    {
      id: 'session',
      title: `Start ${terminology.periodSingular.toLowerCase()}`,
      description: `Activate a session and ${terminology.periodSingular.toLowerCase()} so the rest of the school year can run.`,
      href: '/dashboard/school/settings/session',
      done: !!p?.hasActiveSession,
      scope: 'term',
    },
    {
      id: 'subjects',
      title: `Add ${terminology.subjects.toLowerCase()}`,
      description: `Create the ${terminology.subjects.toLowerCase()} your school teaches this year.`,
      href: hasSubjects
        ? '/dashboard/school/subjects'
        : '/dashboard/school/subjects?action=add',
      done: hasSubjects,
      scope: 'foundation',
    },
    {
      id: 'classes',
      title: `Add ${terminology.classPlural.toLowerCase()}`,
      description: `Set up ${terminology.classPlural.toLowerCase()} and arms so students and timetables have a home.`,
      href: hasClasses
        ? '/dashboard/school/courses'
        : '/dashboard/school/courses?action=add',
      done: hasClasses,
      scope: 'foundation',
    },
    {
      id: 'staff',
      title: `Invite ${terminology.staff.toLowerCase()}`,
      description: `Add at least one ${terminology.staffSingular.toLowerCase()} to teach and manage classes.`,
      href: hasStaff
        ? '/dashboard/school/staff'
        : '/dashboard/school/staff/add',
      done: hasStaff,
      scope: 'foundation',
    },
    {
      id: 'timetable',
      title: 'Build timetable',
      description: 'Schedule lesson periods so curriculum and teaching can attach to real slots.',
      href: hasTimetable
        ? '/dashboard/school/timetables'
        : classId
          ? `/dashboard/school/timetables?class=${classId}`
          : '/dashboard/school/timetables?action=add',
      done: hasTimetable,
      scope: 'term',
    },
    {
      id: 'curriculum',
      title: 'Set up curriculum',
      description: 'Import Myschoolbud schemes or create your own for timetable subjects.',
      href: classId
        ? `/dashboard/school/courses/${classId}?tab=curriculum`
        : '/dashboard/school/courses',
      done: hasCurriculum,
      scope: 'term',
    },
    {
      id: 'students',
      title: 'Admit students',
      description: 'Enroll your first students so classes and results have people in them.',
      href: hasStudents
        ? '/dashboard/school/students'
        : '/dashboard/school/students?new=true',
      done: hasStudents,
      scope: 'foundation',
    },
    {
      id: 'midterm',
      title: 'Set midterm tests',
      description: `Set the midterm test window for the active ${terminology.periodSingular.toLowerCase()}.`,
      href: '/dashboard/school/settings/profile?tab=calendar&action=term-dates&focus=midterm',
      done: !!p?.hasMidtermDates,
      scope: 'term',
    },
    {
      id: 'examDates',
      title: 'Set exam dates',
      description: `Set the end-of-${terminology.periodSingular.toLowerCase()} exam window.`,
      href: '/dashboard/school/settings/profile?tab=calendar&action=term-dates&focus=exam',
      done: !!p?.hasExamDates,
      scope: 'term',
    },
    {
      id: 'holidays',
      title: 'Add holidays',
      description: 'Import Nigerian public holidays or add school holidays on the calendar.',
      href: '/dashboard/school/calendar?action=import-holidays',
      done: !!p?.hasHolidays,
      scope: 'term',
    },
  ];

  // New schools see everything; established schools only see incomplete foundation
  // steps (none left) plus term-scoped todos that reset each term.
  return all.filter((step) => {
    if (FOUNDATION_STEP_IDS.includes(step.id)) {
      if (hideFoundation) return false;
      return true;
    }
    if (TERM_STEP_IDS.includes(step.id)) return true;
    return true;
  });
}

export function useSchoolSetupProgress() {
  const { currentType, availableTypes } = useSchoolType();
  const terminology = getTerminology(currentType);
  const { data: schoolResponse } = useGetMySchoolQuery();
  const schoolId = schoolResponse?.data?.id;

  const { data, isLoading, isFetching, error } = useGetSetupProgressQuery(
    currentType || undefined,
    { skip: !schoolId || (!currentType && availableTypes.length > 0) }
  );

  const progress = data?.data;
  const steps = useMemo(
    () => buildSteps(progress, terminology),
    [progress, terminology]
  );

  const completedCount = progress?.completedCount ?? steps.filter((s) => s.done).length;
  const totalCount = progress?.totalCount ?? steps.length;
  const isComplete = totalCount > 0 && completedCount >= totalCount;
  const nextStep = steps.find((s) => !s.done) ?? null;

  const storageScope = currentType || null;
  const [dismissed, setDismissed] = useState(false);
  const [collapsed, setCollapsed] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!schoolId) return;
    setDismissed(readFlag(dismissKey(schoolId, storageScope)));
    setCollapsed(readCollapsed(collapsedKey(schoolId, storageScope)));
    setHydrated(true);
  }, [schoolId, storageScope]);

  const dismiss = useCallback(() => {
    if (!schoolId) return;
    writeFlag(dismissKey(schoolId, storageScope), true);
    setDismissed(true);
  }, [schoolId, storageScope]);

  const restore = useCallback(() => {
    if (!schoolId) return;
    writeFlag(dismissKey(schoolId, storageScope), false);
    writeCollapsed(collapsedKey(schoolId, storageScope), false);
    setDismissed(false);
    setCollapsed(false);
  }, [schoolId, storageScope]);

  const toggleCollapsed = useCallback(() => {
    if (!schoolId) return;
    setCollapsed((prev) => {
      const next = !prev;
      writeCollapsed(collapsedKey(schoolId, storageScope), next);
      return next;
    });
  }, [schoolId, storageScope]);

  const expand = useCallback(() => {
    if (!schoolId) return;
    writeCollapsed(collapsedKey(schoolId, storageScope), false);
    setCollapsed(false);
  }, [schoolId, storageScope]);

  return {
    schoolId,
    steps,
    progress,
    completedCount,
    totalCount,
    isComplete,
    nextStep,
    isLoading: isLoading || !hydrated,
    isFetching,
    error,
    dismissed,
    collapsed,
    dismiss,
    restore,
    toggleCollapsed,
    expand,
    terminology,
  };
}
