'use client';

import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { BudPageSkeleton, BudShell } from '@/components/bud/BudShell';
import { useGetBudTodayQuery } from '@/lib/store/api/budApi';

export default function BudDecksPage() {
  const { data, isLoading } = useGetBudTodayQuery();
  const payload = data?.data || data;
  const decks = payload?.decks || [];
  const topics = payload?.topics || [];

  return (
    <ProtectedRoute roles={['STUDENT']}>
      {isLoading && !payload ? (
        <BudPageSkeleton />
      ) : (
        <BudShell>
          <div className="space-y-4">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-light-text-primary dark:text-dark-text-primary">
                Your decks
              </h1>
              <p className="mt-1 text-sm text-light-text-secondary dark:text-dark-text-secondary">
                What you&apos;ve saved from class this week.
              </p>
            </div>
            {decks.length === 0 && (
              <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                Decks appear after you review a week with Bud.
              </p>
            )}
            <div className="space-y-3">
              {decks.map((deck: any) => {
                const label = topics.find((topic: any) => topic.stableKey === deck.stableKey)?.label;
                const showLabel = label && label !== deck.title;
                return (
                  <Link
                    key={deck.id}
                    href={`/dashboard/student/bud/review?deckId=${deck.id}`}
                    className="block rounded-2xl border border-amber-100/80 bg-white/70 p-4 transition hover:border-amber-300 dark:border-white/10 dark:bg-white/5"
                  >
                    <p className="font-semibold text-light-text-primary dark:text-dark-text-primary">{deck.title}</p>
                    <p className="mt-1 text-sm text-light-text-secondary dark:text-dark-text-secondary">
                      {deck.cards?.length || 0} {(deck.cards?.length || 0) === 1 ? 'card' : 'cards'}
                      {showLabel ? ` · ${label}` : ''}
                    </p>
                  </Link>
                );
              })}
            </div>
          </div>
        </BudShell>
      )}
    </ProtectedRoute>
  );
}
