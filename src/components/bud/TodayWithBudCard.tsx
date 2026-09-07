'use client';

import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useGetBudMeQuery } from '@/lib/store/api/budApi';

export function TodayWithBudCard() {
  const { data } = useGetBudMeQuery();
  const payload = data?.data || data;
  const name = payload?.profile?.companionName || 'Bud';
  const streak = payload?.profile?.streakCount || 0;
  const due = payload?.dueCards || 0;
  const sub = payload?.subscription;
  const locked = !sub || (sub.status !== 'ACTIVE' && sub.status !== 'TRIAL');
  const evening = new Date().getHours() >= 15;

  return (
    <Card className="overflow-hidden border-amber-200/40 dark:border-amber-700/30 bg-gradient-to-br from-amber-50/80 to-orange-50/40 dark:from-amber-950/30 dark:to-orange-950/10">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
          <Sparkles className="h-4 w-4" />
          <p className="text-xs font-semibold uppercase tracking-wider">Today with {name}</p>
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
