'use client';

import { Card, CardContent } from '@/components/ui/Card';
import { FadeInUp } from '@/components/ui/FadeInUp';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon?: React.ReactNode;
  trend?: number;
  description?: string;
  color?: 'blue' | 'purple' | 'green' | 'indigo' | 'amber' | 'rose';
  compact?: boolean;
}

export function StatCard({
  title,
  value,
  change,
  changeType = 'neutral',
  icon,
  trend,
  description,
  color = 'blue',
  compact = false,
}: StatCardProps) {
  const changeColors = {
    positive: 'text-[var(--agora-success)]',
    negative: 'text-red-600 dark:text-red-400',
    neutral: 'text-gray-600 dark:text-dark-text-secondary',
  };

  return (
    <FadeInUp duration={0.3} className="h-full">
      <Card
        className={cn(
          'hover:shadow-lg transition-shadow duration-200 h-full',
          compact && 'p-2.5 md:p-3'
        )}
      >
        <CardContent
          className={cn('h-full flex flex-col justify-center', compact && 'p-0')}
          style={compact ? undefined : { padding: 'var(--stat-card-padding)' }}
        >
          <div
            className={cn(
              'flex flex-col-reverse sm:flex-row sm:items-center justify-between',
              compact ? 'gap-1.5 sm:gap-2' : 'gap-2 sm:gap-3'
            )}
          >
            <div className="flex-1 min-w-0">
              <p
                className="font-medium text-[var(--light-text-secondary)] dark:text-[var(--dark-text-secondary)] mb-0.5 truncate"
                style={{ fontSize: compact ? 'var(--text-tiny)' : 'var(--text-stat-label)' }}
              >
                {title}
              </p>
              <p
                className="font-bold text-[var(--light-text-primary)] dark:text-[var(--dark-text-primary)] leading-tight truncate"
                style={{ fontSize: compact ? '1rem' : 'var(--text-stat-value)' }}
              >
                {value}
              </p>
              {change && (
                <div className="flex items-center gap-1 mt-0.5">
                  {changeType === 'positive' && (
                    <svg className="w-3 h-3 text-[var(--agora-success)] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  )}
                  {changeType === 'negative' && (
                    <svg className="w-3 h-3 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                    </svg>
                  )}
                  <span className={`font-medium ${changeColors[changeType]} truncate`} style={{ fontSize: 'var(--text-small)' }}>
                    {change}
                  </span>
                </div>
              )}
              {description && (
                <p className="mt-2 text-xs text-light-text-muted dark:text-dark-text-muted">
                  {description}
                </p>
              )}
            </div>
            {icon && (
              <div className={cn(
                'flex-shrink-0 self-start sm:self-auto flex items-center justify-center transition-colors duration-200',
                compact
                  ? 'p-1.5 rounded-lg h-8 w-8'
                  : 'p-2 sm:p-2.5 rounded-xl h-10 w-10 sm:h-12 sm:w-12',
                color === 'blue' && 'bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400',
                color === 'purple' && 'bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400',
                color === 'green' && 'bg-green-500/10 dark:bg-green-900/20 text-green-600 dark:text-green-400',
                color === 'indigo' && 'bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400',
                color === 'amber' && 'bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400',
                color === 'rose' && 'bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400'
              )}>
                {icon}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </FadeInUp>
  );
}

