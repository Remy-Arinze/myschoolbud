'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import { useGetLoisInsightsQuery } from '@/lib/store/api/aiApi';
import { useLoisWorkspaceOptional } from './LoisWorkspace';
import { LoisOrb } from './LoisOrb';
import { cn } from '@/lib/utils';
import { insightListHref, insightListLabel, LOIS_INSIGHT_TYPE_LABEL } from './loisInsightUi';

export function useUnreadLoisInsightCount(schoolId?: string) {
  const { data } = useGetLoisInsightsQuery(
    { schoolId: schoolId || '', limit: 8 },
    { skip: !schoolId },
  );
  return (data?.data ?? []).filter((insight) => insight.unread).length;
}

function dismissedKey(schoolId: string) {
  return `lois-noticed-dismissed:${schoolId}`;
}

function readDismissed(schoolId: string): Set<string> {
  try {
    const raw = sessionStorage.getItem(dismissedKey(schoolId));
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : []);
  } catch {
    return new Set();
  }
}

export function LoisInboxCard({ schoolId }: { schoolId: string }) {
  const workspace = useLoisWorkspaceOptional();
  const { data, isLoading, isError } = useGetLoisInsightsQuery(
    { schoolId, limit: 5 },
    { skip: !schoolId },
  );
  const insights = data?.data ?? [];
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setDismissed(readDismissed(schoolId));
  }, [schoolId]);

  const visible = useMemo(
    () => insights.filter((insight) => !dismissed.has(insight.id)),
    [dismissed, insights],
  );

  if (isLoading || isError) return null;
  if (visible.length === 0) return null;

  const dismissCard = () => {
    const next = new Set(dismissed);
    for (const insight of insights) next.add(insight.id);
    setDismissed(next);
    try {
      sessionStorage.setItem(dismissedKey(schoolId), JSON.stringify([...next]));
    } catch {
      // ignore quota / private mode
    }
  };

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
        <div className="flex items-center gap-2">
          <span className="text-light-text-muted dark:text-dark-text-muted" style={{ fontSize: 'var(--text-small)' }}>
            For your access
          </span>
          <button
            type="button"
            onClick={dismissCard}
            className="rounded-md p-1 text-light-text-muted dark:text-dark-text-muted hover:bg-black/5 dark:hover:bg-white/10 hover:text-light-text-primary dark:hover:text-dark-text-primary"
            aria-label="Dismiss Lois noticed"
            title="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      <ul className="space-y-3">
        {visible.map((insight) => {
          const listHref = insightListHref(insight);
          return (
            <li
              key={insight.id}
              className={cn(
                'rounded-md border border-[var(--light-border)] dark:border-[var(--dark-border)] px-3 py-3',
                insight.unread && 'bg-[var(--agora-blue)]/[0.04]',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium text-light-text-primary dark:text-dark-text-primary">
                  {insight.title}
                </p>
                {LOIS_INSIGHT_TYPE_LABEL[insight.type] ? (
                  <span
                    className="shrink-0 text-light-text-muted dark:text-dark-text-muted"
                    style={{ fontSize: 'var(--text-small)' }}
                  >
                    {LOIS_INSIGHT_TYPE_LABEL[insight.type]}
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
                  onClick={() => workspace?.openBriefing(insight.id)}
                >
                  {insight.unread ? 'Read briefing' : 'Open in Lois'}
                </button>
                {listHref ? (
                  <Link
                    href={listHref}
                    className="text-light-text-secondary dark:text-dark-text-secondary hover:underline"
                    style={{ fontSize: 'var(--text-small)' }}
                  >
                    {insightListLabel(insight.type)}
                  </Link>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function LoisInsightBadge({ schoolId, className }: { schoolId?: string; className?: string }) {
  const count = useUnreadLoisInsightCount(schoolId);
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
