import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { AppDispatch, store } from '../store';
import { eventsApi } from '../store/services/eventsApi';
import { clearPendingSync } from '../store/slices/checkInCacheSlice';

// Session tokens expire after 1h (see JWT_SECRET/expiresIn on the backend) — an offline
// check-in session commonly runs longer than that at a real event. Without this flag, an
// expired token would make every queued check-in fail with 401 on every future reconnect,
// forever, with zero visible sign anything was wrong (the entry just silently never syncs).
// Warn once per app session rather than re-alerting on every reconnect attempt.
let hasWarnedAuthFailure = false;

// Drains every cached event's pendingSync queue, not just whichever event's CheckInScreen
// happens to be open — an organizer can back out of the screen (or the app can be killed)
// before connectivity returns, and those queued check-ins still need to land.
async function drainPendingSync(dispatch: AppDispatch) {
  const cache = store.getState().checkInCache;
  let hitAuthFailure = false;

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
        }
        // Any other error: leave queued, retried on the next reconnect.
      }
    }
  }

  if (hitAuthFailure && !hasWarnedAuthFailure) {
    hasWarnedAuthFailure = true;
    Alert.alert(
      'Sign-in expired',
      "Some offline check-ins couldn't sync because your session expired. Log back in to finish syncing them — they're still saved on this device.",
    );
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
