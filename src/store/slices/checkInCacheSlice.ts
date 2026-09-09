import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { EnrollmentRecord } from '../services/eventsApi';

export interface PendingSyncEntry {
  ticketCode: string;
  enrollmentId: string;
  checkedInAt: string;
  // Identifies this scan for the whole of its life, including every retry. Generated on
  // this device the moment the code was read, before any send attempt — which is the point:
  // if the very first request did reach the server and only its response was lost, the
  // replay carries the same key and the backend recognises it as already-applied rather
  // than as a second gate scanning the same ticket.
  //
  // Optional only because this state is persisted: entries queued by a build from before
  // keys existed rehydrate without one, and an organizer can update the app mid-event with
  // a queue already on disk. Those sync under the pre-key semantics (see the drain loop's
  // legacy branch) rather than being dropped. Anything queued by this build always has one.
  idempotencyKey?: string;
  // Bumped by useCheckInSyncRetry each time a sync attempt fails for a reason other than
  // "already checked in" or an expired session (both of which are handled separately) —
  // e.g. a malformed ticket code the backend will never accept. Without tracking this, an
  // entry like that retries silently forever on every reconnect with no visible sign it's
  // permanently stuck rather than just waiting on connectivity.
  retryCount?: number;
}

/**
 * A ticket this device admitted offline that the server says a *different* scan had already
 * claimed — i.e. the holder was very likely admitted twice, at two gates.
 *
 * This cannot be prevented while both devices are partitioned (two isolated verifiers given
 * the same state and input must reach the same decision), so the design goal is to always
 * find out. Kept after the queue entry is cleared, because the entry is resolved but the
 * fact that it happened is exactly what the organizer needs.
 */
export interface DuplicateEntry {
  ticketCode: string;
  enrollmentId: string;
  /** When this device admitted them. */
  scannedAt: string;
  /** When the winning scan admitted them, per the server. */
  firstCheckedInAt: string | null;
  acknowledged?: boolean;
}

interface EventCheckInCache {
  enrollments: EnrollmentRecord[];
  pendingSync: PendingSyncEntry[];
  duplicates: DuplicateEntry[];
}

// Keyed by eventId — persisted so a killed app reopened offline still has the last known
// attendee list and any not-yet-synced check-ins from before it was killed.
type CheckInCacheState = Record<string, EventCheckInCache>;

const initialState: CheckInCacheState = {};

// Older persisted state predates `duplicates`, so redux-persist can rehydrate a bucket
// without it. Every reducer below goes through this rather than indexing state[eventId]
// directly, so a rehydrated bucket can never crash on `.duplicates.push`.
function bucketFor(state: CheckInCacheState, eventId: string): EventCheckInCache {
  const existing = state[eventId];
  if (existing) {
    if (!existing.pendingSync) existing.pendingSync = [];
    if (!existing.duplicates) existing.duplicates = [];
    return existing;
  }
  state[eventId] = { enrollments: [], pendingSync: [], duplicates: [] };
  return state[eventId];
}

const checkInCacheSlice = createSlice({
  name: 'checkInCache',
  initialState,
  reducers: {
    // Snapshot of the confirmed server list, taken whenever GET /events/:id/enrollments
    // succeeds online. Does not touch pendingSync — offline-originated check-ins are
    // overlaid on top of this at render time until they've actually synced.
    cacheEnrollments(state, action: PayloadAction<{ eventId: string; enrollments: EnrollmentRecord[] }>) {
      const { eventId, enrollments } = action.payload;
      const bucket = bucketFor(state, eventId);
      bucket.enrollments = enrollments;
    },
    markCheckedInLocally(
      state,
      action: PayloadAction<{
        eventId: string;
        enrollmentId: string;
        ticketCode: string;
        checkedInAt: string;
        idempotencyKey: string;
      }>,
    ) {
      const { eventId, enrollmentId, ticketCode, checkedInAt, idempotencyKey } = action.payload;
      const bucket = bucketFor(state, eventId);
      if (!bucket.pendingSync.some((p) => p.enrollmentId === enrollmentId)) {
        bucket.pendingSync.push({ enrollmentId, ticketCode, checkedInAt, idempotencyKey });
      }
    },
    clearPendingSync(state, action: PayloadAction<{ eventId: string; ticketCode: string }>) {
      const { eventId, ticketCode } = action.payload;
      const bucket = state[eventId];
      if (!bucket?.pendingSync) return;
      bucket.pendingSync = bucket.pendingSync.filter((p) => p.ticketCode !== ticketCode);
    },
    markPendingSyncFailed(state, action: PayloadAction<{ eventId: string; ticketCode: string }>) {
      const { eventId, ticketCode } = action.payload;
      const entry = state[eventId]?.pendingSync?.find((p) => p.ticketCode === ticketCode);
      if (!entry) return;
      entry.retryCount = (entry.retryCount ?? 0) + 1;
    },
    // Resolves the queue entry (there is nothing left to sync — the server already has a
    // check-in for this ticket) while keeping the fact that a second admission happened.
    recordDuplicateEntry(
      state,
      action: PayloadAction<{
        eventId: string;
        ticketCode: string;
        enrollmentId: string;
        scannedAt: string;
        firstCheckedInAt: string | null;
      }>,
    ) {
      const { eventId, ticketCode, enrollmentId, scannedAt, firstCheckedInAt } = action.payload;
      const bucket = bucketFor(state, eventId);
      bucket.pendingSync = bucket.pendingSync.filter((p) => p.ticketCode !== ticketCode);
      if (!bucket.duplicates.some((d) => d.ticketCode === ticketCode)) {
        bucket.duplicates.push({ ticketCode, enrollmentId, scannedAt, firstCheckedInAt });
      }
    },
    acknowledgeDuplicates(state, action: PayloadAction<{ eventId: string }>) {
      const bucket = state[action.payload.eventId];
      if (!bucket?.duplicates) return;
      bucket.duplicates.forEach((d) => {
        d.acknowledged = true;
      });
    },
    // Called when CheckInScreen unmounts with an empty pendingSync queue — the cached
    // roster (attendee names/emails) has done its job and shouldn't keep sitting on disk
    // once the organizer's check-in session for this event is over.
    clearEventCache(state, action: PayloadAction<{ eventId: string }>) {
      delete state[action.payload.eventId];
    },
  },
});

export const {
  cacheEnrollments,
  markCheckedInLocally,
  clearPendingSync,
  markPendingSyncFailed,
  recordDuplicateEntry,
  acknowledgeDuplicates,
  clearEventCache,
} = checkInCacheSlice.actions;
export default checkInCacheSlice.reducer;
