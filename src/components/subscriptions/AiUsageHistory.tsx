'use client';

import React, { useMemo, useState } from 'react';
import {
  useGetAiUsageHistoryQuery,
  type AiUsageLogDto,
  type AiUsagePeriod,
} from '@/lib/store/api/subscriptionsApi';
import { ChevronDown } from 'lucide-react';
import { FadeInUp } from '@/components/ui/FadeInUp';
import { cn } from '@/lib/utils';
import { LoisOrb } from '@/components/ai/LoisOrb';

const PERIODS: { key: AiUsagePeriod; label: string }[] = [
  { key: 'day', label: 'Day' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
];

const PERIOD_EMPTY: Record<AiUsagePeriod, string> = {
  day: 'today',
  week: 'this week',
  month: 'this month',
};

const ACTION_NAMES: Record<string, string> = {
  generate_quiz: 'Quiz generation',
  generate_assessment: 'Full assessment',
  generate_lesson_plan: 'Lesson planning',
  grade_essay: 'Essay grading',
  generate_flashcards: 'Flashcard set',
  generate_summary: 'Study summary',
  ai_chat: 'Lois chat',
  ai_chat_stream: 'Lois chat',
};

const AVATAR_TONES = [
  'bg-blue-600 text-white',
  'bg-violet-600 text-white',
  'bg-emerald-600 text-white',
  'bg-amber-500 text-white',
  'bg-rose-600 text-white',
  'bg-cyan-600 text-white',
  'bg-indigo-600 text-white',
  'bg-teal-600 text-white',
];

const ROW_GRID =
  'grid grid-cols-[2rem_minmax(0,1fr)_5.5rem] sm:grid-cols-[2rem_minmax(0,1.5fr)_minmax(0,1fr)_5.5rem_6.5rem] items-center gap-3 px-5';

function actionLabel(action: string): string {
  if (ACTION_NAMES[action]) return ACTION_NAMES[action];
  return action.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function personName(user: AiUsageLogDto['user']): string {
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  return name || user.email || 'Unknown';
}

function firstInitial(name: string): string {
  return (name.trim()[0] || '?').toUpperCase();
}

function avatarTone(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash + id.charCodeAt(i) * (i + 1)) % AVATAR_TONES.length;
  return AVATAR_TONES[hash];
}

type LeaderboardRow = {
  userId: string;
  name: string;
  profileImage: string | null;
  totalCredits: number;
  actionCount: number;
  topAction: string;
};

function groupByPerson(logs: AiUsageLogDto[]): LeaderboardRow[] {
  const map = new Map<
    string,
    LeaderboardRow & { actionCredits: Record<string, number> }
  >();

  for (const log of logs) {
    const existing = map.get(log.user.id);
    if (!existing) {
      map.set(log.user.id, {
        userId: log.user.id,
        name: personName(log.user),
        profileImage: log.user.profileImage ?? null,
        totalCredits: log.creditsUsed,
        actionCount: 1,
        topAction: log.action,
        actionCredits: { [log.action]: log.creditsUsed },
      });
      continue;
    }
    existing.totalCredits += log.creditsUsed;
    existing.actionCount += 1;
    existing.actionCredits[log.action] = (existing.actionCredits[log.action] ?? 0) + log.creditsUsed;
  }

  return [...map.values()]
    .map((row) => {
      const topAction = Object.entries(row.actionCredits).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'unknown';
      return {
        userId: row.userId,
        name: row.name,
        profileImage: row.profileImage,
        totalCredits: row.totalCredits,
        actionCount: row.actionCount,
        topAction,
      };
    })
    .sort((a, b) => b.totalCredits - a.totalCredits);
}

export const AiUsageHistory: React.FC = () => {
  const [period, setPeriod] = useState<AiUsagePeriod>('week');
  const { data, isLoading, isError, isFetching } = useGetAiUsageHistoryQuery(period);

  const people = useMemo(() => groupByPerson(data?.data ?? []), [data?.data]);

  const periodToggle = (
    <div
      className="inline-flex rounded-lg border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg p-0.5"
      role="group"
      aria-label="Usage period"
    >
      {PERIODS.map((item) => (
        <button
          key={item.key}
          type="button"
          aria-pressed={period === item.key}
          onClick={() => setPeriod(item.key)}
          className={cn(
            'px-2.5 py-1 rounded-md font-medium transition-colors',
            period === item.key
              ? 'bg-[var(--light-card)] dark:bg-[var(--dark-card)] text-light-text-primary dark:text-dark-text-primary shadow-sm'
              : 'text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text-primary dark:hover:text-dark-text-primary',
          )}
          style={{ fontSize: 'var(--text-small)' }}
        >
          {item.label}
        </button>
      ))}
    </div>
  );

  return (
    <FadeInUp
      duration={0.35}
      className={cn(
        'rounded-2xl border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-surface overflow-hidden',
        isFetching && !isLoading && 'opacity-80',
      )}
    >
      <div className="flex items-center justify-between gap-3 px-5 py-4">
        <h3
          className="font-semibold text-light-text-primary dark:text-dark-text-primary"
          style={{ fontSize: 'var(--text-card-title)' }}
        >
          Usage Leaderboard
        </h3>
        {periodToggle}
      </div>

      {isLoading ? (
        <div>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-[3.25rem] border-t border-light-border dark:border-dark-border animate-pulse bg-light-bg/40 dark:bg-dark-bg/40"
            />
          ))}
        </div>
      ) : isError || !data?.success ? (
        <div className="px-5 py-16 text-center border-t border-light-border dark:border-dark-border">
          <p className="text-light-text-secondary dark:text-dark-text-secondary">
            Failed to load AI usage.
          </p>
        </div>
      ) : people.length === 0 ? (
        <div className="px-5 py-16 text-center border-t border-light-border dark:border-dark-border">
          <div className="w-12 h-12 bg-light-bg dark:bg-dark-bg rounded-full flex items-center justify-center mx-auto mb-4">
            <LoisOrb size="sm" />
          </div>
          <p className="font-medium text-light-text-primary dark:text-dark-text-primary mb-1">
            No usage {PERIOD_EMPTY[period]}
          </p>
          <p className="text-light-text-secondary dark:text-dark-text-secondary" style={{ fontSize: 'var(--text-small)' }}>
            Staff credit totals will appear here as they use Lois.
          </p>
        </div>
      ) : (
        <>
          <div
            className={cn(
              ROW_GRID,
              'py-2 border-t border-light-border dark:border-dark-border text-light-text-muted dark:text-dark-text-muted',
            )}
            style={{ fontSize: 'var(--text-small)' }}
          >
            <span />
            <span>User</span>
            <span className="hidden sm:block">Top action</span>
            <span className="hidden sm:block text-right">Actions</span>
            <span className="inline-flex items-center justify-end gap-1 text-light-text-primary dark:text-dark-text-primary">
              <ChevronDown className="w-3.5 h-3.5" />
              Credits
            </span>
          </div>

          <ul className="overflow-y-auto" style={{ maxHeight: '28rem' }}>
            {people.map((person, index) => (
              <li
                key={person.userId}
                className={cn(
                  ROW_GRID,
                  'py-2.5 border-t border-light-border dark:border-dark-border',
                  'hover:bg-light-bg/70 dark:hover:bg-dark-bg/40 transition-colors',
                )}
              >
                <span
                  className="text-right tabular-nums text-light-text-muted dark:text-dark-text-muted"
                  style={{ fontSize: 'var(--text-small)' }}
                >
                  {index + 1}
                </span>

                <div className="flex items-center gap-2.5 min-w-0">
                  {person.profileImage ? (
                    <img
                      src={person.profileImage}
                      alt=""
                      className="w-7 h-7 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div
                      className={cn(
                        'w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[11px] font-semibold',
                        avatarTone(person.userId),
                      )}
                    >
                      {firstInitial(person.name)}
                    </div>
                  )}
                  <span
                    className="truncate font-medium text-light-text-primary dark:text-dark-text-primary"
                    style={{ fontSize: 'var(--text-body)' }}
                  >
                    {person.name}
                  </span>
                </div>

                <span
                  className="hidden sm:block truncate text-light-text-secondary dark:text-dark-text-secondary"
                  style={{ fontSize: 'var(--text-body)' }}
                >
                  {actionLabel(person.topAction)}
                </span>

                <span
                  className="hidden sm:block text-right tabular-nums text-light-text-primary dark:text-dark-text-primary"
                  style={{ fontSize: 'var(--text-body)' }}
                >
                  {person.actionCount.toLocaleString()}
                </span>

                <span
                  className="text-right tabular-nums text-light-text-primary dark:text-dark-text-primary"
                  style={{ fontSize: 'var(--text-body)' }}
                >
                  {person.totalCredits.toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </FadeInUp>
  );
};
