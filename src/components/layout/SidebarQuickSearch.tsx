'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { BookMarked, BookOpen, GraduationCap, Search, Users, type LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { useGlobalSearchQuery, type GlobalSearchResultType } from '@/lib/store/api/searchApi';
import { useSidebar } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

export type SidebarSearchItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
  group?: string;
  keywords?: string[];
  /** Set for people: renders a circular photo, falling back to initials. */
  person?: { name: string; image?: string | null; subtitle?: string };
};

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

function PersonAvatar({ name, image, active }: { name: string; image?: string | null; active: boolean }) {
  const [failed, setFailed] = useState(false);
  if (image && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image}
        alt=""
        onError={() => setFailed(true)}
        className="h-8 w-8 flex-shrink-0 rounded-full object-cover"
      />
    );
  }
  return (
    <span
      className={cn(
        'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-semibold',
        active ? 'bg-[var(--agora-blue)] text-white' : 'bg-slate-200 text-slate-600 dark:bg-white/10 dark:text-slate-200',
      )}
    >
      {initialsOf(name) || '?'}
    </span>
  );
}

function useShortcutLabel() {
  const [label, setLabel] = useState('Ctrl K');

  useEffect(() => {
    const mac = /Mac|iPhone|iPad/.test(navigator.platform) || /Mac/.test(navigator.userAgent);
    setLabel(mac ? '⌘K' : 'Ctrl K');
  }, []);

  return label;
}

function matchesQuery(item: SidebarSearchItem, query: string) {
  const hay = [item.label, item.group, ...(item.keywords ?? [])].join(' ').toLowerCase();
  return hay.includes(query);
}

const RESULT_META: Record<GlobalSearchResultType, { group: string; icon: LucideIcon; href: (id: string) => string }> = {
  student: { group: 'Students', icon: GraduationCap, href: (id) => `/dashboard/school/students/${id}` },
  staff: { group: 'Staff', icon: Users, href: (id) => `/dashboard/school/staff/${id}` },
  class: { group: 'Classes', icon: BookOpen, href: (id) => `/dashboard/school/courses/${id}` },
  subject: { group: 'Subjects', icon: BookMarked, href: () => '/dashboard/school/subjects' },
};

