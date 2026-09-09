import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { AppDispatch } from '../store';
import { eventsApi, UploadContentType } from '../store/services/eventsApi';
import { shortsApi, ShortOverlay } from '../store/services/shortsApi';
import {
  reelUploadQueued,
  reelUploadProgress,
  reelUploadFinalizing,
  reelUploadSucceeded,
  reelUploadFailed,
  reelUploadCancelled,
  reelUploadDismissed,
  ReelUploadJob,
} from '../store/slices/reelUploadSlice';
import { extractErrorMessage } from './apiError';

export interface StartReelUploadInput {
  eventId: string;
  eventTitle?: string;
  mediaUri: string;
  contentType: UploadContentType;
  caption?: string;
  overlay?: ShortOverlay;
  locationName?: string;
  latitude?: number;
  longitude?: number;
}

// Silent low-importance channel: progress updates dozens of times per upload. Android
// ignores importance changes to an existing channel, so the ID is versioned.
export const REEL_UPLOAD_CHANNEL_ID = 'reel-upload-progress-v1';

// Marks our own notifications so the global handler presents them silently and the tap
// handler ignores them — they have no Notifications-screen entry to open.
export const REEL_UPLOAD_NOTIFICATION_TYPE = 'reel-upload';

// Must match MAX_VIDEO_BYTES in Backend uploads.service.ts, itself pinned to the Supabase
// project limit. Checked here so an oversized file fails before spending mobile data.
export const MAX_REEL_BYTES = 50 * 1024 * 1024;

const formatMb = (bytes: number) => `${Math.round(bytes / (1024 * 1024))}MB`;

// A live XHR per job, keyed by job id. Module scope, not React state — the request has to
// outlive the screen that started it, which is the entire point of this module.
const inFlight = new Map<string, XMLHttpRequest>();

// Cancelled after the bytes landed but before the reel is created: no XHR left to abort, so
// runUpload honours this instead. Otherwise the X clears the row and the reel still appears.
const cancelRequested = new Set<string>();

// Terminal notifications survive as history; progress ones are replaced in place by
// reusing the identifier, so the tray never accumulates one row per percent.
const notificationIdFor = (jobId: string) => `reel-upload-${jobId}`;

let channelReady: Promise<void> | null = null;
function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return Promise.resolve();
  if (!channelReady) {
    channelReady = Notifications.setNotificationChannelAsync(REEL_UPLOAD_CHANNEL_ID, {
      name: 'Reel uploads',
      importance: Notifications.AndroidImportance.LOW,
      sound: null,
      vibrationPattern: null,
      enableVibrate: false,
      showBadge: false,
    })
      .then(() => {})
      // Notifications are a progress nicety; the upload itself must never fail because the
      // channel could not be created (permission denied, unsupported host, Expo Go).
      .catch(() => {});
  }
  return channelReady;
}

async function postNotification(jobId: string, title: string, body: string): Promise<void> {
  try {
    await ensureAndroidChannel();
    await Notifications.scheduleNotificationAsync({
      identifier: notificationIdFor(jobId),
      content: {
        title,
        body,
        sound: false,
        sticky: false,
        data: { type: REEL_UPLOAD_NOTIFICATION_TYPE, jobId },
        ...(Platform.OS === 'android' ? { channelId: REEL_UPLOAD_CHANNEL_ID } : {}),
      },
      // null = deliver now. Re-scheduling with the same identifier replaces the delivered
      // notification rather than stacking a new one.
      trigger: null,
    });
  } catch {
    // Same reasoning as above — never let the notification layer break the upload.
  }
}

async function dismissNotification(jobId: string): Promise<void> {
  try {
    await Notifications.dismissNotificationAsync(notificationIdFor(jobId));
  } catch {
    /* no-op */
  }
}

// XHR, not fetch: fetch exposes no upload progress and no real abort. The body is a Blob
// backed by a native file handle, so a long video never enters the JS heap.

// Supabase Storage puts the actual cause in the response body (MIME rejected, token already
// consumed, duplicate object) — without it every one of those reads as "HTTP 400".
function describeStorageFailure(xhr: XMLHttpRequest): string {
  const status = xhr.status;
  const raw = typeof xhr.responseText === 'string' ? xhr.responseText.trim() : '';

  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      const detail = parsed?.message ?? parsed?.error;
      if (typeof detail === 'string' && detail) return `${detail} (HTTP ${status})`;
    } catch {
      // Not JSON — fall through and show the raw body, capped so an HTML error page cannot
      // become the entire notification.
    }
    return `${raw.slice(0, 200)} (HTTP ${status})`;
  }

  // No body at all. The status alone still separates the two most likely causes.
  if (status === 413) return `the file is larger than the storage bucket allows (HTTP 413)`;
  return `HTTP ${status}`;
}

