'use client';

import { AlertTriangle } from 'lucide-react';
import {
  calendarCoverageMessage,
  type CalendarCoverage,
  type CalendarCoverageVariant,
} from '@/lib/curriculum/calendar-coverage';

export function CalendarCoverageBanner({
  coverage,
  variant = 'imported',
}: {
  coverage?: CalendarCoverage | null;
  variant?: CalendarCoverageVariant;
}) {
  const message = calendarCoverageMessage(coverage, variant);
  if (!message) return null;

  return (
    <div className="flex items-start gap-2 rounded-lg border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-900/20 px-3 py-2">
      <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
      <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-200">
        {message}
      </p>
    </div>
  );
}
