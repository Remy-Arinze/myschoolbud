'use client';

import { useState, useRef, useEffect } from 'react';
import gsap from 'gsap';
import { GraduationCap, BookOpen, University, ChevronDown, ChevronUp, Check, Lock } from 'lucide-react';
import { useSchoolType } from '@/hooks/useSchoolType';
import { cn } from '@/lib/utils';
import { useGetMySchoolQuery, useGetClassesQuery, useGetActiveSessionQuery } from '@/lib/store/api/schoolAdminApi';

const typeConfig = {
  PRIMARY: {
    label: 'Primary',
    icon: GraduationCap,
  },
  SECONDARY: {
    label: 'Secondary',
    icon: BookOpen,
  },
  TERTIARY: {
    label: 'Tertiary',
    icon: University,
  },
} as const;

export function SchoolTypeSwitcher() {
  const { isMixed, availableTypes, currentType, setCurrentType, isLocked } = useSchoolType();
  const { data: schoolResponse } = useGetMySchoolQuery();
  const schoolId = schoolResponse?.data?.id;
  const shouldWarmCache = Boolean(isMixed && schoolId && !isLocked);

  // Keep every type's class list and session in cache while the switcher is
  // mounted so switching does not wait on a cold fetch.
  useGetClassesQuery(
    { schoolId: schoolId!, type: 'PRIMARY' },
    { skip: !shouldWarmCache || !availableTypes.includes('PRIMARY') },
  );
  useGetClassesQuery(
    { schoolId: schoolId!, type: 'SECONDARY' },
    { skip: !shouldWarmCache || !availableTypes.includes('SECONDARY') },
  );
  useGetClassesQuery(
    { schoolId: schoolId!, type: 'TERTIARY' },
    { skip: !shouldWarmCache || !availableTypes.includes('TERTIARY') },
  );
  useGetActiveSessionQuery(
    { schoolId: schoolId!, schoolType: 'PRIMARY' },
    { skip: !shouldWarmCache || !availableTypes.includes('PRIMARY') },
  );
  useGetActiveSessionQuery(
    { schoolId: schoolId!, schoolType: 'SECONDARY' },
    { skip: !shouldWarmCache || !availableTypes.includes('SECONDARY') },
  );
  useGetActiveSessionQuery(
    { schoolId: schoolId!, schoolType: 'TERTIARY' },
    { skip: !shouldWarmCache || !availableTypes.includes('TERTIARY') },
  );

  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    if (!isExpanded) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (containerRef.current?.contains(e.target as Node)) return;
      setIsExpanded(false);
    };
    document.addEventListener('pointerdown', handlePointerDown, true);
    return () => document.removeEventListener('pointerdown', handlePointerDown, true);
  }, [isExpanded]);

  // GSAP: animate dropdown open/close
  useEffect(() => {
    const el = dropdownRef.current;
    if (!el) return;

    if (isExpanded) {
      gsap.killTweensOf(el);
      gsap.set(el, { height: 0, opacity: 0, overflow: 'hidden' });
      gsap.to(el, {
        height: 'auto',
        opacity: 1,
        duration: 0.32,
        ease: 'power2.out',
        overflow: 'hidden',
      });
    } else {
      gsap.killTweensOf(el);
      gsap.to(el, {
        height: 0,
        opacity: 0,
        duration: 0.28,
        ease: 'power2.in',
        overflow: 'hidden',
        onComplete: () => { gsap.set(el, { overflow: 'hidden' }); },
      });
    }
  }, [isExpanded]);

  // Don't render if school is not mixed
  if (!isMixed || availableTypes.length <= 1) {
    return null;
  }

  const activeType = currentType ?? availableTypes[0];
  const config = typeConfig[activeType];
  const Icon = config.icon;

  // Locked admin: show static indicator (no dropdown)
  if (isLocked) {
    return (
      <div className="flex flex-col w-full gap-1">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-gray-500" style={{ fontSize: 'var(--text-tiny)' }}>School type</p>
        </div>
        <div className="rounded-lg border border-[var(--agora-blue)]/35 overflow-hidden bg-[var(--light-sidebar-active)] dark:bg-[var(--dark-sidebar-active)]">
          <div
            className="school-type-trigger relative flex w-full items-center gap-2 px-3 py-1.5 rounded-lg font-semibold overflow-hidden text-[var(--agora-blue)]"
            style={{ fontSize: 'var(--text-small)' }}
          >
            <Icon className="relative z-10 h-3.5 w-3.5 flex-shrink-0" />
            <span className="relative z-10 flex-1 text-left truncate">
              {config.label}
            </span>
            <Lock className="relative z-10 h-3 w-3 flex-shrink-0 opacity-70" />
          </div>
        </div>
      </div>
    );
  }

  // Unrestricted admin: show interactive switcher
  return (
    <div className="flex flex-col w-full gap-1">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-gray-500" style={{ fontSize: 'var(--text-tiny)' }}>School type</p>
      </div>

      <div
        ref={containerRef}
        className="rounded-lg border border-[var(--agora-blue)]/35 overflow-hidden bg-[var(--light-card)] dark:bg-[var(--dark-surface)]"
      >
        {/* Selected row */}
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className={cn(
            'school-type-trigger relative flex w-full items-center gap-2 px-3 py-1.5 font-semibold transition-all duration-200 overflow-hidden',
            'focus:outline-none focus:ring-0',
            'text-[var(--agora-blue)] bg-[var(--light-sidebar-active)] dark:bg-[var(--dark-sidebar-active)]'
          )}
          style={{ fontSize: 'var(--text-small)' }}
        >
          <Icon className="relative z-10 h-3.5 w-3.5 flex-shrink-0" />
          <span className="relative z-10 flex-1 text-left truncate">
            {config.label}
          </span>
          <span className="relative z-10 flex-shrink-0 opacity-90">
            {isExpanded ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </span>
        </button>

        {/* Dropdown: GSAP animates height + opacity */}
        <div
          ref={dropdownRef}
          className="overflow-hidden origin-top"
          style={{ height: 0, opacity: 0 }}
        >
          <div className="flex flex-col py-1 px-1 border-t border-[var(--light-border)] dark:border-[var(--dark-border)] bg-[var(--light-bg)] dark:bg-[var(--dark-bg)]">
            {availableTypes.map((type) => {
              const typeCfg = typeConfig[type];
              const TypeIcon = typeCfg.icon;
              const isSelected = currentType === type;

              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setCurrentType(type);
                    setIsExpanded(false);
                  }}
                  className={cn(
                    'school-type-option flex items-center gap-2 px-2.5 py-1.5 rounded-md font-semibold transition-colors',
                    'focus:outline-none focus:ring-0',
                    isSelected
                      ? 'school-type-option-active text-[var(--agora-blue)] bg-[var(--light-sidebar-active)] dark:bg-[var(--dark-sidebar-active)]'
                      : 'text-[var(--light-text-primary)] dark:text-[var(--dark-text-primary)] hover:bg-gray-100 dark:hover:bg-[#1a202e]'
                  )}
                  style={{ fontSize: 'var(--text-small)' }}
                >
                  <TypeIcon
                    className={cn(
                      'h-3.5 w-3.5 flex-shrink-0',
                      isSelected
                        ? 'text-[var(--agora-blue)]'
                        : 'text-[var(--light-text-secondary)] dark:text-[var(--dark-text-secondary)]'
                    )}
                  />
                  <span className="flex-1 text-left">{typeCfg.label}</span>
                  {isSelected ? (
                    <Check className="h-3.5 w-3.5 flex-shrink-0 text-[var(--agora-blue)]" strokeWidth={2.5} />
                  ) : (
                    <span className="w-3.5 h-3.5 flex-shrink-0" aria-hidden />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
