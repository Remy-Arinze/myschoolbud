'use client';

import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

const SIZES = {
  xs: { box: 'h-4 w-4 rounded-md', icon: 'h-2.5 w-2.5' },
  sm: { box: 'h-6 w-6 rounded-lg', icon: 'h-3.5 w-3.5' },
  md: { box: 'h-9 w-9 rounded-xl', icon: 'h-4 w-4' },
  lg: { box: 'h-14 w-14 rounded-2xl', icon: 'h-6 w-6' },
} as const;

export function BudMark({
  size = 'md',
  className,
}: {
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const styles = SIZES[size];
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex shrink-0 items-center justify-center bg-amber-500 text-white shadow-sm shadow-amber-500/30',
        styles.box,
        className,
      )}
    >
      <Sparkles className={styles.icon} />
    </span>
  );
}