function putWithProgress(
  jobId: string,
  uploadUrl: string,
  blob: Blob,
  contentType: string,
  onProgress: (fraction: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    inFlight.set(jobId, xhr);

    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', contentType);

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || event.total === 0) return;
      // Clamped because reported bytes can exceed the declared total (observed at 200%, likely
      // a redirect re-sending the body). Progress is a fraction and must never exceed 100%.
      onProgress(Math.min(1, Math.max(0, event.loaded / event.total)));
    };

    xhr.onload = () => {
      inFlight.delete(jobId);
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }
      // Storage explains every rejection in the body; reporting only the status code left
      // "HTTP 400" meaning any of a dozen different things.
      reject(new Error(`Storage rejected the upload: ${describeStorageFailure(xhr)}`));
    };
    xhr.onerror = () => {
      inFlight.delete(jobId);
      reject(new Error('Network error while uploading. Check your connection and try again.'));
    };
    xhr.onabort = () => {
      inFlight.delete(jobId);
      reject(new UploadCancelledError());
    };

    xhr.send(blob);
  });
}

class UploadCancelledError extends Error {
  readonly cancelled = true;
  constructor() {
    super('Upload cancelled');
  }
}

const isCancellation = (err: unknown): boolean => err instanceof UploadCancelledError;

// extractErrorMessage only reads RTK Query's data.message, so plain Errors thrown here would
// collapse to a generic fallback — losing exactly what distinguishes "too large" from "no signal".
function describeUploadError(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  return extractErrorMessage(err, 'Please try again.');
}

// How long a finished job lingers in the store before clearing itself.
const TERMINAL_LINGER_MS = 4000;

// Clearing belongs to whatever owns the job lifecycle, not a view that may not be mounted:
// the old timer lived in a component that no longer exists, so finished jobs leaked forever.
function scheduleCleanup(dispatch: AppDispatch, jobId: string): void {
  setTimeout(() => {
    dispatch(reelUploadDismissed({ id: jobId }));
  }, TERMINAL_LINGER_MS);
}

/**
 * Queues a reel upload and returns immediately.
 *
 * Fire-and-forget by design: the caller navigates away on the same tick, and every outcome
 * is reported through the reelUpload slice (for the in-app progress bar) and a local
 * notification (for when the app isn't in the foreground). Nothing awaits this.
 *
 * Caveat worth knowing: this keeps running while the app is backgrounded, but an OS that
 * suspends or kills the process will stop it — there is no OS-level background transfer
 * here. A killed upload leaves no orphaned reel row, because the row is only created after
 * the bytes land.
 */
export function startReelUpload(dispatch: AppDispatch, input: StartReelUploadInput): string {
  const jobId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const job: ReelUploadJob = {
    id: jobId,
    eventId: input.eventId,
    eventTitle: input.eventTitle,
    mediaUri: input.mediaUri,
    contentType: input.contentType,
    caption: input.caption,
    overlay: input.overlay,
    locationName: input.locationName,
    latitude: input.latitude,
    longitude: input.longitude,
    progress: 0,
    status: 'uploading',
  };
  dispatch(reelUploadQueued(job));

  void runUpload(dispatch, job);
  return jobId;
}

