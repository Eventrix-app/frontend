import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { GOOGLE_IOS_CLIENT_ID, GOOGLE_WEB_CLIENT_ID } from '../config/socialAuth';

// Read-only access to the signed-in account's Drive. This is one of Google's *restricted*
// scopes: it works immediately for accounts listed as test users on the Cloud project, and
// needs the app to pass Google's verification before it can be granted to the public. The
// picker is only ever offered to accounts that signed in with Google (see
// useProfilePictureUpload), so nobody else is asked for a consent they cannot complete.
export const DRIVE_READONLY_SCOPE = 'https://www.googleapis.com/auth/drive.readonly';

const DRIVE_FILES_ENDPOINT = 'https://www.googleapis.com/drive/v3/files';

export interface DriveImage {
  id: string;
  name: string;
  mimeType: string;
  /**
   * Short-lived CDN URL Google returns alongside the metadata. It carries its own token, so
   * it renders in a plain <Image> without an Authorization header — which is the only reason
   * the grid can be built from the list response rather than downloading every file first.
   */
  thumbnailLink?: string;
}

export interface DriveImagePage {
  files: DriveImage[];
  nextPageToken?: string;
}

/**
 * An access token carrying the Drive scope.
 *
 * The login flow (SocialLoginRow) deliberately asks for nothing but identity, so the scope
 * is requested here, at the point the user actually opts into browsing their Drive, rather
 * than being bundled into sign-in where it would look like an unexplained demand.
 *
 * signInSilently() first: the native SDK holds the session from the original sign-in, but
 * this app may have been restarted since, and getTokens() throws if the SDK has no current
 * user. Silent sign-in restores it without showing any UI.
 */
async function getDriveAccessToken(): Promise<string> {
  GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID || undefined,
    offlineAccess: false,
    scopes: [DRIVE_READONLY_SCOPE],
  });

  if (!GoogleSignin.hasPreviousSignIn()) {
    throw new Error('Sign in with Google again to browse your Drive.');
  }
  await GoogleSignin.signInSilently();
  // No-op when the scope was already granted; otherwise this is the consent screen.
  await GoogleSignin.addScopes({ scopes: [DRIVE_READONLY_SCOPE] });

  const { accessToken } = await GoogleSignin.getTokens();
  if (!accessToken) throw new Error('Google did not return an access token.');
  return accessToken;
}

async function driveFetch(url: string, accessToken: string): Promise<Response> {
  const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (response.ok) return response;

  // 403 on this API is almost always the scope, not the file — surfacing Google's raw
  // "insufficient permissions" body would tell the user nothing actionable.
  if (response.status === 401 || response.status === 403) {
    throw new Error('Eventrix does not have permission to read your Google Drive.');
  }
  throw new Error(`Google Drive request failed (${response.status}).`);
}

/**
 * One page of the account's Drive images, newest first.
 *
 * trashed=false keeps deleted files out; the mimeType filter keeps the grid to things that
 * can actually be a profile photo. Fields are projected explicitly so the response stays
 * small — the default returns far more metadata per file than a thumbnail grid needs.
 */
export async function listDriveImages(pageToken?: string): Promise<DriveImagePage> {
  const accessToken = await getDriveAccessToken();
  const params = new URLSearchParams({
    q: "mimeType contains 'image/' and trashed = false",
    fields: 'nextPageToken, files(id, name, mimeType, thumbnailLink)',
    orderBy: 'modifiedTime desc',
    pageSize: '60',
    // Files shared with the user live in a different corpus than their own; both are useful
    // sources for a profile picture.
    supportsAllDrives: 'true',
    includeItemsFromAllDrives: 'true',
  });
  if (pageToken) params.set('pageToken', pageToken);

  const response = await driveFetch(`${DRIVE_FILES_ENDPOINT}?${params.toString()}`, accessToken);
  const body = (await response.json()) as { files?: DriveImage[]; nextPageToken?: string };
  return { files: body.files ?? [], nextPageToken: body.nextPageToken };
}

/**
 * The chosen file's actual bytes.
 *
 * alt=media is what turns the metadata endpoint into a download. The bytes go straight into
 * the same signed-URL PUT the camera and photo-library paths use, so nothing downstream has
 * to know where the image came from.
 */
export async function fetchDriveImageBlob(fileId: string): Promise<Blob> {
  const accessToken = await getDriveAccessToken();
  const response = await driveFetch(
    `${DRIVE_FILES_ENDPOINT}/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`,
    accessToken,
  );
  return await response.blob();
}
