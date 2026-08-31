export type WorkingDay =
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'
  | 'SUNDAY';

export const DEFAULT_WORKING_DAYS: WorkingDay[] = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
];

export interface DateRange {
  start: Date;
  end: Date;
}

const DAY_NAMES: WorkingDay[] = [
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
];

export function startOfLocalDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfLocalDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function getWorkingDayName(date: Date): WorkingDay {
  return DAY_NAMES[date.getDay()];
}

export function isWorkingDay(
  date: Date,
  workingDays: WorkingDay[] = DEFAULT_WORKING_DAYS,
): boolean {
  return workingDays.includes(getWorkingDayName(date));
}

export function isDateInRange(date: Date, range: DateRange | null | undefined): boolean {
  if (!range?.start || !range?.end) return false;
  const t = startOfLocalDay(date).getTime();
  return (
    t >= startOfLocalDay(range.start).getTime() &&
    t <= startOfLocalDay(range.end).getTime()
  );
}

export function isInAnyRange(
  date: Date,
  ranges: Array<DateRange | null | undefined>,
): boolean {
  return ranges.some((r) => isDateInRange(date, r));
}

export function isInstructionalDay(
  date: Date,
  options: {
    workingDays?: WorkingDay[];
    termRange?: DateRange | null;
    nonInstructionalRanges?: Array<DateRange | null | undefined>;
  } = {},
): boolean {
  const workingDays = options.workingDays?.length
    ? options.workingDays
    : DEFAULT_WORKING_DAYS;

  if (options.termRange && !isDateInRange(date, options.termRange)) {
    return false;
  }

  if (!isWorkingDay(date, workingDays)) return false;

  if (
    options.nonInstructionalRanges?.length &&
    isInAnyRange(date, options.nonInstructionalRanges)
  ) {
    return false;
  }

  return true;
}

export function buildHalfTermRange(
  halfTermStart?: Date | string | null,
  halfTermEnd?: Date | string | null,
): DateRange | null {
  if (!halfTermStart || !halfTermEnd) return null;
  return {
    start: startOfLocalDay(new Date(halfTermStart)),
    end: endOfLocalDay(new Date(halfTermEnd)),
  };
}

export function holidayRangesFromEvents(
  events: Array<{ type: string; startDate: string | Date; endDate: string | Date }>,
): DateRange[] {
  return events
    .filter((e) => e.type === 'HOLIDAY')
    .map((e) => ({
      start: startOfLocalDay(new Date(e.startDate)),
      end: endOfLocalDay(new Date(e.endDate)),
    }));
}
