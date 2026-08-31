/**
 * Shared term/session date helpers — keep teacher dashboard, calendar, and admin
 * views aligned on when a term is "in session" vs overdue-but-still-ACTIVE.
 */

export const SESSION_MIN_DAYS = 300;
export const SESSION_MAX_DAYS = 370;
export const SESSION_MIN_MONTHS = 10;
export const SESSION_MAX_MONTHS = 12;

export function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function formatDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Academic session label years (e.g. Sep 2025 → 2025/2026). */
export function deriveAcademicSessionYears(startDate: string): {
  startYear: number;
  endYear: number;
} {
  const start = parseLocalDate(startDate);
  const year = start.getFullYear();
  const month = start.getMonth();
  const startYear = month >= 8 ? year : year - 1;
  return { startYear, endYear: startYear + 1 };
}

export function suggestSessionName(startDate: string): string {
  const { startYear, endYear } = deriveAcademicSessionYears(startDate);
  return `${startYear}/${endYear}`;
}

function daysBetween(start: Date, end: Date): number {
  return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Suggest a session end date from a start date — aligned to a typical
 * Nigerian academic calendar (Sep start → late Jul / Aug end).
 */
export function suggestSessionEndDate(startDate: string): string {
  const start = parseLocalDate(startDate);
  const { endYear } = deriveAcademicSessionYears(startDate);

  const candidates = [
    new Date(endYear, 6, 31),
    new Date(endYear, 7, 31),
  ];

  for (const end of candidates) {
    const days = daysBetween(start, end);
    if (days >= SESSION_MIN_DAYS && days <= SESSION_MAX_DAYS) {
      return formatDateISO(end);
    }
  }

  const fallback = new Date(start);
  fallback.setDate(fallback.getDate() + 335);
  return formatDateISO(fallback);
}

export function validateSessionDateRange(
  start: string,
  end: string,
): string | null {
  if (!start || !end) return null;
  const s = parseLocalDate(start);
  const e = parseLocalDate(end);
  const monthsDiff =
    (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
  const daysDiff = daysBetween(s, e);

  if (monthsDiff < SESSION_MIN_MONTHS || daysDiff < SESSION_MIN_DAYS) {
    return 'An academic session must span at least 10 months (approximately one year).';
  }
  if (monthsDiff > SESSION_MAX_MONTHS || daysDiff > SESSION_MAX_DAYS) {
    return 'An academic session cannot exceed 12 months.';
  }
  return null;
}

export interface TermDateRange {
  startDate: string;
  endDate: string;
  status?: string;
  examStart?: string | null;
  examEnd?: string | null;
  examTimetablePublishedAt?: string | null;
  isInExamPeriod?: boolean;
  isLessonScheduleActive?: boolean;
  termPhase?: string;
}

export function startOfLocalDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function isDateInRange(
  date: Date,
  start: string | Date,
  end: string | Date,
): boolean {
  const t = startOfLocalDay(date).getTime();
  return (
    t >= startOfLocalDay(new Date(start)).getTime() &&
    t <= startOfLocalDay(new Date(end)).getTime()
  );
}

/** Calendar days until term end (negative = overdue). */
export function getTermDaysRemaining(
  endDate: string | Date,
  today: Date = new Date(),
): number {
  const end = startOfLocalDay(new Date(endDate));
  const t = startOfLocalDay(today);
  return Math.ceil((end.getTime() - t.getTime()) / (1000 * 60 * 60 * 24));
}

export function isTermPastEndDate(
  term: TermDateRange,
  today: Date = new Date(),
): boolean {
  return getTermDaysRemaining(term.endDate, today) < 0;
}

export function isTermBeforeStart(
  term: TermDateRange,
  today: Date = new Date(),
): boolean {
  const start = startOfLocalDay(new Date(term.startDate));
  const t = startOfLocalDay(today);
  return t.getTime() < start.getTime();
}

/** Today falls within the term's start/end dates (inclusive). */
export function isTermInSession(
  term: TermDateRange,
  today: Date = new Date(),
): boolean {
  if (term.status && term.status !== 'ACTIVE') return false;
  return isDateInRange(today, term.startDate, term.endDate);
}

export function isExamTimetablePublished(term: TermDateRange): boolean {
  return !!term.examTimetablePublishedAt;
}

export function isTermInExamPeriod(
  term: TermDateRange,
  today: Date = new Date(),
): boolean {
  if (term.isInExamPeriod != null) return term.isInExamPeriod;
  if (!term.examStart || !term.examEnd) return false;
  return isDateInRange(today, term.examStart, term.examEnd);
}

export function isExamScheduleActive(
  term: TermDateRange,
  today: Date = new Date(),
): boolean {
  return isTermInExamPeriod(term, today) && isExamTimetablePublished(term);
}

/**
 * Regular lesson timetable: in session, not overdue, and not in published exam period.
 */
export function isLessonScheduleActive(
  term: TermDateRange,
  today: Date = new Date(),
): boolean {
  if (term.isLessonScheduleActive != null) return term.isLessonScheduleActive;
  if (!isTermInSession(term, today)) return false;
  if (isExamScheduleActive(term, today)) return false;
  return true;
}

/**
 * Term is ACTIVE in the database and today is within its date range.
 */
export function isTermOperationallyActive(
  term: TermDateRange,
  today: Date = new Date(),
): boolean {
  return isTermInSession(term, today);
}

export type TermPhase =
  | 'NOT_STARTED'
  | 'IN_SESSION'
  | 'EXAM_PERIOD'
  | 'OVERDUE'
  | 'ENDED';

export function getTermPhase(term: TermDateRange, today: Date = new Date()): TermPhase {
  if (term.termPhase) return term.termPhase as TermPhase;
  if (term.status === 'COMPLETED' || term.status === 'ARCHIVED') return 'ENDED';
  if (isTermBeforeStart(term, today)) return 'NOT_STARTED';
  if (isTermPastEndDate(term, today)) return 'OVERDUE';
  if (isExamScheduleActive(term, today)) return 'EXAM_PERIOD';
  return 'IN_SESSION';
}

export interface ExamTimetableSlotLike {
  examDate: string;
  startTime: string;
  endTime: string;
  subjectName?: string;
  className?: string;
  classArmName?: string;
  roomName?: string;
}

/** Exam slots scheduled for today. */
export function getExamTodaySchedule<T extends ExamTimetableSlotLike>(
  slots: T[],
  today: Date = new Date(),
): T[] {
  const day = startOfLocalDay(today).toISOString().slice(0, 10);
  return slots
    .filter((s) => startOfLocalDay(new Date(s.examDate)).toISOString().slice(0, 10) === day)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}

export interface DateRangeSuggestion {
  start: string;
  end: string;
  display: string;
}

export interface TermMilestoneSuggestions {
  halfTerm: DateRangeSuggestion | null;
  midtermTests: DateRangeSuggestion | null;
  exams: DateRangeSuggestion | null;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** Compact range for UI hints, e.g. "Oct 14 – Oct 18, 2025". */
export function formatDateRangeShort(startIso: string, endIso: string): string {
  const s = parseLocalDate(startIso);
  const e = parseLocalDate(endIso);
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };

  if (startIso === endIso) {
    return s.toLocaleDateString('en-US', { ...opts, year: 'numeric' });
  }

  const sameYear = s.getFullYear() === e.getFullYear();
  const startLabel = s.toLocaleDateString('en-US', opts);
  const endLabel = e.toLocaleDateString(
    'en-US',
    sameYear ? opts : { ...opts, year: 'numeric' },
  );

  if (sameYear) {
    return `${startLabel} – ${endLabel}, ${s.getFullYear()}`;
  }

  return `${s.toLocaleDateString('en-US', { ...opts, year: 'numeric' })} – ${e.toLocaleDateString('en-US', { ...opts, year: 'numeric' })}`;
}

/**
 * Suggest half-term break, midterm tests, and exam windows from term length.
 * Typical Nigerian term (~12–14 weeks): midterm ~wk 6, half-term ~wk 7, exams ~last 2 wks.
 */
export function suggestTermMilestoneDates(
  termStart: string,
  termEnd: string,
): TermMilestoneSuggestions {
  const empty: TermMilestoneSuggestions = {
    halfTerm: null,
    midtermTests: null,
    exams: null,
  };

  if (!termStart || !termEnd) return empty;

  const start = parseLocalDate(termStart);
  const end = parseLocalDate(termEnd);
  const duration = daysBetween(start, end);
  if (duration < 21) return empty;

  const toSuggestion = (rangeStart: Date, rangeEnd: Date): DateRangeSuggestion => {
    const startIso = formatDateISO(rangeStart);
    const endIso = formatDateISO(rangeEnd);
    return {
      start: startIso,
      end: endIso,
      display: formatDateRangeShort(startIso, endIso),
    };
  };

  // Half-term break: ~5 days centred near the midpoint of the term
  const halfBreakLen = Math.min(5, Math.max(3, Math.round(duration * 0.04)));
  const halfMidOffset = Math.floor(duration * 0.5);
  let halfStart = addDays(start, halfMidOffset - Math.floor(halfBreakLen / 2));
  let halfEnd = addDays(halfStart, halfBreakLen - 1);
  if (halfEnd > end) {
    halfEnd = new Date(end);
    halfStart = addDays(halfEnd, -(halfBreakLen - 1));
  }
  if (halfStart < start) {
    halfStart = new Date(start);
    halfEnd = addDays(halfStart, Math.min(halfBreakLen - 1, duration));
  }

  // Midterm tests: ~4–5 days, ending a few days before half-term
  const midtermLen = Math.min(5, Math.max(3, Math.round(duration * 0.035)));
  let midEnd = addDays(halfStart, -3);
  let midStart = addDays(midEnd, -(midtermLen - 1));
  const earliestMidterm = addDays(start, Math.floor(duration * 0.32));
  if (midStart < earliestMidterm) {
    midStart = earliestMidterm;
    midEnd = addDays(midStart, midtermLen - 1);
  }
  if (midEnd >= halfStart) {
    midEnd = addDays(halfStart, -1);
    midStart = addDays(midEnd, -(midtermLen - 1));
  }

  // Exams: last ~12% of the term (minimum 7 days, maximum 14)
  const examLen = Math.min(14, Math.max(7, Math.round(duration * 0.12)));
  let examStart = addDays(end, -(examLen - 1));
  const latestTeachingDay = addDays(halfEnd, 7);
  if (examStart < latestTeachingDay) {
    examStart = latestTeachingDay;
  }
  const examEnd = new Date(end);

  if (examStart > examEnd || midStart > midEnd || halfStart > halfEnd) {
    return empty;
  }

  return {
    halfTerm: toSuggestion(halfStart, halfEnd),
    midtermTests: toSuggestion(midStart, midEnd),
    exams: toSuggestion(examStart, examEnd),
  };
}

export const SESSION_START_GRACE_DAYS = 7;

export function getSessionStartEditability(
  session: { startDate: string; status: string },
  today: Date = new Date(),
): {
  editable: boolean;
  message: string;
  variant: 'success' | 'warning' | 'locked';
  daysRemaining?: number;
} {
  if (session.status === 'COMPLETED') {
    return {
      editable: false,
      message: 'Completed sessions cannot be modified.',
      variant: 'locked',
    };
  }

  const startDate = parseLocalDate(session.startDate.split('T')[0]);
  const gracePeriodEnd = new Date(startDate);
  gracePeriodEnd.setDate(gracePeriodEnd.getDate() + SESSION_START_GRACE_DAYS);

  if (today < startDate) {
    return {
      editable: true,
      message: 'The session has not started yet — the start date can still be changed.',
      variant: 'success',
    };
  }

  if (today <= gracePeriodEnd) {
    const daysLeft = Math.ceil(
      (gracePeriodEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );
    return {
      editable: true,
      message:
        daysLeft >= SESSION_START_GRACE_DAYS
          ? `The session start date can be adjusted for the next ${SESSION_START_GRACE_DAYS} days in case you made a mistake during setup.`
          : `The session start date can still be adjusted for ${daysLeft} more ${daysLeft === 1 ? 'day' : 'days'}.`,
      variant: 'warning',
      daysRemaining: daysLeft,
    };
  }

  return {
    editable: false,
    message:
      'The session start date is locked after the first week to keep attendance and academic records accurate.',
    variant: 'locked',
  };
}

export function getSessionEndEditability(
  session: { status: string },
): { editable: boolean; message: string } {
  if (session.status === 'COMPLETED') {
    return { editable: false, message: 'Completed sessions cannot be modified.' };
  }
  return {
    editable: true,
    message: 'The session end date can be adjusted while the session is active.',
  };
}
