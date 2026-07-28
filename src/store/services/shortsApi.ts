import { createApi } from '@reduxjs/toolkit/query/react';
import { createFallbackBaseQuery } from './baseQuery';

export interface ShortRecord {
  id: string;
  uploaderUserId: string;
  eventId: string;
  mediaUrl: string;
  thumbnailUrl?: string;
  caption?: string;
  moderationStatus: 'under_review' | 'published' | 'flagged' | 'removed';
  flagReason?: string;
  viewCount: number;
  likeCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateShortPayload {
  mediaUrl: string;
  thumbnailUrl?: string;
  caption?: string;
  eventId: string;
}

export const shortsApi = createApi({
  reducerPath: 'shortsApi',
  baseQuery: createFallbackBaseQuery(true),
  tagTypes: ['MyShorts', 'MyShortLikes'],
  endpoints: (builder) => ({
    createShort: builder.mutation<ShortRecord, CreateShortPayload>({
      query: (body) => ({ url: 'shorts', method: 'POST', body }),
      invalidatesTags: ['MyShorts'],
    }),
    getMyShorts: builder.query<ShortRecord[], void>({
      query: () => 'shorts/mine',
      providesTags: ['MyShorts'],
    }),
    getMyLikedShortIds: builder.query<string[], void>({
      query: () => 'shorts/my-likes',
      providesTags: ['MyShortLikes'],
    }),
    likeShort: builder.mutation<{ liked: boolean; likeCount: number }, string>({
      query: (id) => ({ url: `shorts/${id}/like`, method: 'POST' }),
      invalidatesTags: ['MyShortLikes'],
    }),
    unlikeShort: builder.mutation<{ liked: boolean; likeCount: number }, string>({
      query: (id) => ({ url: `shorts/${id}/like`, method: 'DELETE' }),
      invalidatesTags: ['MyShortLikes'],
    }),
    deleteMyShort: builder.mutation<void, string>({
      query: (id) => ({ url: `shorts/${id}`, method: 'DELETE' }),
      invalidatesTags: ['MyShorts'],
    }),
  }),
});

export const {
  useCreateShortMutation,
  useGetMyShortsQuery,
  useGetMyLikedShortIdsQuery,
  useLikeShortMutation,
  useUnlikeShortMutation,
  useDeleteMyShortMutation,
} = shortsApi;
