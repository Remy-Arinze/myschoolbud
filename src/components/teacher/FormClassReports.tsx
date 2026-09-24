'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Loader2, Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import {
  useGetClassAssessmentsQuery,
  useGetClassGradesGroupedByStudentsQuery,
} from '@/lib/store/api/schoolAdminApi';
import { cn } from '@/lib/utils';

const RISK_LINE = 45;
const PAGE_SIZE = 20;

type GradeRow = {
  id: string;
  assessmentName?: string | null;
  gradeType?: string | null;
  score: number;
  maxScore: number;
  isPublished?: boolean;
  subject?: string | null;
  teacher?: { firstName?: string | null; lastName?: string | null } | null;
};

type StudentRow = {
  student: { id: string; firstName: string; lastName: string };
  grades: GradeRow[];
};

type SubjectLine = {
  subject: string;
  exam: number | null;
  assessment: number | null;
};

function published(grades: GradeRow[]) {
  return grades.filter((grade) => grade.isPublished !== false && grade.maxScore > 0);
}

function weighted(grades: GradeRow[], types?: string[]) {
  const rows = published(grades).filter((grade) => !types || types.includes(grade.gradeType || ''));
  if (rows.length === 0) return null;
  const score = rows.reduce((sum, grade) => sum + Number(grade.score || 0), 0);
  const max = rows.reduce((sum, grade) => sum + Number(grade.maxScore || 0), 0);
  if (max <= 0) return null;
  return Math.round((score / max) * 1000) / 10;
}

function formatPercent(value: number | null) {
  return value == null ? '—' : `${value}%`;
}

function mean(values: Array<number | null>) {
  const nums = values.filter((value): value is number => value != null);
  if (nums.length === 0) return null;
  return Math.round((nums.reduce((sum, value) => sum + value, 0) / nums.length) * 10) / 10;
}

type WeakestSubject = { subject: string; average: number; teacher: string | null };

function leadTeacher(teachers: Map<string, number>): string | null {
  let teacher: string | null = null;
  let count = 0;
  for (const [name, teacherCount] of teachers) {
    if (teacherCount > count) {
      teacher = name;
      count = teacherCount;
    }
  }
  return teacher;
}

/** Lowest subject average. Equal averages keep the subject seen first; equal teacher counts keep the first name. */
function weakestSubject(
  bySubject: Map<string, { grades: GradeRow[]; teachers: Map<string, number> }>,
): WeakestSubject | null {
  let weakest: WeakestSubject | null = null;
  for (const [subject, bucket] of bySubject) {
    const average = weighted(bucket.grades);
    if (average == null) continue;
    if (weakest != null && average >= weakest.average) continue;
    weakest = { subject, average, teacher: leadTeacher(bucket.teachers) };
  }
  return weakest;
}

function subjectLines(grades: GradeRow[]): SubjectLine[] {
  const bySubject = new Map<string, GradeRow[]>();
  published(grades).forEach((grade) => {
    const subject = grade.subject?.trim() || 'Unnamed subject';
    const rows = bySubject.get(subject) || [];
    rows.push(grade);
    bySubject.set(subject, rows);
  });
  return Array.from(bySubject.entries())
    .map(([subject, rows]) => ({
      subject,
      exam: weighted(rows, ['EXAM']),
      assessment: weighted(rows, ['CA', 'ASSIGNMENT']),
    }))
    .sort((a, b) => a.subject.localeCompare(b.subject));
}

