'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import { useGetLoisInsightsQuery } from '@/lib/store/api/aiApi';
import { useLoisWorkspaceOptional } from './LoisWorkspace';
import { LoisOrb } from './LoisOrb';
import { cn } from '@/lib/utils';
import {
  groupLoisInboxRows,
  insightListLabel,
  LOIS_INSIGHT_TYPE_LABEL,
  previewLoisInboxRows,
} from './loisInsightUi';

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
    { schoolId, limit: 12 },
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
  const preview = useMemo(
    () => previewLoisInboxRows(groupLoisInboxRows(visible)),
    [visible],
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
      className="mb-6 rounded-lg border border-[var(--light-border)] dark:border-[var(--dark-border)] bg-[var(--light-card)] dark:bg-[var(--dark-surface)] p-4"
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
      <ul className="divide-y divide-[var(--light-border)] dark:divide-[var(--dark-border)]">
        {preview.visible.map((row) => (
          <li key={row.key} className="py-3 first:pt-0 last:pb-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex items-start gap-2 font-medium text-light-text-primary dark:text-dark-text-primary">
                  {row.unread ? (
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" aria-hidden />
                  ) : null}
                  <span className="min-w-0">{row.title}</span>
                </p>
                {row.detail ? (
                  <p
                    className="mt-0.5 truncate text-light-text-secondary dark:text-dark-text-secondary"
                    style={{ fontSize: 'var(--text-small)' }}
                  >
                    {row.detail}
                  </p>
                ) : null}
                <div className="mt-1.5 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    className="font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                    style={{ fontSize: 'var(--text-small)' }}
                    onClick={() => workspace?.openBriefing(row.insightId)}
                  >
                    {row.unread ? 'Read briefing' : 'Open in Lois'}
                  </button>
                  {row.href ? (
                    <Link
                      href={row.href}
                      className="text-light-text-secondary hover:underline dark:text-dark-text-secondary"
                      style={{ fontSize: 'var(--text-small)' }}
                    >
                      {insightListLabel(row.type)}
                    </Link>
                  ) : null}
                </div>
              </div>
              {LOIS_INSIGHT_TYPE_LABEL[row.type] ? (
                <span
                  className="shrink-0 text-light-text-muted dark:text-dark-text-muted"
                  style={{ fontSize: 'var(--text-small)' }}
                >
                  {LOIS_INSIGHT_TYPE_LABEL[row.type]}
                </span>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
      {preview.hidden > 0 ? (
        <button
          type="button"
          className="mt-3 font-medium text-indigo-600 hover:underline dark:text-indigo-400"
          style={{ fontSize: 'var(--text-small)' }}
          onClick={() => workspace?.openBriefing()}
        >
          +{preview.hidden} more
        </button>
      ) : null}
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
