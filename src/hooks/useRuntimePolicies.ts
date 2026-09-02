'use client';

import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store/store';
import {
  useGetMySchoolQuery,
  useGetMyStudentSchoolQuery,
  useGetMyTeacherSchoolQuery,
} from '@/lib/store/api/schoolAdminApi';
import type { RuntimePolicies } from '@/lib/store/api/schoolsApi';
import { DEFAULT_WORKING_DAYS, type WorkingDay } from '@/lib/calendar/instructionalDays';

const DEFAULT_POLICIES: RuntimePolicies = {
  workingDays: [...DEFAULT_WORKING_DAYS],
  terminologyOverrides: null,
  facultyStructureVisible: true,
  teacherScope: 'ASSIGNED_ONLY',
  subjectRegistryMode: 'AGORA_PLUS_CUSTOM',
  defaultClassArmNames: ['A', 'B', 'C'],
  classLevelNamingMode: 'STANDARD',
  attendanceStatusOptions: ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED', 'SICK'],
  grading: {
    gradeScaleType: 'PERCENTAGE',
    passMark: 40,
    defaultCaWeight: 40,
    defaultExamWeight: 60,
    templatesMode: 'TEACHER_DISCRETION',
    defaultAllowLateSubmissionAfterDue: false,
    defaultAllowLateSubmissionAfterTimer: false,
    defaultLateDuePenalty: 0,
    defaultLateTimerPenalty: 0,
    defaultIntegrityEnabled: false,
    defaultViolationThreshold: 1,
    defaultPointsPerViolation: 0,
    templates: [],
  },
  timetable: {
    defaultPeriodLengthMinutes: 40,
    maxPeriodsPerTeacherPerDay: 6,
    roomCapacityWarningEnabled: true,
    examBlackoutEnabled: true,
  },
  bellScheduleTemplates: [],
};

export function useRuntimePolicies(): {
  policies: RuntimePolicies;
  isLoading: boolean;
} {
  const user = useSelector((state: RootState) => state.auth.user);

  const { data: adminData, isLoading: adminLoading } = useGetMySchoolQuery(undefined, {
    skip: user?.role !== 'SCHOOL_ADMIN',
  });
  const { data: teacherData, isLoading: teacherLoading } = useGetMyTeacherSchoolQuery(undefined, {
    skip: user?.role !== 'TEACHER',
  });
  const { data: studentData, isLoading: studentLoading } = useGetMyStudentSchoolQuery(undefined, {
    skip: user?.role !== 'STUDENT',
  });

  const school =
    user?.role === 'STUDENT'
      ? studentData?.data
      : user?.role === 'TEACHER'
        ? teacherData?.data
        : adminData?.data;

  const policies = useMemo((): RuntimePolicies => {
    const raw = (school as { runtimePolicies?: RuntimePolicies } | undefined)?.runtimePolicies;
    if (!raw) return DEFAULT_POLICIES;
    return {
      ...DEFAULT_POLICIES,
      ...raw,
      grading: {
        ...DEFAULT_POLICIES.grading,
        ...raw.grading,
        templates: raw.grading?.templates ?? DEFAULT_POLICIES.grading.templates,
      },
      timetable: { ...DEFAULT_POLICIES.timetable, ...raw.timetable },
      workingDays: raw.workingDays?.length ? raw.workingDays : DEFAULT_POLICIES.workingDays,
      attendanceStatusOptions: raw.attendanceStatusOptions?.length
        ? raw.attendanceStatusOptions
        : DEFAULT_POLICIES.attendanceStatusOptions,
      defaultClassArmNames: raw.defaultClassArmNames?.length
        ? raw.defaultClassArmNames
        : DEFAULT_POLICIES.defaultClassArmNames,
      bellScheduleTemplates: raw.bellScheduleTemplates ?? [],
    };
  }, [school]);

  const isLoading =
    user?.role === 'STUDENT' ? studentLoading : user?.role === 'TEACHER' ? teacherLoading : adminLoading;

  return { policies, isLoading };
}

export function useWorkingDays(): WorkingDay[] {
  const { policies } = useRuntimePolicies();
  return (policies.workingDays as WorkingDay[]) ?? [...DEFAULT_WORKING_DAYS];
}
