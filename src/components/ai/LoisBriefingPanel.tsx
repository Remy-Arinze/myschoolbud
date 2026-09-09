'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import {
  useGetLoisInsightQuery,
  useGetLoisInsightsQuery,
  useMarkLoisInsightReadMutation,
  type LoisInsightDto,
} from '@/lib/store/api/aiApi';
import { cn } from '@/lib/utils';
import { evidenceLines, LOIS_INSIGHT_TYPE_LABEL } from './loisInsightUi';

function severityLabel(severity: string) {
  if (severity === 'critical') return 'Urgent';
  if (severity === 'info') return 'Note';
  return 'Attention';
}

function BriefingReport({
  insight,
  onAsk,
}: {
  insight: LoisInsightDto;
  onAsk?: (prompt: string) => void;
}) {
  const lines = evidenceLines(insight.type, insight.evidence);
  const prompt = insight.askPrompt || `Explain this insight: ${insight.title}`;

  return (
    <div className="px-3 pb-3">
      <p
        className="text-light-text-secondary dark:text-dark-text-secondary leading-relaxed"
        style={{ fontSize: 'var(--lois-body)' }}
      >
        {insight.summary}
      </p>
      {lines.length > 0 ? (
        <ul className="mt-2.5 space-y-1">
          {lines.map((line, i) => (
            <li
              key={`${line.label}-${i}`}
              className="flex items-baseline justify-between gap-3 text-light-text-primary dark:text-dark-text-primary"
              style={{ fontSize: 'var(--lois-small)' }}
            >
              <span className="min-w-0 truncate">{line.label}</span>
              {line.detail ? (
                <span className="shrink-0 tabular-nums text-light-text-muted dark:text-dark-text-muted">
                  {line.detail}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {onAsk ? (
          <button
            type="button"
            className="rounded-md bg-[var(--agora-blue)] px-2.5 py-1 font-medium text-white"
            style={{ fontSize: 'var(--lois-small)' }}
            onClick={() => onAsk(prompt)}
          >
            Ask about this
          </button>
        ) : null}
        {insight.href ? (
          <Link
            href={insight.href}
            className="rounded-md px-2.5 py-1 font-medium text-light-text-secondary dark:text-dark-text-secondary hover:text-[var(--agora-blue)]"
            style={{ fontSize: 'var(--lois-small)' }}
          >
            Open list
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export function LoisBriefingPanel({
  schoolId,
  focusInsightId,
  compact,
  onAsk,
  onEmpty,
}: {
  schoolId: string;
  focusInsightId?: string | null;
  compact?: boolean;
  onAsk?: (prompt: string) => void;
  onEmpty?: () => void;
}) {
  const { data, isLoading, isError } = useGetLoisInsightsQuery(
    { schoolId, limit: 15 },
    { skip: !schoolId },
  );
  const { data: focused, isError: focusError, isFetching: focusFetching } = useGetLoisInsightQuery(
    { schoolId, insightId: focusInsightId || '' },
    { skip: !schoolId || !focusInsightId },
  );
  const [markRead] = useMarkLoisInsightReadMutation();
  const [expandedId, setExpandedId] = useState<string | null>(focusInsightId || null);
  const [sessionIds, setSessionIds] = useState<string[] | null>(null);

  const catalog = useMemo(() => {
    const list = [...(data?.data ?? [])];
    const extra = focused?.data;
    if (extra && !list.some((row) => row.id === extra.id)) {
      list.unshift(extra);
    }
    return list;
  }, [data?.data, focused?.data]);

  useEffect(() => {
    if (sessionIds !== null || isLoading || !data) return;
    if (focusInsightId && focusFetching && !focused) return;
    const unread = catalog.filter((row) => row.unread).map((row) => row.id);
    if (focusInsightId && !focusError && !unread.includes(focusInsightId)) unread.unshift(focusInsightId);
    setSessionIds(unread);
  }, [catalog, data, focusError, focusFetching, focusInsightId, focused, isLoading, sessionIds]);

  const items = useMemo(() => {
    if (!sessionIds) return [];
    const byId = new Map(catalog.map((row) => [row.id, row]));
    return sessionIds.map((id) => byId.get(id)).filter((row): row is LoisInsightDto => !!row);
  }, [catalog, sessionIds]);

  useEffect(() => {
    if (isLoading || sessionIds === null) return;
    if (sessionIds.length === 0) onEmpty?.();
  }, [isLoading, onEmpty, sessionIds]);

  useEffect(() => {
    if (focusInsightId) {
      setExpandedId(focusInsightId);
      return;
    }
    if (!expandedId && items[0]) setExpandedId(items[0].id);
  }, [focusInsightId, items, expandedId]);

  useEffect(() => {
    if (!expandedId || !schoolId) return;
    const current = items.find((row) => row.id === expandedId);
    if (!current?.unread) return;
    void markRead({ schoolId, insightId: expandedId });
  }, [expandedId, items, markRead, schoolId]);

  if (isLoading) {
    return (
      <div className="px-3 pt-4 pb-2">
        <div className="h-16 rounded-lg border border-[var(--light-border)] dark:border-[var(--dark-border)] animate-pulse" />
      </div>
    );
  }

  if (isError || items.length === 0) return null;

  const unreadCount = items.length;

  if (compact) {
    const current = items.find((row) => row.id === expandedId) || items[0];
    return (
      <div className="px-3 pt-3">
        <button
          type="button"
          onClick={() => setExpandedId((id) => (id === current.id ? null : current.id))}
          className="w-full rounded-lg border border-[var(--light-border)] dark:border-[var(--dark-border)] bg-[var(--light-card)] dark:bg-[var(--dark-surface)] px-3 py-2 text-left"
        >
          <div className="flex items-center justify-between gap-2">
            <p
              className="font-medium text-light-text-primary dark:text-dark-text-primary truncate"
              style={{ fontSize: 'var(--lois-small)' }}
            >
              {current.title}
            </p>
            <ChevronDown
              className={cn('h-3.5 w-3.5 shrink-0 text-light-text-muted transition-transform', expandedId === current.id && 'rotate-180')}
            />
          </div>
        </button>
        {expandedId === current.id ? (
          <div className="mt-2 rounded-lg border border-[var(--light-border)] dark:border-[var(--dark-border)] overflow-hidden">
            <BriefingReport insight={current} onAsk={onAsk} />
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <section className="px-3 pt-3 pb-1" aria-label="Lois briefing">
      <div className="mb-2 flex items-center justify-between gap-2 px-0.5">
        <p
          className="font-semibold text-light-text-primary dark:text-dark-text-primary"
          style={{ fontSize: 'var(--lois-title)' }}
        >
          Ready to read
        </p>
        <span className="text-light-text-muted dark:text-dark-text-muted" style={{ fontSize: 'var(--lois-tiny)' }}>
          {unreadCount} briefing{unreadCount === 1 ? '' : 's'}
        </span>
      </div>
      <ul className="space-y-2">
        {items.map((insight) => {
          const open = expandedId === insight.id;
          return (
            <li
              key={insight.id}
              className="rounded-lg border border-[var(--light-border)] dark:border-[var(--dark-border)] bg-[var(--light-card)] dark:bg-[var(--dark-surface)] overflow-hidden"
            >
              <button
                type="button"
                className="w-full px-3 py-2.5 text-left"
                onClick={() => setExpandedId(open && items.length > 1 ? null : insight.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <p
                    className="font-medium text-light-text-primary dark:text-dark-text-primary leading-snug"
                    style={{ fontSize: 'var(--lois-body)' }}
                  >
                    {insight.unread && !open ? (
                      <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[var(--agora-blue)] align-middle" />
                    ) : null}
                    {insight.title}
                  </p>
                  <span
                    className="shrink-0 text-light-text-muted dark:text-dark-text-muted"
                    style={{ fontSize: 'var(--lois-tiny)' }}
                  >
                    {LOIS_INSIGHT_TYPE_LABEL[insight.type] || severityLabel(insight.severity)}
                  </span>
                </div>
              </button>
              {open ? <BriefingReport insight={insight} onAsk={onAsk} /> : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
