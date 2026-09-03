'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { Bell, CheckCheck, Loader2, Megaphone } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { FadeInUp } from '@/components/ui/FadeInUp';
import { cn } from '@/lib/utils';
import {
  useGetNotificationsQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
  type InAppNotification,
} from '@/lib/store/api/notificationsApi';
import { usePwaPush } from '@/hooks/usePwaPush';
import { RootState } from '@/lib/store/store';
import toast from 'react-hot-toast';
import { useLoisWorkspaceOptional } from '@/components/ai/LoisWorkspace';

function formatWhen(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function loisAskPrompt(n: InAppNotification): string | null {
  if (n.type !== 'LOIS_INSIGHT') return null;
  const meta = n.metadata;
  if (meta && typeof meta === 'object' && 'askPrompt' in meta) {
    const prompt = (meta as { askPrompt?: unknown }).askPrompt;
    if (typeof prompt === 'string' && prompt.trim()) return prompt;
  }
  if (n.title?.trim()) return `Explain this insight: ${n.title}`;
  return null;
}

export function NotificationCenter({
  title = 'Notifications',
}: {
  title?: string;
}) {
  const router = useRouter();
  const userId = useSelector((state: RootState) => state.auth.user?.id);
  const schoolId = useSelector(
    (state: RootState) => state.auth.tenantId || state.auth.user?.schoolId,
  );

  const { data, isLoading, isFetching, isError, refetch } = useGetNotificationsQuery(
    { limit: 50, schoolId: schoolId || undefined },
    {
      skip: !userId,
      refetchOnMountOrArgChange: true,
    },
  );
  const [markRead] = useMarkNotificationReadMutation();
  const [markAllRead, { isLoading: markingAll }] = useMarkAllNotificationsReadMutation();
  const { permission, vapidConfigured, enablePush } = usePwaPush(true);
  const workspace = useLoisWorkspaceOptional();

  const items = data?.data?.items ?? [];
  const unreadCount = items.filter((n) => !n.readAt).length;
  const showLoading = isLoading || (isFetching && items.length === 0);

  const onEnablePush = async () => {
    const result = await enablePush();
    if (result.ok) toast.success('Browser alerts enabled');
    else if (result.reason === 'denied') toast.error('Notification permission denied');
    else if (result.reason === 'no-vapid') toast.error('Push is not configured on the server yet');
    else if (result.reason === 'unsupported') toast.error('This browser does not support push');
    else toast.error('Could not enable alerts');
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <FadeInUp from={{ opacity: 0, y: -12 }} to={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-semibold text-xl lg:text-2xl text-light-text-primary dark:text-white flex items-center gap-2">
              <Bell className="h-6 w-6 text-[var(--agora-blue)]" />
              {title}
            </h1>
            <p
              className="mt-1 text-light-text-secondary dark:text-dark-text-secondary"
              style={{ fontSize: 'var(--text-body)' }}
            >
              Stay on top of submissions, term updates, and school activity.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {vapidConfigured && permission !== 'granted' && permission !== 'unsupported' && (
              <Button variant="primary" size="sm" onClick={onEnablePush}>
                <Megaphone className="h-4 w-4 mr-1.5" />
                Enable alerts
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllRead({ schoolId: schoolId || undefined })}
              disabled={markingAll || unreadCount === 0}
            >
              <CheckCheck className="h-4 w-4 mr-1.5" />
              Mark all read
            </Button>
          </div>
        </div>
      </FadeInUp>

      {showLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--agora-blue)]" />
        </div>
      ) : isError ? (
        <div className="rounded-lg border border-[var(--light-border)] dark:border-[var(--dark-border)] bg-[var(--light-card)] dark:bg-[var(--dark-surface)] px-6 py-16 text-center">
          <Bell className="h-10 w-10 mx-auto text-light-text-muted mb-3 opacity-50" />
          <p className="font-medium text-light-text-primary dark:text-dark-text-primary">
            Could not load notifications
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-4 text-[var(--agora-blue)] text-sm font-medium hover:underline"
          >
            Try again{isFetching ? '…' : ''}
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-[var(--light-border)] dark:border-[var(--dark-border)] bg-[var(--light-card)] dark:bg-[var(--dark-surface)] px-6 py-16 text-center">
          <Bell className="h-10 w-10 mx-auto text-light-text-muted mb-3 opacity-50" />
          <p className="font-medium text-light-text-primary dark:text-dark-text-primary">
            You&apos;re all caught up
          </p>
          <p
            className="mt-1 text-light-text-muted dark:text-dark-text-muted"
            style={{ fontSize: 'var(--text-body)' }}
          >
            New activity from your school will show up here.
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-4 text-[var(--agora-blue)] text-sm font-medium hover:underline"
          >
            Refresh{isFetching ? '…' : ''}
          </button>
        </div>
      ) : (
        <ul className="rounded-lg border border-[var(--light-border)] dark:border-[var(--dark-border)] bg-[var(--light-card)] dark:bg-[var(--dark-surface)] divide-y divide-[var(--light-border)] dark:divide-[var(--dark-border)] overflow-hidden">
          {items.map((n) => {
            const unread = !n.readAt;
            const askPrompt = loisAskPrompt(n);
            const openLois = askPrompt && workspace;
            const content = (
              <div
                className={cn(
                  'flex gap-3 px-4 py-3.5 transition-colors',
                  unread
                    ? 'bg-[var(--agora-blue)]/[0.04]'
                    : 'hover:bg-gray-50 dark:hover:bg-white/[0.03]',
                )}
              >
                <span
                  className={cn(
                    'mt-1.5 h-2 w-2 rounded-full shrink-0',
                    unread ? 'bg-[var(--agora-blue)]' : 'bg-transparent',
                  )}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <p
                      className={cn(
                        'truncate',
                        unread
                          ? 'font-semibold text-light-text-primary dark:text-dark-text-primary'
                          : 'font-medium text-light-text-secondary dark:text-dark-text-secondary',
                      )}
                      style={{ fontSize: 'var(--text-body)' }}
                    >
                      {n.title}
                    </p>
                    <time
                      className="shrink-0 text-light-text-muted tabular-nums"
                      style={{ fontSize: 'var(--text-small)' }}
                    >
                      {formatWhen(n.createdAt)}
                    </time>
                  </div>
                  <p
                    className="mt-0.5 text-light-text-secondary dark:text-dark-text-secondary leading-snug"
                    style={{ fontSize: 'var(--text-small)' }}
                  >
                    {n.body}
                  </p>
                </div>
              </div>
            );

            if (openLois) {
              return (
                <li key={n.id}>
                  <button
                    type="button"
                    className="w-full text-left"
                    onClick={() => {
                      void markRead({ id: n.id });
                      if (askPrompt) workspace?.askLois(askPrompt);
                    }}
                  >
                    {content}
                  </button>
                </li>
              );
            }

            if (n.link) {
              return (
                <li key={n.id}>
                  <Link
                    href={n.link}
                    onClick={() => {
                      void markRead({ id: n.id });
                    }}
                    className="block"
                  >
                    {content}
                  </Link>
                </li>
              );
            }

            return (
              <li key={n.id}>
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => {
                    void markRead({ id: n.id });
                    router.refresh();
                  }}
                >
                  {content}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
