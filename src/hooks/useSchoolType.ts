import { useMemo, useEffect, useCallback, useSyncExternalStore } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store/store';
import { useGetMySchoolQuery, useGetMyStudentSchoolQuery, useGetMyTeacherSchoolQuery } from '@/lib/store/api/schoolAdminApi';
import type { SchoolType } from '@/lib/store/api/schoolAdminApi';

const SCHOOL_TYPE_STORAGE_KEY = 'selectedSchoolType';
const SCHOOL_TYPE_EVENT = 'schoolTypeChanged';

function subscribeSchoolType(onChange: () => void) {
  window.addEventListener(SCHOOL_TYPE_EVENT, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(SCHOOL_TYPE_EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}

function getSchoolTypeSnapshot() {
  return localStorage.getItem(SCHOOL_TYPE_STORAGE_KEY);
}

function getSchoolTypeServerSnapshot(): string | null {
  return null;
}

function persistSchoolType(type: SchoolType) {
  localStorage.setItem(SCHOOL_TYPE_STORAGE_KEY, type);
  window.dispatchEvent(new Event(SCHOOL_TYPE_EVENT));
}

/**
 * Roles that have unrestricted access to all school types.
 * Only school_owner can switch between types freely.
 * All other admin roles are locked to their assigned schoolType.
 */
const UNRESTRICTED_ADMIN_ROLES = ['school_owner'] as const;

/**
 * Checks if a role is a principal-level role (Principal, Head Teacher, Headmaster, Headmistress, School Owner).
 */
export const isPrincipalRole = (role?: string | null) => {
  if (!role) return false;
  const r = role.toLowerCase().trim();
  return [
    'principal',
    'school_principal',
    'head_teacher',
    'headmaster',
    'headmistress',
    'school_owner',
  ].includes(r);
};

export interface SchoolTypeInfo {
  hasPrimary: boolean;
  hasSecondary: boolean;
  hasTertiary: boolean;
  isMixed: boolean;
  availableTypes: SchoolType[];
  primaryType: SchoolType | 'MIXED';
  currentType: SchoolType | null;
  setCurrentType: (type: SchoolType) => void;
  /** True if the admin is locked to a specific school type (cannot switch) */
  isLocked: boolean;
}

/**
 * Hook to get school type information and manage current type selection.
 *
 * For mixed schools:
 * - School owners can freely switch between school types via the switcher.
 * - All other admins are locked to the schoolType they were assigned to.
 *   Their `currentType` is always their assigned type, and `setCurrentType` is a no-op.
 * - Admins with no assigned schoolType (legacy/school-wide) retain the switcher.
 *
 * Works for school admins, students, and teachers.
 */
export function useSchoolType(): SchoolTypeInfo {
  const user = useSelector((state: RootState) => state.auth.user);

  // Use appropriate endpoint based on user role
  const { data: schoolAdminResponse } = useGetMySchoolQuery(undefined, {
    skip: user?.role !== 'SCHOOL_ADMIN',
  });
  const { data: studentSchoolResponse } = useGetMyStudentSchoolQuery(undefined, {
    skip: user?.role !== 'STUDENT',
  });
  const { data: teacherSchoolResponse } = useGetMyTeacherSchoolQuery(undefined, {
    skip: user?.role !== 'TEACHER',
  });

  // Get school from appropriate response
  const school = useMemo(() => {
    if (user?.role === 'STUDENT') return studentSchoolResponse?.data;
    if (user?.role === 'TEACHER') return teacherSchoolResponse?.data;
    return schoolAdminResponse?.data;
  }, [user?.role, studentSchoolResponse, teacherSchoolResponse, schoolAdminResponse]);

  const storedType = useSyncExternalStore(
    subscribeSchoolType,
    getSchoolTypeSnapshot,
    getSchoolTypeServerSnapshot,
  );

  // Determine if this admin is locked to a specific school type
  const adminSchoolType = user?.adminSchoolType as SchoolType | null | undefined;
  const adminRole = user?.adminRole;
  const isUnrestrictedRole = adminRole
    ? UNRESTRICTED_ADMIN_ROLES.some(r => r === adminRole.toLowerCase())
    : false;

  // Admin is locked if they have an assigned schoolType AND are NOT an unrestricted role
  const isLocked = !!(
    user?.role === 'SCHOOL_ADMIN' &&
    adminSchoolType &&
    !isUnrestrictedRole
  );

  // Get school type context from school data
  const schoolType = useMemo(() => {
    if (!school) {
      return {
        hasPrimary: false,
        hasSecondary: false,
        hasTertiary: false,
        isMixed: false,
        availableTypes: [] as SchoolType[],
        primaryType: 'PRIMARY' as SchoolType | 'MIXED',
      };
    }

    // Use schoolType from API if available, otherwise compute from flags
    if (school.schoolType) {
      return school.schoolType;
    }

    // Fallback: compute from flags
    const availableTypes: SchoolType[] = [];
    if (school.hasPrimary) availableTypes.push('PRIMARY');
    if (school.hasSecondary) availableTypes.push('SECONDARY');
    if (school.hasTertiary) availableTypes.push('TERTIARY');

    const isMixed = availableTypes.length > 1;
    const primaryType: SchoolType | 'MIXED' =
      isMixed ? 'MIXED' : (availableTypes[0] || 'PRIMARY');

    return {
      hasPrimary: school.hasPrimary,
      hasSecondary: school.hasSecondary,
      hasTertiary: school.hasTertiary,
      isMixed,
      availableTypes,
      primaryType,
    };
  }, [school]);

  // Seed a default type into localStorage once school types are known
  useEffect(() => {
    if (typeof window === 'undefined' || schoolType.availableTypes.length === 0 || isLocked) {
      return;
    }

    if (storedType && schoolType.availableTypes.includes(storedType as SchoolType)) {
      return;
    }

    const defaultType = schoolType.availableTypes[0]
      ?? (schoolType.primaryType !== 'MIXED' ? schoolType.primaryType : null);
    if (defaultType) {
      persistSchoolType(defaultType);
    }
  }, [schoolType, isLocked, storedType]);

  const setCurrentType = useCallback((type: SchoolType) => {
    if (isLocked) return;
    if (typeof window !== 'undefined' && schoolType.availableTypes.includes(type)) {
      persistSchoolType(type);
    }
  }, [isLocked, schoolType.availableTypes]);

  const effectiveType: SchoolType | null =
    isLocked && adminSchoolType
      ? adminSchoolType
      : storedType && schoolType.availableTypes.includes(storedType as SchoolType)
        ? (storedType as SchoolType)
        : null;

  return {
    ...schoolType,
    currentType: effectiveType,
    setCurrentType,
    isLocked,
  };
}

