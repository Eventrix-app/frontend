/**
 * Cache lifetimes for RTK Query slices, expressed as intent rather than scattered numbers.
 *
 * `keepUnusedDataFor` is how long a cache entry survives after its **last subscriber
 * unmounts** — it is not a staleness bound. A subscribed screen keeps showing cached data
 * regardless; this only decides whether navigating away and back re-fetches from scratch or
 * paints instantly from cache.
 *
 * RTK Query's default is 60 seconds, which is tuned for a web app where a tab stays open.
 * On mobile the same 60s means routine navigation — open a reel, back out, open another —
 * routinely lands just past the window, so the list is thrown away and refetched. Every one
 * of those is a request the backend did not need to serve.
 *
 * Lifetimes are paired with invalidation, never used in place of it: a mutation that
 * invalidates its tags refetches immediately no matter how long the entry would have lived.
 * That is what makes the longer windows safe — stale data is corrected by the write that
 * caused it, not by waiting for an expiry.
 */

/** Effectively immutable within a session — reverse-geocode results, static reference data. */
export const CACHE_STATIC = 60 * 60; // 1 hour

/** Changes rarely and only by an explicit action that invalidates it (categories, blocks). */
export const CACHE_STABLE = 15 * 60; // 15 minutes

/** Normal user-owned content: profiles, bookings, notifications, organizer data. */
export const CACHE_DYNAMIC = 5 * 60; // 5 minutes

/** Contended or fast-moving data where a stale paint is user-visible (feeds, seat counts). */
export const CACHE_VOLATILE = 60; // 1 minute — RTK Query's own default, stated explicitly

/**
 * Data that must never be served from a previous subscription: live chat, where the socket
 * owns correctness and a rehydrated backlog would race the live buffer.
 */
export const CACHE_NONE = 0;
