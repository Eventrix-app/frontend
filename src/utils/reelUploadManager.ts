import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { AppDispatch } from '../store';
import { eventsApi, UploadContentType } from '../store/services/eventsApi';
import { shortsApi } from '../store/services/shortsApi';
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
  locationName?: string;
  latitude?: number;
  longitude?: number;
}

// Low-importance, silent channel: a progress notification updates dozens of times per
// upload, and on the default channel each update would buzz and pop a heads-up banner.
// Android ignores importance changes to an existing channel, so this ID is versioned —
// bumping the suffix is the only way to change those settings after first install.
export const REEL_UPLOAD_CHANNEL_ID = 'reel-upload-progress-v1';

// Marks our own notifications so App.tsx's global handler can present them silently, and
// so RootNavigator's tap handler can ignore them (they aren't server notifications and
// have no Notifications-screen entry to open).
export const REEL_UPLOAD_NOTIFICATION_TYPE = 'reel-upload';

// A live XHR per job, keyed by job id. Module scope, not React state — the request has to
// outlive the screen that started it, which is the entire point of this module.
const inFlight = new Map<string, XMLHttpRequest>();

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

/**
 * PUTs the file to the signed storage URL, reporting progress.
 *
 * XMLHttpRequest rather than fetch because fetch exposes no upload progress at all — there
 * is no way to drive a percentage from it. XHR also gives a real cancel via abort(), which
 * fetch would need an AbortController for and which would still not report progress.
 *
 * The body is a Blob resolved from the local file:// URI. React Native backs that Blob with
 * a native file handle rather than a JS-side byte array, so a 60-second video does not get
 * copied into the JS heap.
 */
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
      onProgress(event.loaded / event.total);
    };

    xhr.onload = () => {
      inFlight.delete(jobId);
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }
      // Surfacing the status makes the two failure modes distinguishable at a glance:
      // 413 means the file exceeded the bucket's size limit, 400 a MIME mismatch.
      reject(new Error(`Storage rejected the upload (HTTP ${xhr.status}).`));
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

// extractErrorMessage only reads an RTK Query error's `data.message`, so the plain Errors
// thrown by putWithProgress (HTTP status, network failure, unreadable file) would all
// collapse to the same generic fallback — which is precisely the detail worth showing here,
// since it distinguishes "too large" from "no signal". Server errors still go through
// extractErrorMessage so a NestJS validation message reaches the user unchanged.
function describeUploadError(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  return extractErrorMessage(err, 'Please try again.');
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
    const { uploadUrl, publicUrl } = await uploadUrlRequest.unwrap();

    const response = await fetch(job.mediaUri);
    const blob = await response.blob();
    // A zero-byte blob means the file:// URI did not resolve — uploading it would "succeed"
    // and produce a reel that plays nothing, which is worse than failing here.
    if (blob.size === 0) {
      throw new Error('The selected video could not be read from your device.');
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

    const createRequest = dispatch(
      shortsApi.endpoints.createShort.initiate({
        mediaUrl: publicUrl,
        caption: job.caption?.trim() || undefined,
        eventId: job.eventId,
        locationName: job.locationName,
        latitude: job.latitude,
        longitude: job.longitude,
      }),
    );
    pendingMutations.push(createRequest);
    await createRequest.unwrap();

    dispatch(reelUploadSucceeded({ id: job.id }));
    await postNotification(job.id, 'Reel shared', job.eventTitle ? `Your reel from ${job.eventTitle} is live.` : 'Your reel is live.');
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
  } finally {
    pendingMutations.forEach((request) => request.reset());
  }
}

/**
 * Aborts an in-flight upload. Safe to call for a job that has already finished or was never
 * started — the row is dismissed either way, so the X button behaves the same whichever
 * side of the finish line the upload happens to be on when it is tapped.
 */
export function cancelReelUpload(dispatch: AppDispatch, jobId: string): void {
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
