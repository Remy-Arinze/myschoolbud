'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store/store';
import toast from 'react-hot-toast';
import { apiSlice } from '@/lib/store/api/apiSlice';
import { useDispatch } from 'react-redux';
import { playNotificationSound } from '@/lib/notifications/playNotificationSound';

/**
 * Unified SSE inbox listener for SCHOOL_ADMIN, TEACHER, and STUDENT.
 * Invalidates Notification tags on INBOX_CREATED and shows light toasts for key events.
 */
export function useInboxNotifications() {
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  const token = useSelector((state: RootState) => state.auth.token);
  const tenantId = useSelector((state: RootState) => state.auth.tenantId);
  const schoolId = tenantId || user?.schoolId || null;

  const eventSourceRef = useRef<EventSource | null>(null);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 5;

  const role = user?.role;
  const canConnect =
    !!token &&
    !!schoolId &&
    (role === 'TEACHER' || role === 'SCHOOL_ADMIN' || role === 'STUDENT');

  const connect = useCallback(() => {
    if (!canConnect || !schoolId || !token) return;

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const envUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    const url = `${envUrl}/schools/${schoolId}/notifications/stream?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.addEventListener('connected', () => {
      retryCountRef.current = 0;
    });

    es.addEventListener('notification', (event) => {
      try {
        const data = JSON.parse(event.data) as {
          type: string;
          title?: string;
          body?: string;
          studentName?: string;
          assessmentTitle?: string;
          subjectName?: string;
          notificationType?: string;
        };

        // Always refresh badge / inbox on new inbox rows
        if (data.type === 'INBOX_CREATED') {
          dispatch(apiSlice.util.invalidateTags(['Notification']));
          playNotificationSound();
          if (data.title) {
            toast(data.title, {
              duration: 5000,
              icon: '🔔',
              style: {
                borderRadius: '12px',
                background: 'var(--light-card)',
                color: 'var(--light-text-primary)',
                fontWeight: '600',
                fontSize: 'var(--text-body)',
                border: '1px solid var(--light-border)',
              },
            });
          }
          return;
        }

        // Legacy SSE events that may arrive without inbox (or before persist) — refresh badge only
        if (
          data.type === 'ASSESSMENT_SUBMITTED' ||
          data.type === 'ASSESSMENT_PUBLISHED' ||
          data.type === 'GRADE_PUBLISHED' ||
          data.type === 'STUDENT_REASSIGNED' ||
          data.type === 'SUBSCRIPTION_BILLING_REMINDER' ||
          data.type === 'ACADEMIC_RISK_DIGEST' ||
          data.type === 'LOIS_INSIGHT'
        ) {
          dispatch(apiSlice.util.invalidateTags(['Notification']));
        }
      } catch {
        // ignore
      }
    });

    es.onerror = () => {
      es.close();
      eventSourceRef.current = null;
      if (retryCountRef.current < MAX_RETRIES) {
        const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 30000);
        retryCountRef.current += 1;
        retryTimeoutRef.current = setTimeout(connect, delay);
      }
    };
  }, [canConnect, schoolId, token, role, dispatch]);

  useEffect(() => {
    connect();
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    };
  }, [connect]);
}
