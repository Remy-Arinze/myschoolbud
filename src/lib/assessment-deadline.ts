/** Mirrors backend due-date deadline (end of UTC calendar day). */
export function getDueDateDeadline(dueDate: string | Date): Date {
  const deadline = new Date(dueDate);
  deadline.setUTCHours(23, 59, 59, 999);
  return deadline;
}

export function isPastDueDate(dueDate: string | Date | null | undefined, now = new Date()): boolean {
  if (!dueDate) return false;
  return now.getTime() > getDueDateDeadline(dueDate).getTime();
}

export function getTimerRemainingSeconds(
  startedAt: string | Date,
  durationMinutes: number,
  now = new Date(),
): number {
  const end = new Date(new Date(startedAt).getTime() + durationMinutes * 60 * 1000);
  return Math.max(0, Math.floor((end.getTime() - now.getTime()) / 1000));
}

export function isTimerExpiredForUi(
  startedAt: string | Date | null | undefined,
  durationMinutes: number | null | undefined,
  now = new Date(),
): boolean {
  if (!startedAt || !durationMinutes) return false;
  return getTimerRemainingSeconds(startedAt, durationMinutes, now) === 0;
}
