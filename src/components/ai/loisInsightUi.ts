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
    return [{ label: topic, detail: week }];
  }
  return [];
}
