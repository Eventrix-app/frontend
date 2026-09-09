import { useEffect, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { AppDispatch, store } from '../store';
import { eventsApi } from '../store/services/eventsApi';
import {
  cacheEnrollments,
  clearPendingSync,
  markPendingSyncFailed,
  recordDuplicateEntry,
} from '../store/slices/checkInCacheSlice';
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

/**
 * Pulls the authoritative attendee list for every cached event.
 *
 * The exposure window for offline double-entry is not "while offline" — it is "since this
 * device last heard from the server". A device that regains signal for even a couple of
 * seconds should come back knowing what the other gates have claimed, so refreshing the
 * used-set is done on every reconnect, not just when the organizer happens to have the
 * screen open. Previously the drain only ever pushed, never pulled, so a device could stay
 * ignorant of every other gate's scans for the whole event.
 */
async function refreshUsedSets(dispatch: AppDispatch, eventIds: string[]): Promise<void> {
  await Promise.all(
    eventIds.map(async (eventId) => {
      try {
        const enrollments = await dispatch(
          eventsApi.endpoints.getEventEnrollments.initiate(eventId, { forceRefetch: true }),
        ).unwrap();
        dispatch(cacheEnrollments({ eventId, enrollments }));
      } catch {
        // Best effort. Failing to refresh just leaves the previous snapshot in place, which
        // is exactly the state we were already in.
      }
    }),
  );
}

// Drains every cached event's pendingSync queue, not just whichever event's CheckInScreen
// happens to be open — an organizer can back out of the screen (or the app can be killed)
// before connectivity returns, and those queued check-ins still need to land.
async function drainPendingSync(dispatch: AppDispatch) {
  if (isDraining) return;
  isDraining = true;
  try {
    const cache = store.getState().checkInCache;
    const eventIds = Object.keys(cache);
    let hitAuthFailure = false;
    let stuckCount = 0;
    let duplicateCount = 0;

    for (const eventId of eventIds) {
      const pending = cache[eventId]?.pendingSync ?? [];
      for (const entry of pending) {
        try {
          await dispatch(
            eventsApi.endpoints.checkIn.initiate({
              ticketCode: entry.ticketCode,
              idempotencyKey: entry.idempotencyKey,
            }),
          ).unwrap();
          dispatch(clearPendingSync({ eventId, ticketCode: entry.ticketCode }));
        } catch (err: any) {
          const data = err?.data ?? {};
          const msg: string = data.message ?? '';

          if (data.duplicateScan === true) {
            // A *different* scan claimed this ticket — the two-offline-gates case. Both
            // gates admitted the holder and neither could have known. Nothing is left to
            // sync, but this must not vanish: it is the only record that a double entry
            // happened, so it is kept for the organizer instead of being dropped.
            dispatch(
              recordDuplicateEntry({
                eventId,
                ticketCode: entry.ticketCode,
                enrollmentId: entry.enrollmentId,
                scannedAt: entry.checkedInAt,
                firstCheckedInAt: data.checkedInAt ?? null,
              }),
            );
            duplicateCount += 1;
          } else if (msg.toLowerCase().includes('already')) {
            // Reached only by a backend that predates the idempotency key (or an entry
            // queued before this app version), where a retry and a duplicate are still
            // indistinguishable. Treated as benign, which is what it usually is — but note
            // that with a current backend this branch no longer fires for either case:
            // a replay now returns 200 and a real duplicate sets duplicateScan.
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

    // After pushing, pull — so this device stops being the one that doesn't know about the
    // other gates' scans. Deliberately after the drain: our own queued check-ins should be
    // part of the snapshot we read back.
    await refreshUsedSets(dispatch, eventIds);

    if (hitAuthFailure && !hasWarnedAuthFailure) {
      hasWarnedAuthFailure = true;
      showAlert(
        'Sign-in expired',
        "Some offline check-ins couldn't sync because your session expired. Log back in to finish syncing them — they're still saved on this device.",
      );
    }

    if (duplicateCount > 0) {
      // Not gated behind a once-per-session flag like the warnings above: each duplicate is
      // a distinct incident an organizer may need to act on at the door, not a repeat of one
      // ongoing condition.
      showAlert(
        duplicateCount > 1 ? 'Duplicate entries detected' : 'Duplicate entry detected',
        `${duplicateCount} ticket${duplicateCount > 1 ? 's were' : ' was'} admitted here but had already been checked in at another gate. Open Check In to review.`,
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
      // Any transition into "online" counts, not only a false -> true edge. wasOnline starts
      // null, so a device whose first NetInfo event is already-online used to fall through
      // this check entirely and wait for a flap before ever syncing.
      const cameOnline = wasOnline.current !== true && isOnline;
      wasOnline.current = isOnline;
      if (cameOnline) drainPendingSync(dispatch);
    });

    return () => unsubscribe();
  }, [dispatch]);
}
