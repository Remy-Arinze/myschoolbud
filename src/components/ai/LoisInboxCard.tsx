'use client';

import Link from 'next/link';
import { useGetLoisInsightsQuery } from '@/lib/store/api/aiApi';
import { useLoisWorkspaceOptional } from './LoisWorkspace';
import { LoisOrb } from './LoisOrb';
import { cn } from '@/lib/utils';

const TYPE_LABEL: Record<string, string> = {
  ACADEMIC_RISK: 'Grades',
  STUDENT_DROP: 'Performance',
  SOW_GAP: 'Curriculum',
  ATTENDANCE_RISK: 'Attendance',
  FEE_ARREARS: 'Fees',
  ADMISSIONS_BACKLOG: 'Admissions',
};

export function LoisInboxCard({ schoolId }: { schoolId: string }) {
  const workspace = useLoisWorkspaceOptional();
  const { data, isLoading, isError } = useGetLoisInsightsQuery(
    { schoolId, limit: 5 },
    { skip: !schoolId },
  );
  const insights = data?.data ?? [];

  if (isLoading || isError) return null;
  if (insights.length === 0) return null;

  return (
    <section
      className="mb-6 rounded-lg border border-[var(--light-border)] dark:border-[var(--dark-border)] bg-[var(--light-card)] dark:bg-[var(--dark-surface)] p-5"
      aria-label="Lois noticed"
    >
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <LoisOrb size="xs" />
          <h2 className="font-semibold text-light-text-primary dark:text-dark-text-primary">
            Lois noticed
          </h2>
        </div>
        <span className="text-light-text-muted dark:text-dark-text-muted" style={{ fontSize: 'var(--text-small)' }}>
          For your access
        </span>
      </div>
      <ul className="space-y-3">
        {insights.map((insight) => (
          <li
            key={insight.id}
            className="rounded-md border border-[var(--light-border)] dark:border-[var(--dark-border)] px-3 py-3"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="font-medium text-light-text-primary dark:text-dark-text-primary">
                {insight.title}
              </p>
              {TYPE_LABEL[insight.type] ? (
                <span
                  className="shrink-0 text-light-text-muted dark:text-dark-text-muted"
                  style={{ fontSize: 'var(--text-small)' }}
                >
                  {TYPE_LABEL[insight.type]}
                </span>
              ) : null}
            </div>
            {insight.summary ? (
              <p
                className="mt-1 text-light-text-secondary dark:text-dark-text-secondary line-clamp-2"
                style={{ fontSize: 'var(--text-body)' }}
              >
                {insight.summary}
              </p>
            ) : null}
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
                style={{ fontSize: 'var(--text-small)' }}
                onClick={() =>
                  workspace?.askLois(
                    insight.askPrompt || `Explain this insight: ${insight.title}`,
                  )
                }
              >
                Ask Lois why
              </button>
              {insight.href ? (
                <Link
                  href={insight.href}
                  className="text-light-text-secondary dark:text-dark-text-secondary hover:underline"
                  style={{ fontSize: 'var(--text-small)' }}
                >
                  Open list
                </Link>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function LoisInsightBadge({ schoolId, className }: { schoolId?: string; className?: string }) {
  const { data } = useGetLoisInsightsQuery(
    { schoolId: schoolId || '', limit: 8 },
    { skip: !schoolId },
  );
  const count = data?.data?.length ?? 0;
  if (!count) return null;
  return (
    <span
      className={cn(
        'min-w-[18px] h-[18px] px-1 rounded-full bg-indigo-600 text-white text-[10px] font-semibold flex items-center justify-center',
        className,
      )}
    >
      {count > 9 ? '9+' : count}
    </span>
  );
}
