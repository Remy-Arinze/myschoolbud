'use client';

import { cn } from '@/lib/utils';

/** Use these instead of Tailwind text-sm / text-xs in settings panels. */
export const settingsText = {
  body: { fontSize: 'var(--text-body)' } as const,
  small: { fontSize: 'var(--text-small)' } as const,
  tiny: { fontSize: 'var(--text-tiny)' } as const,
};

interface SettingsSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function SettingsSection({ title, description, children, className }: SettingsSectionProps) {
  return (
    <section className={cn('space-y-3', className)}>
      <div>
        <h2
          className="font-semibold text-light-text-primary dark:text-dark-text-primary"
          style={{ fontSize: 'var(--text-section-title)' }}
        >
          {title}
        </h2>
        {description && (
          <p
            className="text-light-text-secondary dark:text-dark-text-secondary mt-1"
            style={{ fontSize: 'var(--text-body)' }}
          >
            {description}
          </p>
        )}
      </div>
      {children}
    </section>
  );
}
