'use client';

import Link from 'next/link';
import { ListChecks } from 'lucide-react';
import { useSidebar } from '@/components/ui/sidebar';
import { useSchoolSetupProgress } from '@/hooks/useSchoolSetupProgress';
import { cn } from '@/lib/utils';

/**
 * Discreet sidebar progress chip — only when setup is incomplete and not dismissed.
 */
export function SchoolSetupSidebarPill() {
  const { open } = useSidebar();
  const {
    completedCount,
    totalCount,
    isComplete,
    isLoading,
    dismissed,
    nextStep,
  } = useSchoolSetupProgress();

  if (isLoading || dismissed || isComplete) return null;

  const percent = Math.round((completedCount / totalCount) * 100);

  return (
    <Link
      href="/dashboard/school/overview"
      className={cn(
        'mb-3 mx-1 flex items-center gap-2.5 rounded-lg border border-[var(--light-border)] dark:border-[var(--dark-border)]',
        'bg-[var(--light-card)] dark:bg-[var(--dark-surface)]',
        'hover:border-[var(--agora-blue)]/35 transition-colors',
        open ? 'px-2.5 py-2' : 'px-2 py-2 justify-center'
      )}
      title={nextStep ? `Next: ${nextStep.title}` : 'School setup'}
    >
      <span className="relative flex h-7 w-7 shrink-0 items-center justify-center">
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 28 28" aria-hidden>
          <circle
            cx="14"
            cy="14"
            r="11"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-gray-200 dark:text-white/10"
          />
          <circle
            cx="14"
            cy="14"
            r="11"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 11}`}
            strokeDashoffset={`${2 * Math.PI * 11 * (1 - percent / 100)}`}
            className="text-[var(--agora-blue)] transition-all duration-500"
          />
        </svg>
        <ListChecks className="h-3 w-3 text-[var(--agora-blue)] relative z-10" />
      </span>
      {open && (
        <span className="min-w-0 flex-1 overflow-hidden">
          <span
            className="block font-medium text-light-text-primary dark:text-dark-text-primary truncate"
            style={{ fontSize: 'var(--text-small)' }}
          >
            Setup {completedCount}/{totalCount}
          </span>
          {nextStep && (
            <span
              className="block text-light-text-muted dark:text-dark-text-muted truncate"
              style={{ fontSize: '10px' }}
            >
              {nextStep.title}
            </span>
          )}
        </span>
      )}
    </Link>
  );
}
