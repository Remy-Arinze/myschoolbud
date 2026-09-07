'use client';

import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useGetBudMeQuery, useChatWithBudMutation, useConfirmBudRenameMutation } from '@/lib/store/api/budApi';
import { useState } from 'react';

export default function BudHomePage() {
  const { data, refetch } = useGetBudMeQuery();
  const [chat] = useChatWithBudMutation();
  const [confirm] = useConfirmBudRenameMutation();
  const [message, setMessage] = useState('');
  const [reply, setReply] = useState('');
  const payload = data?.data || data;
  const name = payload?.profile?.companionName || 'Bud';
  const pending = payload?.profile?.pendingRename;

  return (
    <ProtectedRoute roles={['STUDENT']}>
      <div className="max-w-3xl mx-auto space-y-6 p-6">
        <div>
          <p className="text-xs uppercase tracking-widest text-amber-600">Your study buddy</p>
          <h1 className="text-3xl font-black">{name}</h1>
          <p className="text-light-text-secondary dark:text-dark-text-secondary mt-1">
            Streak {payload?.profile?.streakCount || 0} · {payload?.dueCards || 0} cards due
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Talk to {name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <textarea
              className="w-full rounded-xl border p-3 bg-transparent min-h-[100px]"
              placeholder={`Ask ${name} to review today, or say "can I call you Tunde?"`}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <div className="flex gap-2">
              {reply && (
                <p className="text-sm rounded-xl bg-amber-50 dark:bg-amber-950/30 p-3">{reply}</p>
              )}
              <Button
                onClick={async () => {
                  try {
                    const res = await chat({ message }).unwrap();
                    const chatData = res?.data || res;
                    setReply(chatData?.reply || '');
                    if (chatData?.type === 'rename-done') refetch();
                    setMessage('');
                  } catch (err: any) {
                    setReply(err?.data?.message || 'Subscribe to chat with Bud.');
                  }
                }}
              >
                Send
              </Button>
              {pending && (
                <Button
                  variant="outline"
                  onClick={async () => {
                    await confirm().unwrap();
                    refetch();
                  }}
                >
                  Yes, call you {pending}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
        <div className="flex flex-wrap gap-3">
          <Link href="/dashboard/student/bud/review"><Button>Start review</Button></Link>
          <Link href="/dashboard/student/bud/decks"><Button variant="outline">Decks</Button></Link>
          <Link href="/dashboard/student/bud/subscribe"><Button variant="outline">Subscription</Button></Link>
        </div>
      </div>
    </ProtectedRoute>
  );
}
