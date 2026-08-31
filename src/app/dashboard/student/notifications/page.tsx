'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';

export default function StudentNotificationsPage() {
  return (
    <ProtectedRoute roles={['STUDENT']}>
      <NotificationCenter title="Notifications" />
    </ProtectedRoute>
  );
}
