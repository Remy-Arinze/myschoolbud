export const LOIS_INSIGHT_TYPE_LABEL: Record<string, string> = {
  ACADEMIC_RISK: 'Grades',
  STUDENT_DROP: 'Performance',
  SOW_GAP: 'Curriculum',
  ATTENDANCE_RISK: 'Attendance',
  FEE_ARREARS: 'Fees',
  ADMISSIONS_BACKLOG: 'Admissions',
};

export type LoisEvidenceLine = {
  label: string;
  detail?: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function studentLines(raw: unknown, extraKey?: string): LoisEvidenceLine[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 8).map((row) => {
    const item = asRecord(row);
    const name = typeof item?.studentName === 'string' ? item.studentName : typeof item?.name === 'string' ? item.name : 'Student';
    const extra =
      extraKey && item && (typeof item[extraKey] === 'number' || typeof item[extraKey] === 'string')
        ? String(item[extraKey])
        : undefined;
    return extra ? { label: name, detail: extra } : { label: name };
  });
}

export function evidenceLines(type: string, evidence: unknown): LoisEvidenceLine[] {
  const e = asRecord(evidence);
  if (!e) return [];

  if (type === 'ACADEMIC_RISK') {
    return studentLines(e.students, 'avgPercent').map((line) =>
      line.detail ? { ...line, detail: `${line.detail}%` } : line,
    );
  }
  if (type === 'ATTENDANCE_RISK') {
    const students = studentLines(e.students, 'absentDays').map((line) =>
      line.detail ? { ...line, detail: `${line.detail} days` } : line,
    );
    if (students.length) return students;
    if (typeof e.absentDays === 'number') {
      return [{ label: `${e.absentDays} absences in the last two weeks` }];
    }
    return [];
  }
  if (type === 'FEE_ARREARS') {
    const students = studentLines(e.students, 'unpaidAmount').map((line) =>
      line.detail ? { ...line, detail: line.detail } : line,
    );
    if (students.length) return students;
    if (typeof e.studentCount === 'number') {
      return [{ label: `${e.studentCount} students with overdue invoices` }];
    }
    return [];
  }
  if (type === 'ADMISSIONS_BACKLOG') {
    if (!Array.isArray(e.applications)) {
      return typeof e.pendingTotal === 'number' ? [{ label: `${e.pendingTotal} pending applications` }] : [];
    }
    return e.applications.slice(0, 8).map((row) => {
      const item = asRecord(row);
      const name = typeof item?.name === 'string' ? item.name : 'Applicant';
      const submitted = typeof item?.submittedAt === 'string' ? item.submittedAt : undefined;
      return submitted ? { label: name, detail: submitted } : { label: name };
    });
  }
  if (type === 'STUDENT_DROP') {
    const subject = typeof e.subject === 'string' ? e.subject : 'Subject';
    const prior = typeof e.priorAvg === 'number' ? Math.round(e.priorAvg) : null;
    const latest = typeof e.latest === 'number' ? Math.round(e.latest) : null;
    if (prior != null && latest != null) {
      return [{ label: subject, detail: `${prior}% → ${latest}%` }];
    }
    return [{ label: subject }];
  }
  if (type === 'SOW_GAP') {
    const topic = typeof e.topic === 'string' ? e.topic : 'Week not delivered';
    const week = typeof e.weekNumber === 'number' ? `Week ${e.weekNumber}` : undefined;
    const lines: LoisEvidenceLine[] = [{ label: topic, detail: week }];
    const outstanding = Array.isArray(e.outstandingArms)
      ? e.outstandingArms
          .map((row) => {
            const item = asRecord(row);
            return typeof item?.label === 'string' ? item.label : null;
          })
          .filter((label): label is string => !!label)
      : [];
    if (outstanding.length) {
      lines.push({
        label: outstanding.length === 1 ? 'Outstanding class' : 'Outstanding classes',
        detail: outstanding.join(', '),
      });
    }
    const delivered = Array.isArray(e.deliveredArms)
      ? e.deliveredArms
          .map((row) => {
            const item = asRecord(row);
            return typeof item?.label === 'string' ? item.label : null;
          })
          .filter((label): label is string => !!label)
      : [];
    if (delivered.length) {
      lines.push({ label: 'Marked delivered', detail: delivered.join(', ') });
    }
    return lines;
  }
  return [];
}

