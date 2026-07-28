import type { AppDispatch } from '../store';
import { eventsApi } from '../store/services/eventsApi';
import { userApi } from '../store/services/userApi';
import { notificationsApi } from '../store/services/notificationsApi';
import { shortsApi } from '../store/services/shortsApi';

// Kept in sync with PAGE_SIZE in hooks/usePaginatedEvents. The prefetch has to issue the
// *identical* query args to the ones that hook will subscribe with, or RTK Query keys it
// under a different cache entry and the screen refetches anyway — a wasted request rather
// than a warm cache. Any change to PAGE_SIZE has to be mirrored here.
const EVENTS_PAGE_SIZE = 20;

// Kept in sync with PAGE_SIZE in Pages/main/ShortsScreen — same cache-key requirement as
// EVENTS_PAGE_SIZE above. Different args mean a different cache entry, so a mismatch here
// makes the prefetch a wasted request rather than a warm feed.
const SHORTS_PAGE_SIZE = 10;

/**
 * Warms the queries the first post-login screens subscribe to, so they render with data
 * instead of a skeleton.
 *
 * Called immediately after a login/register/social-login mutation resolves — not on the
 * button press itself. These endpoints all require a Bearer token, and the token only
 * reaches the store when authApi's `matchFulfilled` runs (see authSlice's extraReducers),
 * which is the moment the mutation settles. Firing any earlier just produces a round of
 * 401s. That still runs while the navigation transition is animating, so the requests
 * overlap the part of the flow the user perceives as "after tapping the button".
 *
 * Fire-and-forget by design: nothing awaits it and no screen depends on it having finished.
 * If a request fails or is slow the screens fall back to their own loading states exactly as
 * before, which is why nothing here surfaces an error.
 *
 * Uses `util.prefetch` rather than `endpoints.x.initiate(...)`: initiate creates a
 * subscription that nothing here ever unsubscribes, which would pin these entries in the
 * cache for the process lifetime. prefetch resolves the data and lets the normal
 * subscription lifecycle take over when the screen mounts. `force: false` means an entry
 * that is already fresh is left alone instead of being re-requested.
 */
export function prefetchPostLoginData(dispatch: AppDispatch): void {
  // Profile — the Home header greeting/avatar and Explore's avatar both block on this, and
  // Home's lat/lng-based distance labels are derived from it.
  dispatch(userApi.util.prefetch('getMe', undefined, { force: false }));

  // The main feed. Home and Explore share this exact cache entry (page 1, no filters), so
  // one prefetch covers the landing screen and the first tab the user is likely to open.
  dispatch(
    eventsApi.util.prefetch(
      'getEvents',
      { page: 1, limit: EVENTS_PAGE_SIZE },
      { force: false },
    ),
  );

  // Drives the unread dot on the bell in both headers.
  dispatch(notificationsApi.util.prefetch('getNotifications', undefined, { force: false }));

  // Category chips on Search and the filter sheet.
  dispatch(userApi.util.prefetch('getCategories', undefined, { force: false }));

  // Bookings tab — cheap, and it is one of the most common first destinations for a
  // returning user.
  dispatch(eventsApi.util.prefetch('getMyEnrollments', undefined, { force: false }));

  // First page of the reel feed, newest first (the server orders by createdAt DESC), so
  // opening Shorts starts on video rather than a skeleton. Also warms Home's "Event
  // Highlights" strip, which reads the same endpoint — though at a different limit, so
  // that one is a separate cache entry and still loads on its own.
  dispatch(shortsApi.util.prefetch('getShortsFeed', { page: 1, limit: SHORTS_PAGE_SIZE }, { force: false }));
}
