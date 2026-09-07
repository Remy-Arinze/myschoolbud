'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Card, CardContent } from '@/components/ui/Card';
import { useGetBudTodayQuery } from '@/lib/store/api/budApi';

export default function BudDecksPage() {
  const { data } = useGetBudTodayQuery();
  const decks = (data?.data || data)?.decks || [];
  return (
    <ProtectedRoute roles={['STUDENT']}>
      <div className="max-w-3xl mx-auto p-6 space-y-4">
        <h1 className="text-2xl font-black">Your decks</h1>
        {decks.length === 0 && <p>No saved decks yet.</p>}
        {decks.map((deck: any) => (
          <Card key={deck.id}>
            <CardContent className="p-4">
              <p className="font-semibold">{deck.title}</p>
              <p className="text-sm opacity-70">{deck.cards?.length || 0} cards · {deck.stableKey || 'custom'}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </ProtectedRoute>
  );
}
