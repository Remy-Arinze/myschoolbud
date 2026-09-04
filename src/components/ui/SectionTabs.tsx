'use client';

import Link from 'next/link';
import { Fragment, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface SectionTab<T extends string = string> {
  key: T;
  label: string;
  icon?: ReactNode;
  href?: string;
  dividerAfter?: boolean;
}

interface SectionTabsProps<T extends string = string> {
  tabs: SectionTab<T>[];
  activeTab: T;
  onTabChange?: (tab: T) => void;
  ariaLabel: string;
  className?: string;
  trailing?: ReactNode;
}

export function SectionTabs<T extends string>({
  tabs,
  activeTab,
  onTabChange,
  ariaLabel,
  className,
  trailing,
}: SectionTabsProps<T>) {
  const tabItems = tabs.map((tab) => {
    const isActive = activeTab === tab.key;
    const content = (
      <>
        {tab.icon}
        {tab.label}
      </>
    );
    const tabClassName = 'section-tab';
    const tabStyle = { fontSize: 'var(--text-body)' as const };

    return (
      <Fragment key={tab.key}>
        {tab.href ? (
          <Link
            href={tab.href}
            aria-current={isActive ? 'page' : undefined}
            className={tabClassName}
            style={tabStyle}
          >
            {content}
          </Link>
        ) : (
          <button
            type="button"
            aria-current={isActive ? 'page' : undefined}
            className={tabClassName}
            style={tabStyle}
            onClick={() => onTabChange?.(tab.key)}
          >
            {content}
          </button>
        )}
        {tab.dividerAfter && <div className="section-tab-divider" aria-hidden />}
      </Fragment>
    );
  });

  return (
    <nav className={cn('mb-6', className)} aria-label={ariaLabel}>
      {trailing ? (
        <div className="flex items-center justify-between gap-3">
          <div className="section-tabs min-w-0 flex-1">{tabItems}</div>
          <div className="shrink-0">{trailing}</div>
        </div>
      ) : (
        <div className="section-tabs">{tabItems}</div>
      )}
    </nav>
  );
}