export function SidebarQuickSearch({
  items,
  searchData = false,
}: {
  items: SidebarSearchItem[];
  /** Also search students, staff, classes and subjects on the server. */
  searchData?: boolean;
}) {
  const router = useRouter();
  const { setOpen: setMobileOpen } = useSidebar();
  const shortcut = useShortcutLabel();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => window.clearTimeout(id);
  }, [query]);

  const remoteEnabled = searchData && open && debouncedQuery.length >= 2;
  const { data: remoteResults = [], isFetching } = useGlobalSearchQuery(debouncedQuery, {
    skip: !remoteEnabled,
  });
  const isSearching = remoteEnabled && (isFetching || debouncedQuery !== query.trim());

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const pages = items.filter((item) => matchesQuery(item, q));
    if (!remoteEnabled || debouncedQuery.toLowerCase() !== q) return pages;

    const records: SidebarSearchItem[] = remoteResults.map((r) => {
      const meta = RESULT_META[r.type];
      const Icon = meta.icon;
      const isPerson = r.type === 'student' || r.type === 'staff';
      return {
        label: r.title,
        href: meta.href(r.id),
        icon: <Icon />,
        group: meta.group,
        person: isPerson ? { name: r.title, image: r.image, subtitle: r.subtitle } : undefined,
      };
    });
    return [...records, ...pages];
  }, [items, query, remoteEnabled, debouncedQuery, remoteResults]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
    setActiveIndex(0);
  }, []);

  const openPalette = useCallback(() => {
    setMobileOpen(false);
    setQuery('');
    setActiveIndex(0);
    setOpen(true);
  }, [setMobileOpen]);

  const goTo = useCallback(
    (href: string) => {
      close();
      router.push(href);
    },
    [close, router],
  );

  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        close();
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close, open]);

  useEffect(() => {
    if (open) return;

    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        openPalette();
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, openPalette]);

  useEffect(() => {
    if (!open) return;
    const id = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const onInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((i) => (results.length === 0 ? 0 : (i + 1) % results.length));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((i) => (results.length === 0 ? 0 : (i - 1 + results.length) % results.length));
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      const item = results[activeIndex];
      if (item) goTo(item.href);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={openPalette}
        aria-label="Quick search"
        className="flex h-10 w-10 sm:w-full sm:max-w-md items-center justify-center sm:justify-start gap-2.5 rounded-full bg-black/[0.04] sm:px-4 text-slate-500 transition-colors hover:bg-black/[0.07] dark:bg-white/5 dark:hover:bg-white/10"
      >
        <Search className="h-4 w-4 flex-shrink-0" strokeWidth={1.75} />
        <span className="hidden sm:block flex-1 truncate text-left text-[13px]">Search anything...</span>
        <kbd className="hidden sm:block rounded-md bg-black/[0.06] px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-white/10 dark:text-slate-400">
          {shortcut}
        </kbd>
      </button>

      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[11000] flex items-center justify-center px-4"
            onMouseDown={(event) => {
              if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
                close();
              }
            }}
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.18 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm dark:bg-black/75"
            />
            <motion.div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-label="Quick search"
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              data-lenis-prevent
              // Inline position/z-index: a global `.relative.z-10` rule forces a transparent background.
              style={{ position: 'relative', zIndex: 10 }}
              className="w-full max-w-xl overflow-hidden rounded-3xl border border-slate-200 !bg-white shadow-2xl shadow-slate-900/30 !backdrop-blur-none dark:border-white/10 dark:!bg-[#0f1520]"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <div className="flex items-center gap-3 border-b border-slate-100 px-5 dark:border-white/10">
                <Search className="h-4 w-4 flex-shrink-0 text-slate-400" strokeWidth={1.75} />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={onInputKeyDown}
                  placeholder={searchData ? 'Search students, staff, classes, pages...' : 'Search pages, actions, and settings...'}
                  className="h-14 w-full min-w-0 !border-0 !bg-transparent !p-0 !shadow-none !ring-0 text-sm font-medium text-slate-900 outline-none placeholder:font-normal placeholder:text-slate-400 dark:text-white"
                />
                <kbd className="flex-shrink-0 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
                  Esc
                </kbd>
              </div>
              <ul role="listbox" className="max-h-[min(380px,50vh)] overflow-y-auto p-2">
                {results.length === 0 ? (
                  <li className="px-3 py-10 text-center text-xs text-slate-400">
                    {!query.trim()
                      ? searchData
                        ? 'Start typing to search students, staff, classes and pages'
                        : 'Start typing to search pages'
                      : isSearching
                        ? 'Searching...'
                        : searchData
                          ? 'No matches found'
                          : 'No matching pages'}
                  </li>
                ) : (
                  results.map((item, index) => (
                    <li key={`${item.href}-${item.label}`}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={index === activeIndex}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => goTo(item.href)}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
                          index === activeIndex
                            ? 'bg-[var(--agora-blue)]/10 text-[var(--agora-blue)]'
                            : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/5',
                        )}
                      >
                        {item.person ? (
                          <PersonAvatar
                            name={item.person.name}
                            image={item.person.image}
                            active={index === activeIndex}
                          />
                        ) : (
                          <span
                            className={cn(
                              'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg [&>svg]:h-4 [&>svg]:w-4',
                              index === activeIndex
                                ? 'bg-[var(--agora-blue)]/15'
                                : 'bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400',
                            )}
                          >
                            {item.icon}
                          </span>
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-semibold">{item.label}</span>
                          {item.person?.subtitle && (
                            <span className="block truncate text-[11px] font-normal text-slate-500 dark:text-slate-400">
                              {item.person.subtitle}
                            </span>
                          )}
                        </span>
                        {item.group && (
                          <span className="flex-shrink-0 text-[10px] font-medium uppercase tracking-wide text-slate-400">
                            {item.group}
                          </span>
                        )}
                      </button>
                    </li>
                  ))
                )}
              </ul>
              <div className="flex items-center gap-4 border-t border-slate-100 px-5 py-2.5 text-[11px] text-slate-400 dark:border-white/10">
                <span>↑↓ Navigate</span>
                <span>↵ Open</span>
                {results.length > 0 && <span className="ml-auto">{results.length} results</span>}
              </div>
            </motion.div>
          </div>,
          document.body,
        )}    </>
  );
}


