'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, SquarePen, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LoisOrb } from './LoisOrb';

export type LoisHistoryChat = {
  id: string;
  title?: string | null;
  updatedAt: string;
};

type HistoryGroupId = 'today' | 'yesterday' | 'week' | 'older';

const GROUP_LABEL: Record<HistoryGroupId, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  week: 'Previous 7 days',
  older: 'Older',
};

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

function groupIdFor(updatedAt: string, now = new Date()): HistoryGroupId {
  const then = new Date(updatedAt);
  const today = startOfDay(now);
  const day = startOfDay(then);
  const diffDays = Math.round((today - day) / 86400000);
  if (diffDays <= 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return 'week';
  return 'older';
}

function displayTitle(title?: string | null) {
  const raw = (title || '').replace(/\s+/g, ' ').trim();
  if (!raw) return 'New chat';
  return raw.endsWith('...') ? raw.slice(0, -3).trimEnd() : raw;
}

function timeLabel(updatedAt: string) {
  const then = new Date(updatedAt);
  const today = startOfDay(new Date());
  const day = startOfDay(then);
  if (day === today) {
    return then.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }
  if (Math.round((today - day) / 86400000) < 7) {
    return then.toLocaleDateString(undefined, { weekday: 'short' });
  }
  return then.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function LoisChatHistory({
  isOpen,
  contained,
  chats,
  activeId,
  onClose,
  onSelect,
  onDelete,
  onNewChat,
}: {
  isOpen: boolean;
  contained?: boolean;
  chats: LoisHistoryChat[];
  activeId?: string | null;
  onClose: () => void;
  onSelect: (id: string, title: string) => void;
  onDelete: (event: React.MouseEvent, id: string) => void;
  onNewChat: () => void;
}) {
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const t = window.setTimeout(() => searchRef.current?.focus(), 180);
    return () => {
      document.removeEventListener('keydown', onKey);
      window.clearTimeout(t);
    };
  }, [isOpen, onClose]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return chats;
    return chats.filter((chat) => displayTitle(chat.title).toLowerCase().includes(q));
  }, [chats, query]);

  const groups = useMemo(() => {
    const buckets: Record<HistoryGroupId, LoisHistoryChat[]> = {
      today: [],
      yesterday: [],
      week: [],
      older: [],
    };
    for (const chat of filtered) {
      buckets[groupIdFor(chat.updatedAt)].push(chat);
    }
    return (Object.keys(GROUP_LABEL) as HistoryGroupId[])
      .map((id) => ({ id, label: GROUP_LABEL[id], items: buckets[id] }))
      .filter((group) => group.items.length > 0);
  }, [filtered]);

  return (
    <AnimatePresence>
      {isOpen ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className={cn(
              'z-[100] bg-black/25 dark:bg-black/45',
              contained ? 'absolute inset-0' : 'fixed inset-0',
            )}
          />
          <motion.aside
            role="dialog"
            aria-label="Chat history"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              'lois-history z-[101] flex flex-col',
              contained ? 'absolute inset-0' : 'fixed right-0 top-0 bottom-0 w-[22rem] max-w-full',
            )}
          >
            <div className="flex items-center gap-2 px-3 pt-3 pb-2">
              <h3
                className="flex-1 min-w-0 font-semibold text-light-text-primary dark:text-dark-text-primary tracking-tight"
                style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--lois-title, 0.8125rem)' }}
              >
                Chats
              </h3>
              <button type="button" onClick={onClose} className="lois-icon-btn" aria-label="Close history">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="px-3 pb-2">
              <label className="lois-history-search">
                <Search className="w-3.5 h-3.5 shrink-0 opacity-50" aria-hidden />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search chats"
                  aria-label="Search chats"
                />
                {query ? (
                  <button type="button" onClick={() => setQuery('')} className="lois-icon-btn !h-6 !w-6" aria-label="Clear search">
                    <X className="w-3 h-3" />
                  </button>
                ) : null}
              </label>
            </div>

            <button type="button" onClick={onNewChat} className="lois-history-new mx-3 mb-1">
              <SquarePen className="w-3.5 h-3.5" />
              New chat
            </button>

            <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-4 scrollbar-thin scrollbar-thumb-light-border dark:scrollbar-thumb-white/10">
              {chats.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center px-6 pt-16">
                  <LoisOrb size="md" />
                  <p
                    className="mt-3 font-medium text-light-text-primary dark:text-dark-text-primary"
                    style={{ fontSize: 'var(--lois-body, 0.75rem)' }}
                  >
                    No chats yet
                  </p>
                  <p
                    className="mt-1 text-light-text-secondary dark:text-dark-text-secondary leading-relaxed"
                    style={{ fontSize: 'var(--lois-small, 0.6875rem)' }}
                  >
                    Start a conversation and it will show up here.
                  </p>
                </div>
              ) : filtered.length === 0 ? (
                <p
                  className="px-3 py-8 text-center text-light-text-secondary dark:text-dark-text-secondary"
                  style={{ fontSize: 'var(--lois-small, 0.6875rem)' }}
                >
                  No chats match “{query.trim()}”
                </p>
              ) : (
                groups.map((group) => (
                  <section key={group.id} className="mt-3 first:mt-1">
                    <h4 className="lois-history-label">{group.label}</h4>
                    <ul>
                      {group.items.map((chat) => {
                        const title = displayTitle(chat.title);
                        const active = activeId === chat.id;
                        return (
                          <li key={chat.id}>
                            <div className={cn('lois-history-row group', active && 'is-active')}>
                              <button
                                type="button"
                                onClick={() => onSelect(chat.id, title)}
                                className="lois-history-row__main"
                              >
                                <span className="lois-history-row__title">{title}</span>
                                <span className="lois-history-row__time">{timeLabel(chat.updatedAt)}</span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => onDelete(e, chat.id)}
                                className="lois-history-row__delete"
                                aria-label={`Delete ${title}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                ))
              )}
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}