async function runUpload(dispatch: AppDispatch, job: ReelUploadJob): Promise<void> {
  // Progress arrives far faster than either consumer can use: dispatching every event would
  // re-render the bar on every network chunk, and re-posting the notification that often
  // would be throttled by the OS anyway. Both are gated on a whole-percent change, and the
  // notification additionally on a 5% step.
  let lastDispatchedPercent = -1;
  let lastNotifiedPercent = -1;

  await postNotification(job.id, 'Uploading reel', 'Starting…');

  // Mutations dispatched via `initiate` (rather than a component hook) hold their cache
  // entry until reset() is called — nothing unmounts to do it for us here. Collected so the
  // finally block below releases them on every path, including cancellation.
  const pendingMutations: { reset: () => void }[] = [];

  try {
    const uploadUrlRequest = dispatch(
      eventsApi.endpoints.getUploadUrl.initiate({ purpose: 'reel-video', contentType: job.contentType }),
    );
    pendingMutations.push(uploadUrlRequest);

    // Overlapped deliberately: minting the signed URL is a backend round trip while reading
    // the clip is local I/O, and only putWithProgress below needs both. Reels are the
    // largest payload in the app, so this is where the serialised version cost the most.
    // The request is issued before the size checks below either way — it already was — so
    // the only change is that the file read no longer waits on the network.
    const [{ uploadUrl, publicUrl }, blob] = await Promise.all([
      uploadUrlRequest.unwrap(),
      fetch(job.mediaUri).then((r) => r.blob()),
    ]);
    // A zero-byte blob means the file:// URI did not resolve — uploading it would "succeed"
    // and produce a reel that plays nothing, which is worse than failing here.
    if (blob.size === 0) {
      throw new Error('The selected video could not be read from your device.');
    }
    // Checked before a single byte goes out. Storage would reject this anyway, but only
    // after the whole file had been transferred — an expensive way to find out on mobile
    // data, and the rejection gives no hint about how much smaller it needs to be.
    if (blob.size > MAX_REEL_BYTES) {
      throw new Error(
        `This video is ${formatMb(blob.size)}. Reels can be up to ${formatMb(MAX_REEL_BYTES)} — try a shorter clip.`,
      );
    }

    await putWithProgress(job.id, uploadUrl, blob, job.contentType, (fraction) => {
      const percent = Math.floor(fraction * 100);
      if (percent === lastDispatchedPercent) return;
      lastDispatchedPercent = percent;
      dispatch(reelUploadProgress({ id: job.id, progress: fraction }));

      if (percent - lastNotifiedPercent >= 5) {
        lastNotifiedPercent = percent;
        void postNotification(job.id, 'Uploading reel', `${percent}% complete`);
      }
    });

    dispatch(reelUploadFinalizing({ id: job.id }));
    await postNotification(job.id, 'Uploading reel', 'Finishing up…');

    // Cancelled while the last chunk was landing — stop before the reel exists at all,
    // which is cheaper and cleaner than creating one and deleting it below.
    if (cancelRequested.has(job.id)) throw new UploadCancelledError();

    const createRequest = dispatch(
      shortsApi.endpoints.createShort.initiate({
        mediaUrl: publicUrl,
        caption: job.caption?.trim() || undefined,
        overlay: job.overlay,
        eventId: job.eventId,
        locationName: job.locationName,
        latitude: job.latitude,
        longitude: job.longitude,
      }),
    );
    pendingMutations.push(createRequest);
    const created = await createRequest.unwrap();

    // Cancelled while POST /shorts was in flight. The request could not be recalled, so the
    // reel briefly exists — undo it rather than leaving behind something the user explicitly
    // cancelled. Best-effort: if the delete fails the reel stays, which is recoverable from
    // My Shorts, whereas throwing here would report a failure that did not happen.
    if (cancelRequested.has(job.id)) {
      const deleteRequest = dispatch(shortsApi.endpoints.deleteMyShort.initiate(created.id));
      pendingMutations.push(deleteRequest);
      await deleteRequest.unwrap().catch(() => {});
      throw new UploadCancelledError();
    }

    dispatch(reelUploadSucceeded({ id: job.id }));
    await postNotification(job.id, 'Reel shared', job.eventTitle ? `Your reel from ${job.eventTitle} is live.` : 'Your reel is live.');
    scheduleCleanup(dispatch, job.id);
  } catch (err) {
    if (isCancellation(err)) {
      dispatch(reelUploadCancelled({ id: job.id }));
      await dismissNotification(job.id);
      // Cancelled rows disappear on their own — the user already knows, having asked for it.
      dispatch(reelUploadDismissed({ id: job.id }));
      return;
    }
    const message = describeUploadError(err);
    dispatch(reelUploadFailed({ id: job.id, error: message }));
    await postNotification(job.id, "Reel didn't upload", message);
    scheduleCleanup(dispatch, job.id);
  } finally {
    pendingMutations.forEach((request) => request.reset());
    cancelRequested.delete(job.id);
    inFlight.delete(job.id);
  }
}

/**
 * Cancels an upload, at whichever stage it has reached.
 *
 * While bytes are transferring that means aborting the request. Once they have landed there
 * is nothing left to abort, so the intent is recorded and runUpload honours it — stopping
 * before the reel is created, or deleting it if the create had already gone out. Either way
 * the outcome matches what the button says: no reel.
 */
export function cancelReelUpload(dispatch: AppDispatch, jobId: string): void {
  // Recorded first, so a cancel landing in the gap between the transfer completing and the
  // create being issued is still seen by runUpload's checks.
  cancelRequested.add(jobId);

  const xhr = inFlight.get(jobId);
  if (xhr) {
    // Resolves through xhr.onabort above, which is what dispatches the cancelled/dismissed
    // pair — doing it here as well would race that handler.
    xhr.abort();
    return;
  }
  dispatch(reelUploadCancelled({ id: jobId }));
  dispatch(reelUploadDismissed({ id: jobId }));
  void dismissNotification(jobId);
}

/** Clears a finished row (success or error) from the progress area. */
export function dismissReelUpload(dispatch: AppDispatch, jobId: string): void {
  dispatch(reelUploadDismissed({ id: jobId }));
  void dismissNotification(jobId);
}