function sowGapHrefFromEvidence(e: Record<string, unknown> | null): string | null {
  if (!e) return null;
  const outstanding = Array.isArray(e.outstandingArms) ? e.outstandingArms : [];
  const firstArm = outstanding
    .map((row) => asRecord(row))
    .find((item) => item && (typeof item.classArmId === 'string' || typeof item.classId === 'string'));
  const courseId =
    (typeof firstArm?.classArmId === 'string' && firstArm.classArmId) ||
    (typeof firstArm?.classId === 'string' && firstArm.classId) ||
    (typeof e.classArmId === 'string' && e.classArmId) ||
    (typeof e.classId === 'string' && e.classId) ||
    null;
  if (!courseId) return null;
  const params = new URLSearchParams({ tab: 'curriculum' });
  if (typeof e.schemeId === 'string' && e.schemeId) params.set('scheme', e.schemeId);
  if (typeof e.weekNumber === 'number' && e.weekNumber > 0) params.set('week', String(e.weekNumber));
  return `/dashboard/school/courses/${courseId}?${params.toString()}`;
}

function isGenericSowHref(href: string): boolean {
  if (!href || href === '/dashboard/school/overview' || href === '/dashboard/school/courses') return true;
  if (!href.startsWith('/dashboard/school/courses')) return false;
  return !href.includes('scheme=');
}

export function insightListLabel(type: string): string {
  return type === 'SOW_GAP' ? 'Open week' : 'Open list';
}

/** Where “Open list / Open week” should go. Overview and the classes index are not the scheme week. */
export function insightListHref(insight: { type: string; href?: string | null; evidence?: unknown }): string | null {
  const stored = insight.href?.trim() || '';
  const e = asRecord(insight.evidence);

  if (insight.type === 'SOW_GAP') {
    const fromEvidence = sowGapHrefFromEvidence(e);
    if (fromEvidence) return fromEvidence;
    if (stored && !isGenericSowHref(stored)) return stored;
    return '/dashboard/school/courses';
  }

  if (stored && stored !== '/dashboard/school/overview') return stored;

  if (insight.type === 'ACADEMIC_RISK' || insight.type === 'ATTENDANCE_RISK' || insight.type === 'FEE_ARREARS') {
    return '/dashboard/school/students';
  }
  if (insight.type === 'STUDENT_DROP') {
    return typeof e?.studentId === 'string' ? `/dashboard/school/students/${e.studentId}` : '/dashboard/school/students';
  }
  if (insight.type === 'ADMISSIONS_BACKLOG') return '/dashboard/school/applications';
  return stored || null;
}

export type LoisInboxInsight = {
  id: string;
  type: string;
  title: string;
  evidence?: unknown;
  href?: string | null;
  unread?: boolean;
};

/** One row on the dashboard. Curriculum gaps for the same scheme share a row. */
export type LoisInboxRow = {
  key: string;
  type: string;
  title: string;
  detail: string | null;
  unread: boolean;
  insightId: string;
  href: string | null;
};

export const LOIS_INBOX_PREVIEW_LIMIT = 2;

function formatArmList(labels: string[]): string {
  const unique = [...new Set(labels.map((label) => label.trim()).filter(Boolean))];
  if (unique.length === 0) return '';
  if (unique.length === 1) return unique[0];
  if (unique.length === 2) return `${unique[0]} and ${unique[1]}`;
  return `${unique.slice(0, -1).join(', ')}, and ${unique[unique.length - 1]}`;
}

function formatWeekSpan(weeks: number[]): string {
  const sorted = [...new Set(weeks.filter((week) => week > 0))].sort((a, b) => a - b);
  if (sorted.length === 0) return '';
  if (sorted.length === 1) return `Week ${sorted[0]}`;
  const contiguous = sorted.every((week, index) => index === 0 || week === sorted[index - 1] + 1);
  if (contiguous) return `Weeks ${sorted[0]}–${sorted[sorted.length - 1]}`;
  return `Weeks ${sorted.join(', ')}`;
}

function sowGroupKey(insight: LoisInboxInsight): string {
  const evidence = asRecord(insight.evidence);
  const schemeId = typeof evidence?.schemeId === 'string' ? evidence.schemeId : '';
  if (schemeId) return `sow:${schemeId}`;
  const subject = typeof evidence?.subject === 'string' ? evidence.subject : '';
  const classLevel = typeof evidence?.classLevel === 'string' ? evidence.classLevel : '';
  if (subject || classLevel) return `sow:${classLevel}|${subject}`;
  return `sow:${insight.id}`;
}