export function FormClassReports({
  schoolId,
  classId,
  termId,
  termName,
}: {
  schoolId: string;
  classId: string;
  termId?: string;
  termName?: string;
}) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<'name' | 'exam' | 'assessment'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);

  const { data: gradesResponse, isLoading: gradesLoading } = useGetClassGradesGroupedByStudentsQuery(
    { schoolId, classId, termId, report: true },
    { skip: !schoolId || !classId }
  );
  const { data: assessmentsResponse } = useGetClassAssessmentsQuery(
    { schoolId, classId, termId },
    { skip: !schoolId || !classId }
  );

  const students = (gradesResponse?.data || []) as StudentRow[];
  const assessments = assessmentsResponse?.data || [];

  const briefing = useMemo(() => {
    const publishedGrades = students.flatMap((row) => published(row.grades));
    const examByStudent = students.map((row) => weighted(row.grades, ['EXAM']));
    const assessmentByStudent = students.map((row) => weighted(row.grades, ['CA', 'ASSIGNMENT']));
    const under = students
      .map((row) => {
        const overall = weighted(row.grades);
        return {
          id: row.student.id,
          name: `${row.student.firstName} ${row.student.lastName}`,
          overall,
          exam: weighted(row.grades, ['EXAM']),
          assessment: weighted(row.grades, ['CA', 'ASSIGNMENT']),
        };
      })
      .filter((row) => row.overall != null && row.overall < RISK_LINE);

    const bySubject = new Map<string, { grades: GradeRow[]; teachers: Map<string, number> }>();
    publishedGrades.forEach((grade) => {
      const subject = grade.subject?.trim() || 'Unnamed subject';
      const bucket = bySubject.get(subject) || { grades: [], teachers: new Map<string, number>() };
      bucket.grades.push(grade);
      const teacherName = [grade.teacher?.firstName, grade.teacher?.lastName].filter(Boolean).join(' ');
      if (teacherName) bucket.teachers.set(teacherName, (bucket.teachers.get(teacherName) || 0) + 1);
      bySubject.set(subject, bucket);
    });

    return {
      enrolled: students.length,
      publishedCount: publishedGrades.length,
      examAverage: mean(examByStudent),
      assessmentAverage: mean(assessmentByStudent),
      under,
      weakest: weakestSubject(bySubject),
      assessmentTitles: assessments.filter((item) => item.status === 'PUBLISHED').length,
    };
  }, [students, assessments]);

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = students.filter((row) => {
      if (!query) return true;
      return `${row.student.firstName} ${row.student.lastName}`.toLowerCase().includes(query);
    });
    const sorted = [...filtered].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      if (sortKey === 'name') {
        return `${a.student.firstName} ${a.student.lastName}`.localeCompare(
          `${b.student.firstName} ${b.student.lastName}`
        ) * dir;
      }
      const left = weighted(a.grades, sortKey === 'exam' ? ['EXAM'] : ['CA', 'ASSIGNMENT']);
      const right = weighted(b.grades, sortKey === 'exam' ? ['EXAM'] : ['CA', 'ASSIGNMENT']);
      return ((left ?? -1) - (right ?? -1)) * dir;
    });
    return sorted;
  }, [students, search, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const visible = rows.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const setSort = (key: 'name' | 'exam' | 'assessment') => {
    setPage(0);
    if (sortKey === key) {
      setSortDir((dir) => (dir === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(key);
    setSortDir(key === 'name' ? 'asc' : 'asc');
  };

  if (gradesLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-[#2490FD]" />
      </div>
    );
  }

  const empty = briefing.publishedCount === 0;

  return (
    <div className="space-y-4">
      <div data-testid="form-reports-summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Summary label="Students enrolled" value={String(briefing.enrolled)} />
        <Summary label="Exam average" value={empty ? '—' : formatPercent(briefing.examAverage)} />
        <Summary label="Assessment average" value={empty ? '—' : formatPercent(briefing.assessmentAverage)} />
        <Summary label="Under 45%" value={empty ? '—' : String(briefing.under.length)} />
      </div>

      {empty ? (
        <Card>
          <CardContent className="py-8">
            <p className="font-heading text-[length:var(--text-body)] text-light-text-secondary dark:text-dark-text-secondary">
              The gradebook is empty{termName ? ` for ${termName}` : ' this term'}. Published exam and assessment scores will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="space-y-3 py-4">
            <p className="font-heading text-[length:var(--text-card-title)] font-medium text-light-text-primary dark:text-dark-text-primary">
              Class findings
            </p>
            {briefing.weakest && (
              <p className="font-heading text-[length:var(--text-body)] text-light-text-secondary dark:text-dark-text-secondary">
                Weakest subject this term is {briefing.weakest.subject} at {briefing.weakest.average}%
                {briefing.weakest.teacher ? `, entered by ${briefing.weakest.teacher}` : ''}.
              </p>
            )}
            <p className="font-heading text-[length:var(--text-small)] text-light-text-muted dark:text-dark-text-muted">
              {briefing.assessmentTitles} published assessment{briefing.assessmentTitles === 1 ? '' : 's'} this term.
              Scores below use the {RISK_LINE}% line.
            </p>
            {briefing.under.length > 0 && (
              <ul className="space-y-1">
                {briefing.under.map((student) => (
                  <li
                    key={student.id}
                    className="font-heading text-[length:var(--text-body)] text-light-text-primary dark:text-dark-text-primary"
                  >
                    {student.name}: exam {formatPercent(student.exam)}, assessment {formatPercent(student.assessment)}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-light-text-muted" />
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(0);
            }}
            placeholder="Search students"
            className="w-full rounded-xl border border-light-border bg-light-card py-2 pl-9 pr-3 font-heading text-[length:var(--text-body)] text-light-text-primary focus:border-[#2490FD] focus:outline-none dark:border-dark-border dark:bg-dark-card dark:text-dark-text-primary"
          />
        </div>
        <div className="flex gap-2">
          <SortButton label="Name" active={sortKey === 'name'} dir={sortDir} onClick={() => setSort('name')} />
          <SortButton label="Exam" active={sortKey === 'exam'} dir={sortDir} onClick={() => setSort('exam')} />
          <SortButton label="Assessment" active={sortKey === 'assessment'} dir={sortDir} onClick={() => setSort('assessment')} />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-light-border dark:border-dark-border">
        {visible.length === 0 ? (
          <p className="px-4 py-8 text-center font-heading text-[length:var(--text-body)] text-light-text-secondary dark:text-dark-text-secondary">
            No students match that search.
          </p>
        ) : (
          visible.map((row) => {
            const name = `${row.student.firstName} ${row.student.lastName}`;
            const open = openId === row.student.id;
            const lines = subjectLines(row.grades);
            return (
              <div key={row.student.id} className="border-b border-light-border last:border-b-0 dark:border-dark-border">
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : row.student.id)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-light-surface dark:hover:bg-dark-surface"
                >
                  <span className="min-w-0 flex-1 truncate font-heading text-[length:var(--text-body)] font-medium text-light-text-primary dark:text-dark-text-primary">
                    {name}
                  </span>
                  <span className="w-16 text-right font-heading text-[length:var(--text-small)] text-light-text-secondary dark:text-dark-text-secondary">
                    {formatPercent(weighted(row.grades, ['EXAM']))}
                  </span>
                  <span className="w-16 text-right font-heading text-[length:var(--text-small)] text-light-text-secondary dark:text-dark-text-secondary">
                    {formatPercent(weighted(row.grades, ['CA', 'ASSIGNMENT']))}
                  </span>
                  {open ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
                </button>
                {open && (
                  <div className="space-y-1 bg-light-surface/60 px-4 py-3 dark:bg-dark-surface/40">
                    {lines.length === 0 ? (
                      <p className="font-heading text-[length:var(--text-small)] text-light-text-secondary dark:text-dark-text-secondary">
                        No published scores yet.
                      </p>
                    ) : (
                      lines.map((line) => (
                        <div key={line.subject} className="flex items-center justify-between gap-3">
                          <span className="font-heading text-[length:var(--text-body)] text-light-text-primary dark:text-dark-text-primary">
                            {line.subject}
                          </span>
                          <span className="font-heading text-[length:var(--text-small)] text-light-text-secondary dark:text-dark-text-secondary">
                            Exam {formatPercent(line.exam)} · Assessment {formatPercent(line.assessment)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {rows.length > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <p className="font-heading text-[length:var(--text-small)] text-light-text-secondary dark:text-dark-text-secondary">
            {safePage * PAGE_SIZE + 1}–{Math.min(rows.length, (safePage + 1) * PAGE_SIZE)} of {rows.length}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={safePage === 0}
              onClick={() => setPage(safePage - 1)}
              className="rounded-lg border border-light-border px-3 py-1 font-heading text-[length:var(--text-small)] disabled:opacity-40 dark:border-dark-border"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={safePage >= pageCount - 1}
              onClick={() => setPage(safePage + 1)}
              className="rounded-lg border border-light-border px-3 py-1 font-heading text-[length:var(--text-small)] disabled:opacity-40 dark:border-dark-border"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-light-border bg-light-card px-4 py-3 dark:border-dark-border dark:bg-dark-card">
      <p className="font-heading text-[length:var(--text-small)] text-light-text-secondary dark:text-dark-text-secondary">
        {label}
      </p>
      <p className="mt-1 font-heading text-[length:var(--text-stat-value)] text-light-text-primary dark:text-dark-text-primary">
        {value}
      </p>
    </div>
  );
}

function SortButton({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: 'asc' | 'desc';
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-lg border px-3 py-1.5 font-heading text-[length:var(--text-small)]',
        active
          ? 'border-[#2490FD] text-[#2490FD]'
          : 'border-light-border text-light-text-secondary dark:border-dark-border dark:text-dark-text-secondary'
      )}
    >
      {label}
      {active ? (dir === 'asc' ? ' ↑' : ' ↓') : ''}
    </button>
  );
}
