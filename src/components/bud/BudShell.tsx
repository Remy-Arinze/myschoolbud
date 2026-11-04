'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { FadeInUp } from '@/components/ui/FadeInUp';
import { Skeleton } from '@/components/ui/Skeleton';

export function BudShell({
  children,
  className,
  wide = false,
  plain = false,
}: {
  children: ReactNode;
  className?: string;
  wide?: boolean;
  plain?: boolean;
}) {
  return (
    <div className={cn('mx-auto w-full px-4 pb-28 pt-6 sm:px-6', wide ? 'max-w-4xl' : 'max-w-3xl', className)}>
      <FadeInUp>
        {plain ? (
          children
        ) : (
          <div className="relative overflow-hidden rounded-[2.5rem] border border-amber-100/50 bg-white/70 p-6 shadow-xl shadow-amber-500/5 backdrop-blur-xl dark:border-white/10 dark:bg-[var(--dark-surface)]/70 sm:p-8">
            <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-amber-400/20 blur-3xl" />
            <div className="relative">{children}</div>
          </div>
        )}
      </FadeInUp>
    </div>
  );
}

export function BudPageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-28 pt-6 sm:px-6">
      <Skeleton className="h-[28rem] w-full rounded-[2.5rem]" />
    </div>
  );
}

export function uniqueTopicLabels(topics: { label?: string }[] | undefined) {
  const seen = new Set<string>();
  const labels: string[] = [];
  for (const topic of topics || []) {
    const label = topic.label?.trim();
    if (!label || seen.has(label)) continue;
    seen.add(label);
    labels.push(label);
  }
  return labels;
}
