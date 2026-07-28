import { createApi } from '@reduxjs/toolkit/query/react';
import { createFallbackBaseQuery } from './baseQuery';

/**
 * Text the creator positioned over the video on the edit screen.
 *
 * Every geometric value is a ratio of the video's rendered size, not a pixel measurement:
 * a reel is composed on the uploader's phone and replayed in everyone else's feed at
 * whatever size their device is, so pixels would land the text somewhere different, at a
 * different relative size, on every other screen.
 *
 * Not composited into the video file - the app draws this over the playing video, so the
 * media in storage carries no text. Burning it in would need a server-side FFmpeg pass.
 */
export interface ShortOverlay {
  text: string;
  color: string;
  fontFamily: string;
  /** Font size as a fraction of the video's width. */
  fontSizeRatio: number;
  /** Offset from the default caption position, as a fraction of width/height. */
  xRatio: number;
  yRatio: number;
}


export interface ShortComment {
  id: string;
  shortId: string;
  userId: string;
  body: string;
  createdAt: string;
  user?: { id: string; fullName?: string; profilePictureUrl?: string };
}

export interface ShortCommentsResponse {
  comments: ShortComment[];
  total: number;
  page: number;
  totalPages: number;
}

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
  overlay?: ShortOverlay;
  moderationStatus: 'under_review' | 'published' | 'flagged' | 'removed';
  flagReason?: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
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
  overlay?: ShortOverlay;
}

export const shortsApi = createApi({
  reducerPath: 'shortsApi',
  baseQuery: createFallbackBaseQuery(true),
  tagTypes: ['MyShorts', 'MyShortLikes', 'ShortsFeed', 'ShortComments'],
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
    // Like/unlike patch every cached feed page in place rather than invalidating
    // 'ShortsFeed'. Invalidating would refetch the feed and re-mount its video players
    // mid-scroll — a full reload of what you are watching, to change one number. The
    // authoritative count from the server is written back once the request resolves.
    likeShort: builder.mutation<{ liked: boolean; likeCount: number }, string>({
      query: (id) => ({ url: `shorts/${id}/like`, method: 'POST' }),
      invalidatesTags: ['MyShortLikes'],
      async onQueryStarted(id, api) {
        const { queryFulfilled } = api;
        const patch = patchFeedEverywhere(api, id, (short) => {
          short.likeCount += 1;
        });
        try {
          const { data } = await queryFulfilled;
          patchFeedEverywhere(api, id, (short) => {
            short.likeCount = data.likeCount;
          });
        } catch {
          // The request failed — put the count back rather than leaving a like that
          // never happened on screen.
          patch.forEach((p) => p.undo());
        }
      },
    }),
    unlikeShort: builder.mutation<{ liked: boolean; likeCount: number }, string>({
      query: (id) => ({ url: `shorts/${id}/like`, method: 'DELETE' }),
      invalidatesTags: ['MyShortLikes'],
      async onQueryStarted(id, api) {
        const { queryFulfilled } = api;
        const patch = patchFeedEverywhere(api, id, (short) => {
          // Floored at zero so a stale cached count can never render as negative.
          short.likeCount = Math.max(0, short.likeCount - 1);
        });
        try {
          const { data } = await queryFulfilled;
          patchFeedEverywhere(api, id, (short) => {
            short.likeCount = data.likeCount;
          });
        } catch {
          patch.forEach((p) => p.undo());
        }
      },
    }),
    getShortsByUploader: builder.query<ShortsFeedResponse, { userId: string; page?: number }>({
      query: ({ userId, page }) => ({
        url: `shorts/user/${userId}`,
        params: { page: page ?? 1, limit: 18 },
      }),
      providesTags: ['ShortsFeed'],
    }),
    getShortComments: builder.query<ShortCommentsResponse, { shortId: string; page?: number }>({
      query: ({ shortId, page }) => ({
        url: `shorts/${shortId}/comments`,
        params: { page: page ?? 1, limit: 20 },
      }),
      providesTags: (result, error, { shortId }) => [{ type: 'ShortComments', id: shortId }],
    }),
    addShortComment: builder.mutation<ShortComment, { shortId: string; body: string }>({
      query: ({ shortId, body }) => ({
        url: `shorts/${shortId}/comments`,
        method: 'POST',
        body: { body },
      }),
      invalidatesTags: (result, error, { shortId }) => [{ type: 'ShortComments', id: shortId }],
      // The feed row's counter is patched directly rather than by invalidating 'ShortsFeed',
      // for the same reason as likes: refetching the feed would re-mount the video players
      // mid-scroll to change one number.
      async onQueryStarted({ shortId }, api) {
        const { queryFulfilled } = api;
        const patch = patchFeedEverywhere(api, shortId, (short) => {
          short.commentCount += 1;
        });
        try {
          await queryFulfilled;
        } catch {
          patch.forEach((p) => p.undo());
        }
      },
    }),
    deleteShortComment: builder.mutation<void, { commentId: string; shortId: string }>({
      query: ({ commentId }) => ({ url: `shorts/comments/${commentId}`, method: 'DELETE' }),
      invalidatesTags: (result, error, { shortId }) => [{ type: 'ShortComments', id: shortId }],
      async onQueryStarted({ shortId }, api) {
        const { queryFulfilled } = api;
        const patch = patchFeedEverywhere(api, shortId, (short) => {
          short.commentCount = Math.max(0, short.commentCount - 1);
        });
        try {
          await queryFulfilled;
        } catch {
          patch.forEach((p) => p.undo());
        }
      },
    }),
    // Fire-and-forget from the caller's side: a view is a soft metric, and a failure to
    // record one must never interrupt playback.
    //
    // Deliberately not optimistic. The server counts one view per account for all time, so
    // a rewatch legitimately does not move the number — incrementing locally first would
    // show +1 and then snap back the moment the real total arrived. The server's value is
    // simply written in when it lands.
    recordShortView: builder.mutation<{ viewCount: number }, string>({
      query: (id) => ({ url: `shorts/${id}/view`, method: 'POST' }),
      async onQueryStarted(id, api) {
        try {
          const { data } = await api.queryFulfilled;
          patchFeedEverywhere(api, id, (short) => {
            short.viewCount = data.viewCount;
          });
        } catch {
          // An uncounted view is invisible to the user and not worth surfacing.
        }
      },
    }),
    deleteMyShort: builder.mutation<void, string>({
      query: (id) => ({ url: `shorts/${id}`, method: 'DELETE' }),
      invalidatesTags: ['MyShorts', 'ShortsFeed'],
    }),
  }),
});


