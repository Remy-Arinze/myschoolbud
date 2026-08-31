import type { AcademicSession, Term } from '@/lib/store/api/schoolAdminApi';

export type TermOption = Term & {
  sessionName: string;
  schoolType?: string | null;
};

/**
 * Flatten sessions into term options sorted by session (newest first) then term number.
 */
export function buildTermOptions(
  sessions: AcademicSession[] | undefined,
  options?: {
    schoolType?: string | null;
    sessionIds?: string[];
  },
): TermOption[] {
  if (!sessions?.length) return [];

  const schoolType = options?.schoolType ?? null;
  let filtered = sessions.filter((s) => s.schoolType === schoolType);

  if (options?.sessionIds?.length) {
    const allowed = new Set(options.sessionIds);
    filtered = filtered.filter((s) => allowed.has(s.id));
  }

  const sorted = [...filtered].sort(
    (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime(),
  );

  return sorted
    .flatMap((session) =>
      (session.terms ?? []).map((term) => ({
        ...term,
        sessionName: session.name,
        schoolType: session.schoolType,
      })),
    )
    .sort((a, b) => {
      const sessionCompare = b.sessionName.localeCompare(a.sessionName);
      if (sessionCompare !== 0) return sessionCompare;
      return a.number - b.number;
    });
}
