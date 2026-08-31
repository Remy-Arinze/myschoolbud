import type { SchoolType } from '@/lib/store/api/schoolAdminApi';

export interface Terminology {
  staff: string; // Teachers or Lecturers
  staffSingular: string; // Teacher or Lecturer
  courses: string; // Classes or Courses
  courseSingular: string; // Class or Course
  classPlural: string; // Classes or Courses
  classSingular: string; // Class or Course
  periods: string; // Terms or Semesters
  periodSingular: string; // Term or Semester
  subjects: string; // Subjects or Courses
  subjectSingular: string; // Subject or Course
}

/**
 * Get terminology based on school type, with optional school-specific overrides.
 */
export function getTerminology(
  schoolType: SchoolType | 'MIXED' | null,
  overrides?: Partial<Terminology> | Record<string, string> | null,
): Terminology {
  const isTertiary = schoolType === 'TERTIARY';

  const base: Terminology = isTertiary
    ? {
        staff: 'Lecturers',
        staffSingular: 'Lecturer',
        courses: 'Courses',
        courseSingular: 'Course',
        classPlural: 'Courses',
        classSingular: 'Course',
        periods: 'Semesters',
        periodSingular: 'Semester',
        subjects: 'Courses',
        subjectSingular: 'Course',
      }
    : {
        staff: 'Teachers',
        staffSingular: 'Teacher',
        courses: 'Classes',
        courseSingular: 'Class',
        classPlural: 'Classes',
        classSingular: 'Class',
        periods: 'Terms',
        periodSingular: 'Term',
        subjects: 'Subjects',
        subjectSingular: 'Subject',
      };

  if (!overrides) return base;

  return {
    staff: overrides.staff ?? base.staff,
    staffSingular: overrides.staffSingular ?? base.staffSingular,
    courses: overrides.courses ?? overrides.classPlural ?? base.courses,
    courseSingular: overrides.courseSingular ?? overrides.classSingular ?? base.courseSingular,
    classPlural: overrides.classPlural ?? overrides.courses ?? base.classPlural,
    classSingular: overrides.classSingular ?? overrides.courseSingular ?? base.classSingular,
    periods: overrides.periods ?? base.periods,
    periodSingular: overrides.periodSingular ?? base.periodSingular,
    subjects: overrides.subjects ?? base.subjects,
    subjectSingular: overrides.subjectSingular ?? base.subjectSingular,
  };
}

/**
 * Get display name for school type
 */
export function getSchoolTypeDisplayName(type: SchoolType): string {
  const names: Record<SchoolType, string> = {
    PRIMARY: 'Primary',
    SECONDARY: 'Secondary',
    TERTIARY: 'Tertiary',
  };
  return names[type] || type;
}

/** Examples for student promotion copy in session wizard */
export function getPromotionExamples(schoolType: SchoolType | null): {
  levelTransition: string;
  finalYearLabel: string;
} {
  switch (schoolType) {
    case 'PRIMARY':
      return { levelTransition: 'Primary 1 → Primary 2', finalYearLabel: 'Primary 6' };
    case 'SECONDARY':
      return { levelTransition: 'JSS1 → JSS2', finalYearLabel: 'SS3' };
    case 'TERTIARY':
      return { levelTransition: '100L → 200L', finalYearLabel: 'final-year' };
    default:
      return { levelTransition: 'current level → next level', finalYearLabel: 'final-year' };
  }
}

