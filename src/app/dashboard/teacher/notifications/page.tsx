'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';

export default function TeacherNotificationsPage() {
  return (
    <ProtectedRoute roles={['TEACHER']}>
      <NotificationCenter title="Notifications" />
    </ProtectedRoute>
  );
}
