'use client';

import { useEffect, useMemo, useState } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { useGenerateBudDeckMutation, useGetBudTodayQuery, useRateBudCardMutation, useRecordBudSessionMutation } from '@/lib/store/api/budApi';

export default function BudReviewPage() {
  const { data, refetch } = useGetBudTodayQuery();
  const [rate] = useRateBudCardMutation();
  const [record] = useRecordBudSessionMutation();
  const [generateDeck] = useGenerateBudDeckMutation();
  const [flipped, setFlipped] = useState(false);
  const payload = data?.data || data;

  useEffect(() => {
    const weekId = new URLSearchParams(window.location.search).get('weekId');
    if (!weekId) return;
    generateDeck({ weekId })
      .unwrap()
      .then(() => refetch())
      .catch(() => undefined);
  }, [generateDeck, refetch]);
  const cards = useMemo(
    () => (payload?.decks || []).flatMap((d: any) => d.cards || []),
    [payload],
  );
  const [index, setIndex] = useState(0);
  const card = cards[index];

  return (
    <ProtectedRoute roles={['STUDENT']}>
      <div className="max-w-xl mx-auto p-6 space-y-4">
        <h1 className="text-2xl font-black">Today&apos;s review</h1>
        <p className="text-sm text-light-text-secondary">
          {payload?.plan?.stableKeys?.length || 0} topics from your scheme this week
        </p>
        {!card ? (
          <Card><CardContent className="p-6">No cards yet. Open a week and tap Review with Bud.</CardContent></Card>
        ) : (
          <Card className="min-h-[220px] cursor-pointer" onClick={() => setFlipped((f) => !f)}>
            <CardContent className="p-8 text-center text-lg font-semibold">
              {flipped ? card.back : card.front}
              <p className="text-xs mt-4 opacity-60">{flipped ? 'Back' : 'Tap to flip'}</p>
            </CardContent>
          </Card>
        )}
        {card && (
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((rating) => (
              <Button
                key={rating}
                variant="outline"
                onClick={async () => {
                  await rate({ cardId: card.id, rating }).unwrap();
                  setFlipped(false);
                  setIndex((i) => i + 1);
                  if (index + 1 >= cards.length) {
                    await record({ type: 'REVIEW', stableKeys: payload?.plan?.stableKeys || [] });
                    refetch();
                  }
                }}
              >
                {['Again', 'Hard', 'Good', 'Easy'][rating - 1]}
              </Button>
            ))}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
