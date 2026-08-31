'use client';

import Link from 'next/link';
import {
  Check,
  ChevronDown,
  ChevronRight,
  ListChecks,
  X,
} from 'lucide-react';
import { FadeInUp } from '@/components/ui/FadeInUp';
import { cn } from '@/lib/utils';
import { useSchoolSetupProgress } from '@/hooks/useSchoolSetupProgress';

/**
 * Quiet overview checklist — sits above stats without competing with the welcome header.
 * New schools see the full foundation list; later terms only surface term-scoped todos
 * (timetable, curriculum, midterm/exam dates, holidays).
 * Collapses to a slim progress row; dismissible; reopen via restore link when hidden.
 */
export function SchoolSetupChecklist() {
  const {
    steps,
    completedCount,
    totalCount,
    isComplete,
    nextStep,
    isLoading,
    dismissed,
    collapsed,
    dismiss,
    restore,
    toggleCollapsed,
    expand,
    progress,
  } = useSchoolSetupProgress();

  if (isLoading) return null;

  const checklistTitle = progress?.isFoundationComplete
    ? 'This term’s checklist'
    : 'Getting your school ready';

  if (dismissed && !isComplete) {
    return (
      <FadeInUp from={{ opacity: 0, y: 8 }} to={{ opacity: 1, y: 0 }} className="mb-5">
        <button
          type="button"
          onClick={restore}
          className="group inline-flex items-center gap-2 text-light-text-muted dark:text-dark-text-muted hover:text-light-text-secondary dark:hover:text-dark-text-secondary transition-colors"
          style={{ fontSize: 'var(--text-small)' }}
        >
          <ListChecks className="h-3.5 w-3.5 opacity-70 group-hover:opacity-100" />
          <span>
            Setup {completedCount}/{totalCount} — show guide
          </span>
        </button>
      </FadeInUp>
    );
  }

  if (dismissed && isComplete) return null;

  if (isComplete) {
    return (
      <FadeInUp from={{ opacity: 0, y: 8 }} to={{ opacity: 1, y: 0 }} className="mb-5">
        <div className="flex items-center justify-between gap-3 rounded-lg border border-emerald-200/70 dark:border-emerald-800/40 bg-emerald-50/50 dark:bg-emerald-950/20 px-4 py-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
            </span>
            <p
              className="text-light-text-primary dark:text-dark-text-primary font-medium truncate"
              style={{ fontSize: 'var(--text-body)' }}
            >
              {progress?.isFoundationComplete
                ? 'This term’s checklist is complete'
                : 'Your school is set up'}
            </p>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="shrink-0 rounded-md p-1 text-light-text-muted hover:bg-emerald-100/80 dark:hover:bg-emerald-900/40 transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </FadeInUp>
    );
  }

  const percent = Math.round((completedCount / totalCount) * 100);

  return (
    <FadeInUp from={{ opacity: 0, y: 8 }} to={{ opacity: 1, y: 0 }} className="mb-5">
      <div className="rounded-lg border border-[var(--light-border)] dark:border-[var(--dark-border)] bg-[var(--light-card)] dark:bg-[var(--dark-surface)] overflow-hidden">
        {/* Summary row — always visible */}
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={toggleCollapsed}
            className="flex flex-1 items-center gap-3 min-w-0 text-left group"
            aria-expanded={!collapsed}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[var(--agora-blue)]/10 text-[var(--agora-blue)]">
              <ListChecks className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p
                  className="font-medium text-light-text-primary dark:text-dark-text-primary"
                  style={{ fontSize: 'var(--text-body)' }}
                >
                  {checklistTitle}
                </p>
                <span
                  className="text-light-text-muted dark:text-dark-text-muted tabular-nums"
                  style={{ fontSize: 'var(--text-small)' }}
                >
                  {completedCount}/{totalCount}
                </span>
              </div>
              <div className="mt-1.5 h-1 w-full max-w-[220px] rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-[var(--agora-blue)] transition-all duration-500"
                  style={{ width: `${percent}%` }}
                />
              </div>
              {collapsed && nextStep && (
                <p
                  className="mt-1.5 text-light-text-secondary dark:text-dark-text-secondary truncate"
                  style={{ fontSize: 'var(--text-small)' }}
                >
                  Next: {nextStep.title}
                </p>
              )}
            </div>
            <span className="shrink-0 text-light-text-muted group-hover:text-light-text-secondary transition-colors">
              {collapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </span>
          </button>

          <button
            type="button"
            onClick={dismiss}
            className="shrink-0 rounded-md p-1.5 text-light-text-muted hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
            aria-label="Hide setup guide"
            title="Hide for now"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Expanded steps */}
        {!collapsed && (
          <div className="border-t border-[var(--light-border)] dark:border-[var(--dark-border)] px-2 py-2 sm:px-3">
            <ul className="space-y-0.5">
              {steps.map((step) => (
                <li key={step.id}>
                  <Link
                    href={step.href}
                    onClick={expand}
                    className={cn(
                      'flex items-start gap-3 rounded-md px-2.5 py-2.5 transition-colors',
                      step.done
                        ? 'opacity-60 hover:opacity-80'
                        : 'hover:bg-gray-50 dark:hover:bg-white/[0.03]'
                    )}
                  >
                    <span
                      className={cn(
                        'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                        step.done
                          ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : 'border-gray-300 dark:border-white/20 text-transparent'
                      )}
                    >
                      {step.done && <Check className="h-3 w-3" strokeWidth={2.5} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          'block font-medium',
                          step.done
                            ? 'text-light-text-secondary dark:text-dark-text-secondary line-through decoration-light-text-muted/40'
                            : 'text-light-text-primary dark:text-dark-text-primary'
                        )}
                        style={{ fontSize: 'var(--text-body)' }}
                      >
                        {step.title}
                      </span>
                      <span
                        className="block mt-0.5 text-light-text-muted dark:text-dark-text-muted leading-snug"
                        style={{ fontSize: 'var(--text-small)' }}
                      >
                        {step.description}
                      </span>
                    </span>
                    {!step.done && (
                      <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-light-text-muted" />
                    )}
                  </Link>
                </li>
              ))}
            </ul>
            <p
              className="px-2.5 pt-1 pb-2 text-light-text-muted dark:text-dark-text-muted"
              style={{ fontSize: 'var(--text-small)' }}
            >
              Work these in any order — we’ll check them off from your real data.
            </p>
          </div>
        )}
      </div>
    </FadeInUp>
  );
}