function weekNumberOf(insight: LoisInboxInsight): number {
  const evidence = asRecord(insight.evidence);
  return typeof evidence?.weekNumber === 'number' ? evidence.weekNumber : Number.MAX_SAFE_INTEGER;
}

function sowInboxRow(key: string, members: LoisInboxInsight[]): LoisInboxRow {
  const byWeek = [...members].sort((a, b) => weekNumberOf(a) - weekNumberOf(b));
  const briefing = byWeek.find((member) => member.unread) ?? byWeek[0];
  const weeks = byWeek.map(weekNumberOf).filter((week) => week < Number.MAX_SAFE_INTEGER);

  let classLevel = '';
  let subject = '';
  let topic = '';
  const armLabels: string[] = [];
  for (const member of byWeek) {
    const evidence = asRecord(member.evidence);
    if (!classLevel && typeof evidence?.classLevel === 'string') classLevel = evidence.classLevel.trim();
    if (!subject && typeof evidence?.subject === 'string') subject = evidence.subject.trim();
    if (!topic && typeof evidence?.topic === 'string') topic = evidence.topic.trim();
    if (Array.isArray(evidence?.outstandingArms)) {
      for (const arm of evidence.outstandingArms) {
        const item = asRecord(arm);
        if (typeof item?.label === 'string') armLabels.push(item.label);
      }
    }
  }

  const course = [classLevel, subject].filter(Boolean).join(' ');
  const title =
    weeks.length > 1 && course
      ? `${course} · ${weeks.length} weeks not delivered`
      : briefing.title;

  const arms = formatArmList(armLabels);
  const weekLabel = formatWeekSpan(weeks);
  const topicLabel = weeks.length === 1 && topic ? `${weekLabel} (${topic})` : weekLabel;
  const detail = [topicLabel, arms].filter(Boolean).join(' · ') || null;

  return {
    key,
    type: 'SOW_GAP',
    title,
    detail,
    unread: members.some((member) => member.unread),
    insightId: briefing.id,
    href: insightListHref(briefing),
  };
}

function singleInboxRow(insight: LoisInboxInsight): LoisInboxRow {
  return {
    key: insight.id,
    type: insight.type,
    title: insight.title,
    detail: null,
    unread: !!insight.unread,
    insightId: insight.id,
    href: insightListHref(insight),
  };
}

/** Collapse repeated curriculum weeks for one scheme into a single row. */
export function groupLoisInboxRows(insights: LoisInboxInsight[]): LoisInboxRow[] {
  const sowBuckets = new Map<string, LoisInboxInsight[]>();
  for (const insight of insights) {
    if (insight.type !== 'SOW_GAP') continue;
    const key = sowGroupKey(insight);
    const bucket = sowBuckets.get(key) ?? [];
    bucket.push(insight);
    sowBuckets.set(key, bucket);
  }

  const emitted = new Set<string>();
  const rows: LoisInboxRow[] = [];
  for (const insight of insights) {
    if (insight.type === 'SOW_GAP') {
      const key = sowGroupKey(insight);
      if (emitted.has(key)) continue;
      emitted.add(key);
      rows.push(sowInboxRow(key, sowBuckets.get(key) ?? [insight]));
      continue;
    }
    rows.push(singleInboxRow(insight));
  }
  return rows;
}

/**
 * Two rows on the dashboard. One curriculum group at most, unless that is all
 * Lois has filed — otherwise grades and fees get pushed off the preview.
 */
export function previewLoisInboxRows(rows: LoisInboxRow[]): { visible: LoisInboxRow[]; hidden: number } {
  const visible: LoisInboxRow[] = [];
  const deferredSow: LoisInboxRow[] = [];
  let sowUsed = 0;
  let index = 0;

  for (; index < rows.length && visible.length < LOIS_INBOX_PREVIEW_LIMIT; index += 1) {
    const row = rows[index];
    if (row.type === 'SOW_GAP' && sowUsed >= 1) {
      deferredSow.push(row);
      continue;
    }
    if (row.type === 'SOW_GAP') sowUsed += 1;
    visible.push(row);
  }

  const unseen = rows.length - index;
  while (visible.length < LOIS_INBOX_PREVIEW_LIMIT && deferredSow.length > 0) {
    const next = deferredSow.shift();
    if (next) visible.push(next);
  }

  return { visible, hidden: deferredSow.length + unseen };
}
