'use client';

import Link from 'next/link';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/Button';
import { Progress } from '@/components/ui/Progress';
import { BudMark } from '@/components/bud/BudMark';
import { BudPageSkeleton, BudShell, uniqueTopicLabels } from '@/components/bud/BudShell';
import {
  useGenerateBudDeckMutation,
  useGetBudMeQuery,
  useGetBudTodayQuery,
  useRateBudCardMutation,
  useRecordBudSessionMutation,
} from '@/lib/store/api/budApi';

const RATINGS = [
  { value: 1, label: 'Forgot' },
  { value: 2, label: 'Hard' },
  { value: 3, label: 'Got it' },
  { value: 4, label: 'Easy' },
] as const;

function BudReviewContent() {
  const params = useSearchParams();
  const weekId = params.get('weekId');
  const deckId = params.get('deckId');
  const { data, isLoading, refetch } = useGetBudTodayQuery();
  const { data: me, refetch: refetchMe } = useGetBudMeQuery();
  const [rate, { isLoading: rating }] = useRateBudCardMutation();
  const [record] = useRecordBudSessionMutation();
  const [generateDeck] = useGenerateBudDeckMutation();
  const [generating, setGenerating] = useState(Boolean(weekId));
  const [flipped, setFlipped] = useState(false);
  const [index, setIndex] = useState(0);
  const [finished, setFinished] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);
  const payload = data?.data || data;
  const mePayload = me?.data || me;
  const streak = mePayload?.profile?.streakCount || 0;
  const labels = uniqueTopicLabels(payload?.topics);

  useEffect(() => {
    if (!weekId) return;
    let cancelled = false;
    setGenerating(true);
    generateDeck({ weekId })
      .unwrap()
      .then(() => refetch())
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setGenerating(false);
      });
    return () => {
      cancelled = true;
    };
  }, [generateDeck, refetch, weekId]);

  const cards = useMemo(() => {
    const decks = payload?.decks || [];
    const selected = deckId ? decks.filter((deck: any) => deck.id === deckId) : decks;
    return selected.flatMap((deck: any) =>
      (deck.cards || []).map((card: any) => ({ ...card, deckTitle: deck.title })),
    );
  }, [deckId, payload]);

  const card = cards[index];
  const topicLabel = card?.deckTitle || labels[0] || "Today's review";

  const rateCurrent = async (value: number) => {
    if (!card || rating || finished) return;
    try {
      await rate({ cardId: card.id, rating: value }).unwrap();
    } catch {
      return;
    }
    const nextCount = completedCount + 1;
    setCompletedCount(nextCount);
    setFlipped(false);
    if (index + 1 >= cards.length) {
      await record({ type: 'REVIEW', stableKeys: payload?.plan?.stableKeys || [] });
      refetchMe();
      setFinished(true);
      return;
    }
    setIndex((current) => current + 1);
  };

  useEffect(() => {
    if (!card || finished) return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      if (event.key === ' ' && target?.tagName !== 'BUTTON') {
        event.preventDefault();
        setFlipped((current) => !current);
      }
      if (event.key === '1' || event.key === '2' || event.key === '3' || event.key === '4') {
        void rateCurrent(Number(event.key));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if ((isLoading && !payload) || generating) return <BudPageSkeleton />;

  if (finished) {
    return (
      <BudShell>
        <div className="space-y-4 py-6 text-center">
          <BudMark size="lg" className="mx-auto" />
          <h1 className="text-3xl font-black tracking-tight text-light-text-primary dark:text-dark-text-primary">
            That&apos;s enough for today
          </h1>
          <p className="text-light-text-secondary dark:text-dark-text-secondary">
            You went through {completedCount} {completedCount === 1 ? 'card' : 'cards'}.
          </p>
          <p className="text-sm text-amber-800 dark:text-amber-200">
            Streak {streak} {streak === 1 ? 'day' : 'days'}.
          </p>
          <Link href="/dashboard/student/bud" className="inline-block pt-2">
            <Button bgColor="bg-amber-600 hover:bg-amber-500" textColor="text-white" className="rounded-2xl">
              Back to Bud
            </Button>
          </Link>
        </div>
      </BudShell>
    );
  }

  if (!card) {
    return (
      <BudShell>
        <div className="space-y-3 py-6">
          <h1 className="text-2xl font-black tracking-tight text-light-text-primary dark:text-dark-text-primary">
            Nothing to review yet
          </h1>
          <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
            Open a delivered week in your class and tap Review with Bud.
          </p>
          <Link href="/dashboard/student/classes" className="inline-block pt-2">
            <Button variant="outline" className="rounded-2xl">
              Go to classes
            </Button>
          </Link>
        </div>
      </BudShell>
    );
  }

  return (
    <BudShell>
      <div className="space-y-5">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <p className="truncate text-sm font-medium text-light-text-primary dark:text-dark-text-primary">{topicLabel}</p>
            <p className="shrink-0 text-sm text-light-text-secondary dark:text-dark-text-secondary">
              {index + 1} of {cards.length}
            </p>
          </div>
          <Progress value={index} max={cards.length} className="h-1.5" />
        </div>

        <button
          type="button"
          onClick={() => setFlipped((current) => !current)}
          className="block w-full text-left [perspective:1200px]"
          aria-pressed={flipped}
        >
          <div
            className={`relative min-h-[240px] transition-transform duration-500 [transform-style:preserve-3d] ${flipped ? '[transform:rotateY(180deg)]' : ''}`}
          >
            <div className="absolute inset-0 flex items-center justify-center rounded-[2rem] border border-amber-100 bg-white/90 p-8 text-center [backface-visibility:hidden] dark:border-white/10 dark:bg-white/5">
              <div>
                <p className="text-lg font-semibold text-light-text-primary dark:text-dark-text-primary">{card.front}</p>
                <p className="mt-4 text-xs text-light-text-secondary dark:text-dark-text-secondary">Tap to flip</p>
              </div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center rounded-[2rem] border border-amber-200 bg-amber-50 p-8 text-center [backface-visibility:hidden] [transform:rotateY(180deg)] dark:border-white/10 dark:bg-amber-950/40">
              <div>
                <p className="text-lg font-semibold text-light-text-primary dark:text-dark-text-primary">{card.back}</p>
                <p className="mt-4 text-xs text-light-text-secondary dark:text-dark-text-secondary">Showing the answer</p>
              </div>
            </div>
          </div>
        </button>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {RATINGS.map((item) => (
            <Button
              key={item.value}
              variant="outline"
              disabled={rating}
              className="min-h-[44px] rounded-2xl"
              onClick={() => void rateCurrent(item.value)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>
    </BudShell>
  );
}

export default function BudReviewPage() {
  return (
    <ProtectedRoute roles={['STUDENT']}>
      <Suspense fallback={<BudPageSkeleton />}>
        <BudReviewContent />
      </Suspense>
    </ProtectedRoute>
  );
}
