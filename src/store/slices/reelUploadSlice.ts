import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { UploadContentType } from '../services/eventsApi';
import type { ShortOverlay } from '../services/shortsApi';

export type ReelUploadStatus =
  // Bytes are moving to storage — this is the only state with meaningful progress.
  | 'uploading'
  // Bytes are in storage; the POST /shorts that turns them into a reel is in flight. Shown
  // as an indeterminate tail rather than 100%, because the job genuinely isn't done yet and
  // a failure here still loses the reel.
  | 'finalizing'
  | 'success'
  | 'error'
  | 'cancelled';

export interface ReelUploadJob {
  id: string;
  eventId: string;
  eventTitle?: string;
  /**
   * The local file:// URI. Kept for the whole job lifetime because it is both the upload
   * source and the cover image the progress bar renders — re-deriving a thumbnail would
   * mean decoding the video a second time for no benefit.
   */
  mediaUri: string;
  contentType: UploadContentType;
  caption?: string;
  overlay?: ShortOverlay;
  locationName?: string;
  latitude?: number;
  longitude?: number;
  /** 0..1, only meaningful while `status === 'uploading'`. */
  progress: number;
  status: ReelUploadStatus;
  error?: string;
}

interface ReelUploadState {
  jobs: ReelUploadJob[];
}

const initialState: ReelUploadState = { jobs: [] };

/**
 * Tracks reel uploads that outlive the screen that started them.
 *
 * The upload deliberately does not live in ShareReelScreen's component state: the whole
 * point is that tapping Share returns the user to Home immediately while the transfer
 * continues. A promise owned by an unmounted screen would keep running but have nowhere to
 * report to, and nothing could cancel it.
 *
 * This slice holds only observable state. The actual transfer is driven by
 * utils/reelUploadManager, which owns the XMLHttpRequest and dispatches into here.
 */
const reelUploadSlice = createSlice({
  name: 'reelUpload',
  initialState,
  reducers: {
    reelUploadQueued: (state, action: PayloadAction<ReelUploadJob>) => {
      state.jobs.push(action.payload);
    },
    reelUploadProgress: (state, action: PayloadAction<{ id: string; progress: number }>) => {
      const job = state.jobs.find((j) => j.id === action.payload.id);
      if (!job) return;
      job.progress = action.payload.progress;
    },
    reelUploadFinalizing: (state, action: PayloadAction<{ id: string }>) => {
      const job = state.jobs.find((j) => j.id === action.payload.id);
      if (!job) return;
      job.status = 'finalizing';
      job.progress = 1;
    },
    reelUploadSucceeded: (state, action: PayloadAction<{ id: string }>) => {
      const job = state.jobs.find((j) => j.id === action.payload.id);
      if (!job) return;
      job.status = 'success';
      job.progress = 1;
    },
    reelUploadFailed: (state, action: PayloadAction<{ id: string; error: string }>) => {
      const job = state.jobs.find((j) => j.id === action.payload.id);
      if (!job) return;
      job.status = 'error';
      job.error = action.payload.error;
    },
    reelUploadCancelled: (state, action: PayloadAction<{ id: string }>) => {
      const job = state.jobs.find((j) => j.id === action.payload.id);
      if (!job) return;
      job.status = 'cancelled';
    },
    // Removes the row from the UI entirely. Separate from the terminal statuses above so a
    // finished job can linger just long enough to be seen ("Reel shared") before it goes.
    reelUploadDismissed: (state, action: PayloadAction<{ id: string }>) => {
      state.jobs = state.jobs.filter((j) => j.id !== action.payload.id);
    },
  },
});

export const {
  reelUploadQueued,
  reelUploadProgress,
  reelUploadFinalizing,
  reelUploadSucceeded,
  reelUploadFailed,
  reelUploadCancelled,
  reelUploadDismissed,
} = reelUploadSlice.actions;

export default reelUploadSlice.reducer;
