import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface MinimalEmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function MinimalEmptyState({ icon, title, description, action, className }: MinimalEmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-4 py-14 text-center', className)}>
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--agora-blue)]/10 text-[var(--agora-blue)]">
        {icon}
      </div>
      <p className="font-semibold text-light-text-primary dark:text-dark-text-primary" style={{ fontSize: 'var(--text-body)' }}>
        {title}
      </p>
      {description && (
        <p
          className="mt-1 max-w-sm text-light-text-secondary dark:text-dark-text-secondary"
          style={{ fontSize: 'var(--text-small)' }}
        >
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
