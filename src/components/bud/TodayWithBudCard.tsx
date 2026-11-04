'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useGetBudMeQuery } from '@/lib/store/api/budApi';
import { BudMark } from '@/components/bud/BudMark';

const DISMISS_KEY = 'agora:today-with-bud-dismissed';

function todayStamp() {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

export function TodayWithBudCard() {
  const { data } = useGetBudMeQuery();
  const [dismissed, setDismissed] = useState(false);
  const payload = data?.data || data;
  const name = payload?.profile?.companionName || 'Bud';
  const streak = payload?.profile?.streakCount || 0;
  const due = payload?.dueCards || 0;
  const sub = payload?.subscription;
  const locked = !sub || (sub.status !== 'ACTIVE' && sub.status !== 'TRIAL');
  const evening = new Date().getHours() >= 15;

  useEffect(() => {
    setDismissed(window.localStorage.getItem(DISMISS_KEY) === todayStamp());
  }, []);

  if (dismissed) return null;

  const dismiss = () => {
    window.localStorage.setItem(DISMISS_KEY, todayStamp());
    setDismissed(true);
  };

  return (
    <Card className="overflow-hidden p-0 border-amber-200/40 bg-gradient-to-br from-amber-50/80 to-orange-50/40 dark:border-white/10 dark:bg-none dark:bg-[var(--dark-surface)]">
      <CardContent className="px-3 py-2.5 space-y-2">
        <div className="flex items-center gap-2 text-amber-700 dark:text-dark-text-secondary">
          <BudMark size="xs" />
          <p className="text-xs font-semibold uppercase tracking-wider flex-1">Today with {name}</p>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss today with Bud"
            className="rounded-md p-1 text-amber-700/70 hover:bg-amber-100 hover:text-amber-800 dark:text-dark-text-muted dark:hover:bg-white/5 dark:hover:text-dark-text-primary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
          {evening
            ? `School's done. A few minutes on what you learnt today?`
            : locked
              ? `${name} is ready when you are — start a free review or subscribe.`
              : `${due} cards waiting. Streak ${streak} day${streak === 1 ? '' : 's'}.`}
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/student/bud/review">
            <Button size="sm" className="bg-amber-600 hover:bg-amber-500 text-white">
              Review today
            </Button>
          </Link>
          {locked && (
            <Link href="/dashboard/student/bud/subscribe">
              <Button size="sm" variant="outline">
                Subscribe
              </Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