type FeedPatch = { undo: () => void };

/**
 * Applies an edit to one reel across every cached page of the feed.
 *
 * The feed is paginated, so each page is its own cache entry and a given reel lives in one
 * of them — but which one is not knowable from here, and a reel can appear in more than one
 * entry once the user has paged and the feed has shifted. Every cached argument set is
 * visited; entries not containing the reel are left untouched.
 *
 * This exists so a like or a view updates the number in place. The alternative —
 * invalidating the 'ShortsFeed' tag — would refetch the feed and re-mount its video players
 * mid-scroll, reloading the reel being watched in order to change one digit.
 *
 * Returns the patch handles so a failed request can roll its change back.
 */
function patchFeedEverywhere(
  api: { dispatch: (action: any) => any; getState: () => any },
  shortId: string,
  edit: (short: FeedShort) => void,
): FeedPatch[] {
  const cachedArgs = shortsApi.util.selectCachedArgsForQuery(api.getState(), 'getShortsFeed');
  const patches: FeedPatch[] = [];

  cachedArgs.forEach((args) => {
    const patch = api.dispatch(
      shortsApi.util.updateQueryData('getShortsFeed', args, (draft) => {
        const short = draft.shorts.find((s) => s.id === shortId);
        if (short) edit(short);
      }),
    );
    patches.push(patch);
  });

  return patches;
}

export const {
  useGetShortsFeedQuery,
  useGetShortsByUploaderQuery,
  useGetShortCommentsQuery,
  useAddShortCommentMutation,
  useDeleteShortCommentMutation,
  useRecordShortViewMutation,
  useCreateShortMutation,
  useGetMyShortsQuery,
  useGetMyLikedShortIdsQuery,
  useLikeShortMutation,
  useUnlikeShortMutation,
  useDeleteMyShortMutation,
} = shortsApi;
