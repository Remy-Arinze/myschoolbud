'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';

export default function SchoolNotificationsPage() {
  return (
    <ProtectedRoute roles={['SCHOOL_ADMIN']}>
      <NotificationCenter title="Notifications" />
    </ProtectedRoute>
  );
}
