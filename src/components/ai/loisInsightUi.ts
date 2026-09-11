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
