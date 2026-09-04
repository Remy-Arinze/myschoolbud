'use client';

import React, { ReactNode, useEffect } from 'react';
import { useInboxNotifications } from '@/hooks/useInboxNotifications';
import { usePwaPush } from '@/hooks/usePwaPush';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store/store';
import {
  playNotificationSound,
  unlockNotificationSound,
} from '@/lib/notifications/playNotificationSound';

/**
 * Global Notification Provider — SSE inbox + SW registration for dashboard users.
 */
export function NotificationProvider({ children }: { children: ReactNode }) {
  const user = useSelector((s: RootState) => s.auth.user);
  const loggedIn = !!user && ['SCHOOL_ADMIN', 'TEACHER', 'STUDENT'].includes(user.role);

  useInboxNotifications();
  usePwaPush(loggedIn);

  useEffect(() => {
    if (!loggedIn) return;
    const unlock = () => unlockNotificationSound();
    document.addEventListener('pointerdown', unlock, { once: true });
    return () => document.removeEventListener('pointerdown', unlock);
  }, [loggedIn]);

  useEffect(() => {
    if (!loggedIn || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === 'PLAY_NOTIFICATION_SOUND') {
        playNotificationSound();
      }
    };
    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, [loggedIn]);

  return <>{children}</>;
}
