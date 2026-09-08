export type CalendarMismatch = 'ALIGNED' | 'SHORT' | 'LONG';

export type CalendarCoverage = {
  instructionalWeeks: number;
  planWeeks: number;
  unscheduledWeeks: number;
  bufferWeeks: number;
  mismatch: CalendarMismatch;
};

export type CalendarCoverageVariant = 'preview' | 'imported';

/** Typical Bud-library term length when a specific template week count is unknown. */
export const DEFAULT_LIBRARY_TERM_WEEKS = 13;

export function coverageFromPlanVsCalendar(
  instructionalWeeks: number,
  planWeeks: number,
): CalendarCoverage {
  const unscheduledWeeks = Math.max(0, planWeeks - instructionalWeeks);
  const bufferWeeks = Math.max(0, instructionalWeeks - planWeeks);
  const mismatch: CalendarMismatch =
    unscheduledWeeks > 0 ? 'SHORT' : bufferWeeks > 0 ? 'LONG' : 'ALIGNED';
  return { instructionalWeeks, planWeeks, unscheduledWeeks, bufferWeeks, mismatch };
}

function weekRangeLabel(from: number, to: number): string {
  return from === to ? `Week ${from}` : `Weeks ${from}–${to}`;
}

function teachingWeeksLabel(n: number): string {
  return `${n} teaching week${n === 1 ? '' : 's'}`;
}

export function calendarCoverageMessage(
  coverage?: CalendarCoverage | null,
  variant: CalendarCoverageVariant = 'imported',
): string | null {
  if (!coverage || coverage.mismatch === 'ALIGNED') return null;

  const { instructionalWeeks, planWeeks } = coverage;

  if (coverage.mismatch === 'SHORT') {
    const firstUnscheduled = Math.max(1, planWeeks - coverage.unscheduledWeeks + 1);
    const undated = weekRangeLabel(firstUnscheduled, planWeeks);
    const datedEnd = Math.min(instructionalWeeks, planWeeks);
    const dated =
      datedEnd >= 1
        ? ` ${weekRangeLabel(1, datedEnd)} ${datedEnd === 1 ? 'has a date' : 'have dates'}.`
        : '';
    if (variant === 'preview') {
      return `This term’s calendar has ${teachingWeeksLabel(instructionalWeeks)}, but this scheme has ${planWeeks} topics.${dated} After import, ${undated} stay on the scheme so topics are not dropped, but they have no dates yet. You can then merge, drop, or rearrange weeks to fit.`;
    }
    return `This term’s calendar has ${teachingWeeksLabel(instructionalWeeks)}, but this scheme has ${planWeeks} topics.${dated} ${undated} stay on the scheme so nothing is dropped, but they have no dates yet. Extend term dates in session settings, or edit this scheme to merge, drop, or rearrange weeks to fit.`;
  }

  const firstBuffer = planWeeks + 1;
  const lastBuffer = planWeeks + coverage.bufferWeeks;
  const leftover = weekRangeLabel(firstBuffer, lastBuffer);
  const occupy =
    planWeeks === 1 ? 'it occupies week 1' : `they occupy weeks 1–${planWeeks}`;
  if (variant === 'preview') {
    return `This term’s calendar has ${teachingWeeksLabel(instructionalWeeks)}. The scheme only has ${planWeeks} topic${planWeeks === 1 ? '' : 's'}, so ${occupy}. After import, ${leftover.toLowerCase()} become leftover calendar time (catch-up / revision) so teachers can finish, revise, or assess — they are not extra curriculum topics. You can then add or move topics into those weeks.`;
  }
  return `This term’s calendar has ${teachingWeeksLabel(instructionalWeeks)}. The scheme only has ${planWeeks} topic${planWeeks === 1 ? '' : 's'}, so ${occupy}. ${leftover} ${coverage.bufferWeeks === 1 ? 'is' : 'are'} leftover calendar time added as catch-up / revision so teachers can finish, revise, or assess — they are not extra curriculum topics. Edit this scheme to put real topics in those weeks; later weeks will shift automatically.`;
}
