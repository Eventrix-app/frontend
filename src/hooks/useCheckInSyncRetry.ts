import { useEffect, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { AppDispatch, store } from '../store';
import { eventsApi } from '../store/services/eventsApi';
import { clearPendingSync, markPendingSyncFailed } from '../store/slices/checkInCacheSlice';
import { showAlert } from '../utils/crossPlatformAlert';

// Session tokens expire after 1h (see JWT_SECRET/expiresIn on the backend) — an offline
// check-in session commonly runs longer than that at a real event. Without this flag, an
// expired token would make every queued check-in fail with 401 on every future reconnect,
// forever, with zero visible sign anything was wrong (the entry just silently never syncs).
// Warn once per app session rather than re-alerting on every reconnect attempt.
let hasWarnedAuthFailure = false;

// Below this many failed sync attempts, an entry just keeps quietly waiting for the next
// reconnect (a transient server error should get several chances). At or beyond it, the
// failure is almost certainly not going to resolve itself (e.g. a malformed ticket code
// the backend will never accept) — warn once so it doesn't retry forever with zero visible
// sign anything is wrong, same rationale as hasWarnedAuthFailure above.
const STUCK_RETRY_THRESHOLD = 5;
let hasWarnedStuckSync = false;

// Module-level (not per-hook-instance) re-entrancy guard: the initial NetInfo.fetch() and
// the reconnect listener below are two independent triggers into this same function, and a
// connectivity flap (common at a real venue) can fire both close together. Without this,
// two overlapping drains could both read the same still-queued entry and both dispatch
// `checkIn` for it before either's clearPendingSync lands, double-submitting the same
// offline check-in.
let isDraining = false;

// Drains every cached event's pendingSync queue, not just whichever event's CheckInScreen
// happens to be open — an organizer can back out of the screen (or the app can be killed)
// before connectivity returns, and those queued check-ins still need to land.
async function drainPendingSync(dispatch: AppDispatch) {
  if (isDraining) return;
  isDraining = true;
  try {
    const cache = store.getState().checkInCache;
    let hitAuthFailure = false;
    let stuckCount = 0;

    for (const eventId of Object.keys(cache)) {
      const pending = cache[eventId]?.pendingSync ?? [];
      for (const entry of pending) {
        try {
          await dispatch(eventsApi.endpoints.checkIn.initiate({ ticketCode: entry.ticketCode })).unwrap();
          dispatch(clearPendingSync({ eventId, ticketCode: entry.ticketCode }));
        } catch (err: any) {
          const msg: string = err?.data?.message ?? '';
          // Already checked in server-side (e.g. another device synced it first) — that's a
          // resolved outcome, not a failure to retry.
          if (msg.toLowerCase().includes('already')) {
            dispatch(clearPendingSync({ eventId, ticketCode: entry.ticketCode }));
          } else if (err?.status === 401) {
            // Session expired — every remaining (and future) sync attempt will fail the
            // same way until the user logs back in. Leave queued (don't drop real data),
            // but this needs to be visible instead of failing silently forever.
            hitAuthFailure = true;
          } else {
            // Anything else (e.g. a malformed ticket code the backend will never accept):
            // leave queued and retried on the next reconnect, but count the attempt so a
            // permanently-failing entry can be surfaced instead of retrying silently forever.
            dispatch(markPendingSyncFailed({ eventId, ticketCode: entry.ticketCode }));
            if ((entry.retryCount ?? 0) + 1 >= STUCK_RETRY_THRESHOLD) {
              stuckCount += 1;
            }
          }
        }
      }
    }

    if (hitAuthFailure && !hasWarnedAuthFailure) {
      hasWarnedAuthFailure = true;
      showAlert(
        'Sign-in expired',
        "Some offline check-ins couldn't sync because your session expired. Log back in to finish syncing them — they're still saved on this device.",
      );
    }

    if (stuckCount > 0 && !hasWarnedStuckSync) {
      hasWarnedStuckSync = true;
      showAlert(
        "Some check-ins won't sync",
        `${stuckCount} offline check-in${stuckCount > 1 ? 's have' : ' has'} repeatedly failed to sync and may need manual review — check the attendee list on this device.`,
      );
    }
  } finally {
    isDraining = false;
  }
}

/**
 * Replays queued offline check-ins (see checkInCacheSlice) as soon as connectivity
 * returns. Reconnect — not app-foreground — is the correct trigger here, since a scanning
 * device can regain signal while still in the foreground mid check-in session.
 */
export function useCheckInSyncRetry() {
  const dispatch = store.dispatch as AppDispatch;
  const wasOnline = useRef<boolean | null>(null);

  useEffect(() => {
    NetInfo.fetch().then((state) => {
      const isOnline = state.isConnected !== false && state.isInternetReachable !== false;
      wasOnline.current = isOnline;
      if (isOnline) drainPendingSync(dispatch);
    });

    const unsubscribe = NetInfo.addEventListener((state) => {
      const isOnline = state.isConnected !== false && state.isInternetReachable !== false;
      const justReconnected = wasOnline.current === false && isOnline;
      wasOnline.current = isOnline;
      if (justReconnected) drainPendingSync(dispatch);
    });

    return () => unsubscribe();
  }, [dispatch]);
}
