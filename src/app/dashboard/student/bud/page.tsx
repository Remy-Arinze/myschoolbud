'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { Layers, Lightbulb, RectangleHorizontal } from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/Button';
import { LoisOrb } from '@/components/ai/LoisOrb';
import { BudPageSkeleton, BudShell, uniqueTopicLabels } from '@/components/bud/BudShell';
import { useChatWithBudMutation, useConfirmBudRenameMutation, useGetBudMeQuery } from '@/lib/store/api/budApi';

type ChatMessage = {
  id: string;
  role: 'user' | 'bud';
  text: string;
  rename?: string;
};

function chatIsUnlocked(sub: any) {
  if (!sub) return false;
  const statusOk = sub.status === 'ACTIVE' || sub.status === 'TRIAL';
  const inDate = !sub.endDate || new Date(sub.endDate) > new Date();
  return statusOk && inDate && Boolean(sub.plan?.chatEnabled);
}

export default function BudHomePage() {
  const { data, isLoading, refetch } = useGetBudMeQuery();
  const [chat, { isLoading: sending }] = useChatWithBudMutation();
  const [confirm, { isLoading: confirming }] = useConfirmBudRenameMutation();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const greeted = useRef(false);
  const seededRename = useRef(false);
  const threadEnd = useRef<HTMLDivElement>(null);
  const payload = data?.data || data;
  const name = payload?.profile?.companionName || 'Bud';
  const pending = payload?.profile?.pendingRename as string | null | undefined;
  const streak = payload?.profile?.streakCount || 0;
  const due = payload?.dueCards || 0;
  const labels = uniqueTopicLabels(payload?.topics);
  const unlocked = chatIsUnlocked(payload?.subscription);
  const canReview = due > 0 || labels.length > 0;

  useEffect(() => {
    if (!payload || greeted.current) return;
    greeted.current = true;
    setMessages([
      {
        id: 'hello',
        role: 'bud',
        text: `Hey. I'm ${name}. A few cards, or just ask what we should review.`,
      },
    ]);
  }, [payload, name]);

  useEffect(() => {
    if (!pending || seededRename.current) return;
    seededRename.current = true;
    setMessages((current) => [
      ...current,
      { id: `rename-${pending}`, role: 'bud', text: `Want me to go by ${pending}?`, rename: pending },
    ]);
  }, [pending]);

  useEffect(() => {
    threadEnd.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, sending]);

  const sendText = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sending || !unlocked) return;
    setMessage('');
    setMessages((current) => [...current, { id: `user-${Date.now()}`, role: 'user', text: trimmed }]);
    try {
      const res = await chat({ message: trimmed }).unwrap();
      const chatData = res?.data || res;
      if (chatData?.type === 'rename-confirm') {
        const nextName = chatData.companionName || trimmed;
        setMessages((current) => [
          ...current,
          { id: `rename-${Date.now()}`, role: 'bud', text: `Want me to go by ${nextName}?`, rename: nextName },
        ]);
        refetch();
        return;
      }
      if (chatData?.type === 'rename-done') {
        setMessages((current) => [
          ...current,
          { id: `bud-${Date.now()}`, role: 'bud', text: chatData.reply || `Got it — I'm ${chatData.companionName} now.` },
        ]);
        refetch();
        return;
      }
      setMessages((current) => [
        ...current,
        { id: `bud-${Date.now()}`, role: 'bud', text: chatData?.reply || 'Want to try a card on that?' },
      ]);
    } catch (err: any) {
      const raw = String(err?.data?.message || '');
      const textReply = /credit/i.test(raw)
        ? "That's enough chat for now. Your cards are still here."
        : "I couldn't get that just now. Try once more.";
      setMessages((current) => [...current, { id: `bud-err-${Date.now()}`, role: 'bud', text: textReply }]);
    }
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void sendText(message);
  };

  const answerRename = async (id: string, accept: boolean) => {
    if (!accept) {
      setMessages((current) => current.map((item) => (item.id === id ? { ...item, rename: undefined } : item)));
      return;
    }
    try {
      const res = await confirm().unwrap();
      const next = res?.data?.companionName || res?.companionName || name;
      setMessages((current) =>
        current.map((item) =>
          item.id === id ? { ...item, rename: undefined, text: `Got it — I'm ${next} now.` } : item,
        ),
      );
      refetch();
    } catch {
      setMessages((current) => [
        ...current,
        { id: `bud-err-${Date.now()}`, role: 'bud', text: "I couldn't save that name. Try once more." },
      ]);
    }
  };

  const inConversation = messages.some((item) => item.role === 'user' || item.rename);
  const visibleMessages = messages.filter((item) => item.id !== 'hello');

  const composer = unlocked ? (
    <form
      onSubmit={onSubmit}
      className="flex items-end gap-2 rounded-[1.75rem] border border-amber-100/80 bg-white/80 p-3 shadow-sm dark:border-white/10 dark:bg-white/5"
    >
      <textarea
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            void sendText(message);
          }
        }}
        rows={2}
        placeholder={`Ask ${name} about today's class`}
        className="min-h-[52px] flex-1 resize-none bg-transparent px-2 py-2 text-sm text-light-text-primary outline-none placeholder:text-light-text-secondary dark:text-dark-text-primary"
      />
      <Button
        type="submit"
        disabled={!message.trim() || sending}
        bgColor="bg-amber-600 hover:bg-amber-500"
        textColor="text-white"
        className="h-11 w-11 rounded-full p-0"
      >
        ↑
      </Button>
    </form>
  ) : (
    <div className="rounded-[1.75rem] border border-amber-100/80 bg-amber-50/70 p-4 dark:border-white/10 dark:bg-white/5">
      <p className="text-sm text-light-text-primary dark:text-dark-text-primary">
        Cards still work. Chat unlocks on a paid Bud plan.
      </p>
      <Link href="/dashboard/student/bud/subscribe" className="mt-3 inline-block">
        <Button size="sm" variant="outline">
          See plans
        </Button>
      </Link>
    </div>
  );

  return (
    <ProtectedRoute roles={['STUDENT']}>
      {isLoading && !payload ? (
        <BudPageSkeleton />
      ) : (
        <BudShell wide plain>
          <div className="space-y-8">
            <div className="space-y-2 text-center">
              <div className="flex justify-center">
                <LoisOrb size="lg" />
              </div>
              <h1 className="text-3xl font-black tracking-tight text-light-text-primary dark:text-dark-text-primary sm:text-4xl">
                Study with {name}
              </h1>
              <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                Streak {streak} {streak === 1 ? 'day' : 'days'} · {due} {due === 1 ? 'card' : 'cards'} due
              </p>
            </div>

            {!inConversation && composer}

            {!inConversation && (
              <div className="grid gap-3 sm:grid-cols-3">
                <button
                  type="button"
                  disabled={!unlocked || sending}
                  onClick={() => void sendText('Help me understand what we learnt today.')}
                  className="rounded-3xl border border-amber-100/80 bg-white/70 p-4 text-left transition hover:border-amber-300 disabled:opacity-60 dark:border-white/10 dark:bg-white/5"
                >
                  <Lightbulb className="mb-6 h-5 w-5 text-amber-600" />
                  <p className="font-semibold text-light-text-primary dark:text-dark-text-primary">Help me learn</p>
                  <p className="mt-1 text-sm text-light-text-secondary dark:text-dark-text-secondary">
                    Talk through today&apos;s class
                  </p>
                </button>
                <Link
                  href="/dashboard/student/bud/review"
                  className="rounded-3xl border border-amber-100/80 bg-amber-50/80 p-4 transition hover:border-amber-300 dark:border-white/10 dark:bg-white/5"
                >
                  <RectangleHorizontal className="mb-6 h-5 w-5 text-amber-700" />
                  <p className="font-semibold text-light-text-primary dark:text-dark-text-primary">Flashcards</p>
                  <p className="mt-1 text-sm text-light-text-secondary dark:text-dark-text-secondary">
                    {canReview ? 'Review what you learnt' : 'Cards appear after class'}
                  </p>
                </Link>
                <Link
                  href="/dashboard/student/bud/decks"
                  className="rounded-3xl border border-amber-100/80 bg-white/70 p-4 transition hover:border-amber-300 dark:border-white/10 dark:bg-white/5"
                >
                  <Layers className="mb-6 h-5 w-5 text-amber-600" />
                  <p className="font-semibold text-light-text-primary dark:text-dark-text-primary">My decks</p>
                  <p className="mt-1 text-sm text-light-text-secondary dark:text-dark-text-secondary">
                    Open a saved set
                  </p>
                </Link>
              </div>
            )}

            <section className="space-y-3 rounded-[1.75rem] border border-amber-100/70 bg-white/50 p-4 dark:border-white/10 dark:bg-white/5">
              <div>
                <h2 className="font-semibold text-light-text-primary dark:text-dark-text-primary">From your class today</h2>
                <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                  Topics your teacher has already taught.
                </p>
              </div>
              {labels.length === 0 ? (
                <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                  Nothing marked as taught yet. Open a delivered week in class and tap Review with Bud.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {labels.map((label) =>
                    unlocked ? (
                      <button
                        key={label}
                        type="button"
                        onClick={() => void sendText(`Help me understand ${label}.`)}
                        className="rounded-full border border-amber-200/80 px-3 py-1.5 text-sm text-amber-900 hover:bg-amber-50 dark:border-white/10 dark:text-amber-100 dark:hover:bg-white/5"
                      >
                        {label}
                      </button>
                    ) : (
                      <Link
                        key={label}
                        href="/dashboard/student/bud/review"
                        className="rounded-full border border-amber-200/80 px-3 py-1.5 text-sm text-amber-900 hover:bg-amber-50 dark:border-white/10 dark:text-amber-100 dark:hover:bg-white/5"
                      >
                        {label}
                      </Link>
                    ),
                  )}
                </div>
              )}
            </section>

            {inConversation && (
              <div className="space-y-3">
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setMessages([])}
                    className="text-sm text-amber-800 underline-offset-4 hover:underline dark:text-amber-200"
                  >
                    Back to study home
                  </button>
                </div>
                {visibleMessages.map((item) => (
                  <div key={item.id} className={item.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                    <div
                      className={
                        item.role === 'user'
                          ? 'max-w-[85%] rounded-2xl rounded-br-md bg-amber-600 px-4 py-3 text-sm text-white'
                          : 'max-w-[85%] rounded-2xl rounded-bl-md bg-amber-50 px-4 py-3 text-sm text-light-text-primary dark:bg-white/5 dark:text-dark-text-primary'
                      }
                    >
                      <p>{item.text}</p>
                      {item.rename && (
                        <div className="mt-3 flex gap-2">
                          <Button
                            size="xs"
                            bgColor="bg-amber-600 hover:bg-amber-500"
                            textColor="text-white"
                            disabled={confirming}
                            onClick={() => void answerRename(item.id, true)}
                          >
                            Yes
                          </Button>
                          <Button size="xs" variant="outline" disabled={confirming} onClick={() => void answerRename(item.id, false)}>
                            Not now
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {sending && (
                  <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">{name} is thinking…</p>
                )}
                <div ref={threadEnd} />
              </div>
            )}

            {inConversation && composer}

            <div className="text-center">
              <Link href="/dashboard/student/bud/subscribe" className="text-sm text-amber-800 underline-offset-4 hover:underline dark:text-amber-200">
                Subscription
              </Link>
            </div>
          </div>
        </BudShell>
      )}
    </ProtectedRoute>
  );
}
