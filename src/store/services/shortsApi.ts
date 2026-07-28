import { createApi } from '@reduxjs/toolkit/query/react';
import { createFallbackBaseQuery } from './baseQuery';

export interface ShortRecord {
  id: string;
  uploaderUserId: string;
  eventId: string;
  mediaUrl: string;
  thumbnailUrl?: string;
  caption?: string;
  // Where the *uploader* was, not where the event is — see CreateShortPayload below.
  locationName?: string;
  latitude?: number;
  longitude?: number;
  moderationStatus: 'under_review' | 'published' | 'flagged' | 'removed';
  flagReason?: string;
  viewCount: number;
  likeCount: number;
  createdAt: string;
  updatedAt: string;
}

// A reel as the public feed returns it: the record plus the two joined relations the feed
// needs to render an author line and an event chip. The uploader is deliberately narrow —
// GET /shorts/feed is a public route, so the server projects away email/phone/roles and
// this type reflects exactly what actually arrives.
export interface FeedShort extends ShortRecord {
  uploader?: { id: string; fullName?: string; profilePictureUrl?: string };
  event?: { id: string; title: string; coverImageUrl?: string };
}

export interface ShortsFeedResponse {
  shorts: FeedShort[];
  total: number;
  page: number;
  totalPages: number;
}

export interface CreateShortPayload {
  mediaUrl: string;
  thumbnailUrl?: string;
  caption?: string;
  eventId: string;
  // The reel's own location: seeded from the uploader's current position and re-pinnable
  // on a map before sharing. Deliberately separate from the event's venue coordinates —
  // a reel can be shot anywhere (outside the gate, at an afterparty, on the way home),
  // and the event's venue is already reachable through eventId. All three are optional
  // because a user can decline location permission and still post.
  locationName?: string;
  latitude?: number;
  longitude?: number;
}

export const shortsApi = createApi({
  reducerPath: 'shortsApi',
  baseQuery: createFallbackBaseQuery(true),
  tagTypes: ['MyShorts', 'MyShortLikes', 'ShortsFeed'],
  endpoints: (builder) => ({
    // The public reel feed. Invalidated by createShort/deleteMyShort below so a reel you
    // just uploaded appears without a manual refresh.
    getShortsFeed: builder.query<ShortsFeedResponse, { page?: number; limit?: number } | void>({
      query: (args) => ({
        url: 'shorts/feed',
        params: { page: args?.page ?? 1, limit: args?.limit ?? 10 },
      }),
      providesTags: ['ShortsFeed'],
    }),
    createShort: builder.mutation<ShortRecord, CreateShortPayload>({
      query: (body) => ({ url: 'shorts', method: 'POST', body }),
      invalidatesTags: ['MyShorts', 'ShortsFeed'],
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
      invalidatesTags: ['MyShorts', 'ShortsFeed'],
    }),
  }),
});

export const {
  useGetShortsFeedQuery,
  useCreateShortMutation,
  useGetMyShortsQuery,
  useGetMyLikedShortIdsQuery,
  useLikeShortMutation,
  useUnlikeShortMutation,
  useDeleteMyShortMutation,
} = shortsApi;
