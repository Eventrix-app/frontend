import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { EnrollmentRecord } from '../services/eventsApi';

export interface PendingSyncEntry {
  ticketCode: string;
  enrollmentId: string;
  checkedInAt: string;
  // Bumped by useCheckInSyncRetry each time a sync attempt fails for a reason other than
  // "already checked in" or an expired session (both of which are handled separately) —
  // e.g. a malformed ticket code the backend will never accept. Without tracking this, an
  // entry like that retries silently forever on every reconnect with no visible sign it's
  // permanently stuck rather than just waiting on connectivity.
  retryCount?: number;
}

interface EventCheckInCache {
  enrollments: EnrollmentRecord[];
  pendingSync: PendingSyncEntry[];
}

// Keyed by eventId — persisted so a killed app reopened offline still has the last known
// attendee list and any not-yet-synced check-ins from before it was killed.
type CheckInCacheState = Record<string, EventCheckInCache>;

const initialState: CheckInCacheState = {};

const checkInCacheSlice = createSlice({
  name: 'checkInCache',
  initialState,
  reducers: {
    // Snapshot of the confirmed server list, taken whenever GET /events/:id/enrollments
    // succeeds online. Does not touch pendingSync — offline-originated check-ins are
    // overlaid on top of this at render time until they've actually synced.
    cacheEnrollments(state, action: PayloadAction<{ eventId: string; enrollments: EnrollmentRecord[] }>) {
      const { eventId, enrollments } = action.payload;
      const existing = state[eventId];
      state[eventId] = { enrollments, pendingSync: existing?.pendingSync ?? [] };
    },
    markCheckedInLocally(
      state,
      action: PayloadAction<{ eventId: string; enrollmentId: string; ticketCode: string; checkedInAt: string }>,
    ) {
      const { eventId, enrollmentId, ticketCode, checkedInAt } = action.payload;
      const bucket = state[eventId] ?? { enrollments: [], pendingSync: [] };
      if (!bucket.pendingSync.some((p) => p.enrollmentId === enrollmentId)) {
        bucket.pendingSync.push({ enrollmentId, ticketCode, checkedInAt });
      }
      state[eventId] = bucket;
    },
    clearPendingSync(state, action: PayloadAction<{ eventId: string; ticketCode: string }>) {
      const { eventId, ticketCode } = action.payload;
      const bucket = state[eventId];
      if (!bucket) return;
      bucket.pendingSync = bucket.pendingSync.filter((p) => p.ticketCode !== ticketCode);
    },
    markPendingSyncFailed(state, action: PayloadAction<{ eventId: string; ticketCode: string }>) {
      const { eventId, ticketCode } = action.payload;
      const entry = state[eventId]?.pendingSync.find((p) => p.ticketCode === ticketCode);
      if (!entry) return;
      entry.retryCount = (entry.retryCount ?? 0) + 1;
    },
  },
});

export const { cacheEnrollments, markCheckedInLocally, clearPendingSync, markPendingSyncFailed } = checkInCacheSlice.actions;
export default checkInCacheSlice.reducer;
