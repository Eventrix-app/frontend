import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { EnrollmentRecord } from '../services/eventsApi';

export interface PendingSyncEntry {
  ticketCode: string;
  enrollmentId: string;
  checkedInAt: string;
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
  },
});

export const { cacheEnrollments, markCheckedInLocally, clearPendingSync } = checkInCacheSlice.actions;
export default checkInCacheSlice.reducer;
