import { createApi } from '@reduxjs/toolkit/query/react';
import { createFallbackBaseQuery } from './baseQuery';

export type ReportTargetType = 'user' | 'chat_message' | 'review';

export interface CreateReportBody {
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
}

export interface BlockedUserRecord {
  id: string;
  fullName: string;
  profilePictureUrl: string | null;
  blockedAt: string;
}

// Trust & safety: reporting content/users (Backend's ReportsController, admin-reviewed)
// and blocking other users (Backend's BlocksController — currently filters event chat
// history for the blocker; see Backend's ChatService.getHistory).
export const moderationApi = createApi({
  reducerPath: 'moderationApi',
  baseQuery: createFallbackBaseQuery(true),
  tagTypes: ['BlockedUsers'],
  endpoints: (builder) => ({
    createReport: builder.mutation<void, CreateReportBody>({
      query: (body) => ({ url: 'reports', method: 'POST', body }),
    }),
    listBlockedUsers: builder.query<BlockedUserRecord[], void>({
      query: () => 'blocks',
      providesTags: ['BlockedUsers'],
    }),
    blockUser: builder.mutation<void, string>({
      query: (blockedUserId) => ({ url: 'blocks', method: 'POST', body: { blockedUserId } }),
      invalidatesTags: ['BlockedUsers'],
    }),
    unblockUser: builder.mutation<void, string>({
      query: (userId) => ({ url: `blocks/${userId}`, method: 'DELETE' }),
      invalidatesTags: ['BlockedUsers'],
    }),
  }),
});

export const {
  useCreateReportMutation,
  useListBlockedUsersQuery,
  useBlockUserMutation,
  useUnblockUserMutation,
} = moderationApi;
