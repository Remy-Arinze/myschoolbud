'use client';

import Link from 'next/link';
import { Fragment, useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';
import gsap from 'gsap';
import { cn } from '@/lib/utils';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Fades/slides tab content in whenever `tabKey` changes (skipped on first mount). */
export function TabPanel({ tabKey, children, className }: { tabKey: string; children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const first = useRef(true);

  useLayoutEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    const tween = gsap.fromTo(
      el,
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.35, ease: 'power3.out', clearProps: 'opacity,transform' },
    );
    return () => {
      tween.kill();
    };
  }, [tabKey]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

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
  onTabHover?: (tab: T) => void;
  ariaLabel: string;
  className?: string;
  trailing?: ReactNode;
}

export function SectionTabs<T extends string>({
  tabs,
  activeTab,
  onTabChange,
  onTabHover,
  ariaLabel,
  className,
  trailing,
}: SectionTabsProps<T>) {
  const listRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);
  const placed = useRef(false);

  // Slide one shared pill under the active tab instead of swapping backgrounds
  useLayoutEffect(() => {
    const list = listRef.current;
    const pill = pillRef.current;
    if (!list || !pill) return;

    const place = (animate: boolean) => {
      const active = list.querySelector<HTMLElement>('[aria-current="page"]');
      if (!active) {
        gsap.set(pill, { opacity: 0 });
        return;
      }
      const target = { x: active.offsetLeft, y: active.offsetTop, width: active.offsetWidth, height: active.offsetHeight, opacity: 1 };
      if (animate && placed.current && !prefersReducedMotion()) {
        gsap.to(pill, { ...target, duration: 0.4, ease: 'power3.out', overwrite: 'auto' });
      } else {
        gsap.set(pill, target);
      }
      placed.current = true;
    };

    place(true);
    const onResize = () => place(false);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [activeTab, tabs.length]);

  // Keep the active tab in view when the row scrolls horizontally
  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>('[aria-current="page"]')
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }, [activeTab]);

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
            onMouseEnter={() => onTabHover?.(tab.key)}
            onFocus={() => onTabHover?.(tab.key)}
          >
            {content}
          </button>
        )}
        {tab.dividerAfter && <div className="section-tab-divider" aria-hidden />}
      </Fragment>
    );
  });

  const pill = <span ref={pillRef} aria-hidden className="section-tab-pill" />;

  return (
    <nav className={cn('mb-6', className)} aria-label={ariaLabel}>
      {trailing ? (
        <div className="flex items-center justify-between gap-3">
          <div ref={listRef} className="section-tabs has-pill min-w-0 flex-1">
            {pill}
            {tabItems}
          </div>
          <div className="shrink-0">{trailing}</div>
        </div>
      ) : (
        <div ref={listRef} className="section-tabs has-pill">
          {pill}
          {tabItems}
        </div>
      )}
    </nav>
  );
}
