'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { useSidebar } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

export type SidebarSearchItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
  group?: string;
  keywords?: string[];
};

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

export function SidebarQuickSearch({ items }: { items: SidebarSearchItem[] }) {
  const router = useRouter();
  const { setOpen: setMobileOpen } = useSidebar();
  const shortcut = useShortcutLabel();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => matchesQuery(item, q));
  }, [items, query]);

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
        className="sidebar-quick-search"
        aria-label="Quick search"
      >
        <Search className="h-3.5 w-3.5 flex-shrink-0" strokeWidth={1.75} />
        <span className="flex-1 truncate text-left">Quick search...</span>
        <kbd className="sidebar-search-kbd">{shortcut}</kbd>
      </button>

      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[11000] flex items-start justify-center px-4 pt-[12vh]"
            onMouseDown={(event) => {
              if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
                close();
              }
            }}
          >
            <div className="absolute inset-0 bg-black/40 dark:bg-black/60" />
            <div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-label="Quick search"
              className="sidebar-command-palette relative z-10 w-full max-w-lg overflow-hidden"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <div className="flex items-center gap-2.5 border-b border-[var(--light-border)] dark:border-[var(--dark-border)] px-4">
                <Search className="h-4 w-4 flex-shrink-0 text-[var(--light-text-muted)] dark:text-[var(--dark-text-muted)]" strokeWidth={1.75} />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={onInputKeyDown}
                  placeholder="Search pages, actions, and settings..."
                  className="sidebar-command-input h-14 w-full min-w-0 bg-transparent font-semibold text-[var(--light-text-primary)] dark:text-[var(--dark-text-primary)] outline-none placeholder:text-[var(--light-text-muted)] placeholder:font-normal"
                />
                <kbd className="sidebar-search-kbd flex-shrink-0">Esc</kbd>
              </div>
              <ul role="listbox" className="max-h-[min(420px,55vh)] overflow-y-auto p-2">
                {results.length === 0 ? (
                  <li className="px-3 py-8 text-center text-[13px] text-[var(--light-text-muted)] dark:text-[var(--dark-text-muted)]">
                    No matching pages
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
                          'flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors',
                          index === activeIndex
                            ? 'bg-[var(--light-sidebar-active)] dark:bg-[var(--dark-sidebar-active)]'
                            : 'hover:bg-[var(--light-hover)] dark:hover:bg-[var(--dark-hover)]',
                        )}
                      >
                        <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center text-[var(--light-text-muted)] dark:text-[var(--dark-text-muted)] [&>svg]:h-4 [&>svg]:w-4">
                          {item.icon}
                        </span>
                        <span className="min-w-0 flex-1 truncate font-semibold text-[var(--light-text-primary)] dark:text-[var(--dark-text-primary)]" style={{ fontSize: 'var(--text-body)' }}>
                          {item.label}
                        </span>
                        {item.group && (
                          <span className="flex-shrink-0 text-[11px] font-medium text-[var(--light-text-muted)] dark:text-[var(--dark-text-muted)]">
                            {item.group}
                          </span>
                        )}
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
