import { createApi } from '@reduxjs/toolkit/query/react';
import { createFallbackBaseQuery } from './baseQuery';
import { userApi } from './userApi';

// Mirrors the limit getShortComments requests, and the server's own default.
const COMMENTS_PAGE_SIZE = 20;

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
      // One accumulated cache entry per page *size*, instead of one entry per page.
      //
      // With an entry per page, a like or comment patched into page 1's entry never reached
      // the list on screen: the feed screen kept its own merged copy of every page it had
      // loaded, and only the currently-fetching page's entry could ever flow back into it.
      // Tapping the heart on a reel from page 1 while scrolled to page 3 left the count
      // frozen until a full refetch. Accumulating here makes the cache itself the merged
      // feed, so patchFeedEverywhere below edits exactly what is being rendered.
      //
      // Keyed by limit so HomeScreen's 6-item strip stays a separate entry from the
      // full-screen feed's 10 and the two never merge into each other.
      serializeQueryArgs: ({ endpointName, queryArgs }) => `${endpointName}(${queryArgs?.limit ?? 10})`,
      merge: (currentCache, incoming) => {
        // Page 1 is a fresh start, not an append — this is the path a pull-to-refresh or a
        // 'ShortsFeed' invalidation takes, and appending there would duplicate the feed.
        if (incoming.page <= 1) {
          Object.assign(currentCache, incoming);
          return;
        }
        // Dedupe by id: a reel inserted while paging shifts rows across the page boundary
        // and would otherwise arrive twice, crashing FlatList on duplicate keys.
        const seen = new Set(currentCache.shorts.map((s) => s.id));
        currentCache.shorts.push(...incoming.shorts.filter((s) => !seen.has(s.id)));
        currentCache.page = incoming.page;
        currentCache.total = incoming.total;
        currentCache.totalPages = incoming.totalPages;
      },
      forceRefetch: ({ currentArg, previousArg }) => currentArg?.page !== previousArg?.page,
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
        const likedPatch = patchMyLikes(api, id, true);
        try {
          const { data } = await queryFulfilled;
          patchFeedEverywhere(api, id, (short) => {
            short.likeCount = data.likeCount;
          });
        } catch {
          // The request failed — put the count back rather than leaving a like that
          // never happened on screen.
          patch.forEach((p) => p.undo());
          likedPatch?.undo();
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
        const likedPatch = patchMyLikes(api, id, false);
        try {
          const { data } = await queryFulfilled;
          patchFeedEverywhere(api, id, (short) => {
            short.likeCount = data.likeCount;
          });
        } catch {
          patch.forEach((p) => p.undo());
          likedPatch?.undo();
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
      async onQueryStarted({ shortId, body }, api) {
        const { queryFulfilled } = api;
        const patch = patchFeedEverywhere(api, shortId, (short) => {
          short.commentCount += 1;
        });
        // The open sheet renders its own header count off getShortComments.total, which the
        // tag invalidation above only corrects a round trip later. Showing the comment (and
        // the count) the instant it is sent is the whole point — the refetch then replaces
        // this placeholder with the server's real row.
        const sheetPatch = patchOpenCommentSheet(api, shortId, body);
        try {
          await queryFulfilled;
        } catch {
          patch.forEach((p) => p.undo());
          sheetPatch.forEach((p) => p.undo());
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
 * Inserts a just-sent comment into whichever cached page of a reel's comments is open.
 *
 * The author is taken from the cached profile so the row renders with the real name and
 * avatar rather than a blank placeholder; the id is temporary and lives only until the
 * invalidated refetch replaces the list with the server's copy.
 */
function patchOpenCommentSheet(
  api: { dispatch: (action: any) => any; getState: () => any },
  shortId: string,
  body: string,
): FeedPatch[] {
  const state = api.getState();
  const author = userApi.endpoints.getMe.select()(state).data;
  const authUser = state.auth?.user;
  const userId = author?.id ?? authUser?.id;
  if (!userId) return [];

  const optimistic: ShortComment = {
    id: `optimistic-${Date.now()}`,
    shortId,
    userId,
    body,
    createdAt: new Date().toISOString(),
    user: {
      id: userId,
      fullName: author?.fullName ?? authUser?.full_name ?? undefined,
      profilePictureUrl: author?.profilePictureUrl ?? undefined,
    },
  };

  // Only the first page is touched — that is the one the sheet opens on and never pages
  // past. The row is appended, not prepended, because the server orders comments oldest
  // first (ShortsService.findComments), and it is only appended while that page still has
  // room: on a full page the server's copy would not include it either, so adding it here
  // would only make it appear and then vanish on the refetch. The total still moves.
  const cachedArgs = shortsApi.util
    .selectCachedArgsForQuery(state, 'getShortComments')
    .filter((args) => args.shortId === shortId && (args.page ?? 1) === 1);

  return cachedArgs.map((args) =>
    api.dispatch(
      shortsApi.util.updateQueryData('getShortComments', args, (draft) => {
        if (draft.comments.length < COMMENTS_PAGE_SIZE) draft.comments.push(optimistic);
        draft.total += 1;
      }),
    ),
  );
}

/**
 * Flips one reel's entry in the signed-in user's liked-id list straight away.
 *
 * The heart's fill colour is driven entirely by this list, and like/unlike only invalidate
 * the 'MyShortLikes' tag — so the icon used to stay on its old colour for a full round trip
 * (the POST, then the refetch the invalidation queues) after a tap that had already been
 * accepted. The invalidation still runs and remains the authority; this only closes the gap.
 *
 * Returns undefined when the list has never been fetched (a signed-out viewer), where there
 * is no cache entry to patch and nothing rendering a filled heart either.
 */
function patchMyLikes(
  api: { dispatch: (action: any) => any; getState: () => any },
  shortId: string,
  liked: boolean,
): FeedPatch | undefined {
  const cached = shortsApi.util.selectCachedArgsForQuery(api.getState(), 'getMyLikedShortIds');
  if (cached.length === 0) return undefined;
  return api.dispatch(
    shortsApi.util.updateQueryData('getMyLikedShortIds', undefined, (draft) => {
      const index = draft.indexOf(shortId);
      if (liked && index === -1) draft.push(shortId);
      if (!liked && index !== -1) draft.splice(index, 1);
    }),
  );
}

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
