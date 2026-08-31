import { apiSlice } from './apiSlice';

export interface InAppNotification {
  id: string;
  userId: string;
  schoolId: string | null;
  role: string | null;
  type: string;
  title: string;
  body: string;
  link: string | null;
  metadata?: unknown;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationListResponse {
  items: InAppNotification[];
  nextCursor: string | null;
  hasMore: boolean;
}

export const notificationsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getNotifications: builder.query<
      { success: boolean; data: NotificationListResponse },
      { unreadOnly?: boolean; cursor?: string; limit?: number; schoolId?: string } | void
    >({
      query: (params) => {
        const sp = new URLSearchParams();
        if (params?.unreadOnly) sp.set('unreadOnly', 'true');
        if (params?.cursor) sp.set('cursor', params.cursor);
        if (params?.limit) sp.set('limit', String(params.limit));
        if (params?.schoolId) sp.set('schoolId', params.schoolId);
        const qs = sp.toString();
        return `/notifications${qs ? `?${qs}` : ''}`;
      },
      providesTags: ['Notification'],
      // Drop list cache when leaving the page so reopening always fetches fresh rows
      keepUnusedDataFor: 0,
    }),
    getUnreadNotificationCount: builder.query<
      { success: boolean; data: { count: number } },
      { schoolId?: string } | void
    >({
      query: (params) => {
        const sp = new URLSearchParams();
        if (params?.schoolId) sp.set('schoolId', params.schoolId);
        const qs = sp.toString();
        return `/notifications/unread-count${qs ? `?${qs}` : ''}`;
      },
      providesTags: ['Notification'],
    }),
    markNotificationRead: builder.mutation<
      { success: boolean },
      { id: string }
    >({
      query: ({ id }) => ({
        url: `/notifications/${id}/read`,
        method: 'PATCH',
      }),
      invalidatesTags: ['Notification'],
    }),
    markAllNotificationsRead: builder.mutation<
      { success: boolean; data: { updated: number } },
      { schoolId?: string } | void
    >({
      query: (body) => ({
        url: '/notifications/read-all',
        method: 'POST',
        body: body || {},
      }),
      invalidatesTags: ['Notification'],
    }),
    getVapidPublicKey: builder.query<
      { success: boolean; data: { publicKey: string | null } },
      void
    >({
      query: () => '/notifications/push/vapid-public-key',
    }),
    subscribePush: builder.mutation<
      { success: boolean },
      { endpoint: string; keys: { p256dh: string; auth: string }; userAgent?: string }
    >({
      query: (body) => ({
        url: '/notifications/push/subscribe',
        method: 'POST',
        body,
      }),
    }),
    unsubscribePush: builder.mutation<
      { success: boolean },
      { endpoint: string }
    >({
      query: (body) => ({
        url: '/notifications/push/subscribe',
        method: 'DELETE',
        body,
      }),
    }),
  }),
});

export const {
  useGetNotificationsQuery,
  useGetUnreadNotificationCountQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
  useGetVapidPublicKeyQuery,
  useSubscribePushMutation,
  useUnsubscribePushMutation,
  useLazyGetUnreadNotificationCountQuery,
} = notificationsApi;
