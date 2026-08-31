'use client';

import React, { ReactNode } from 'react';
import { useInboxNotifications } from '@/hooks/useInboxNotifications';
import { usePwaPush } from '@/hooks/usePwaPush';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store/store';

/**
 * Global Notification Provider — SSE inbox + SW registration for dashboard users.
 */
export function NotificationProvider({ children }: { children: ReactNode }) {
  const user = useSelector((s: RootState) => s.auth.user);
  const loggedIn = !!user && ['SCHOOL_ADMIN', 'TEACHER', 'STUDENT'].includes(user.role);

  useInboxNotifications();
  usePwaPush(loggedIn);

  return <>{children}</>;
}
