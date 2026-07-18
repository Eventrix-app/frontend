import { createApi } from '@reduxjs/toolkit/query/react';
import { createFallbackBaseQuery } from './baseQuery';

export type NotificationKind = 'event_changed' | 'waitlist_promoted' | 'refund_status';

export interface NotificationRecord {
  id: string;
  type: NotificationKind;
  title: string;
  body: string;
  createdAt: string;
  readAt: string | null;
}

export const notificationsApi = createApi({
  reducerPath: 'notificationsApi',
  baseQuery: createFallbackBaseQuery(true),
  tagTypes: ['Notifications'],
  endpoints: (builder) => ({
    getNotifications: builder.query<NotificationRecord[], void>({
      query: () => 'notifications',
      providesTags: ['Notifications'],
    }),
    markNotificationRead: builder.mutation<void, string>({
      query: (id) => ({ url: `notifications/${id}/read`, method: 'PATCH' }),
      invalidatesTags: ['Notifications'],
    }),
    markAllNotificationsRead: builder.mutation<void, void>({
      query: () => ({ url: 'notifications/read-all', method: 'PATCH' }),
      invalidatesTags: ['Notifications'],
    }),
  }),
});

export const {
  useGetNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
} = notificationsApi;
