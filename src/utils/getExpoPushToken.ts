import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

// Read-only counterpart to registerForPushNotifications.ts — that one requests permission
// and registers the token with the backend; this one only reads back whatever token is
// already available (never prompts), for the logout flow, which needs to know its own
// token to clear the matching device_tokens row now that push tokens are multi-device
// (see Backend's UsersService.clearPushToken). Returns null rather than throwing on any
// failure (simulator, permission never granted, no projectId) — logout must never be
// blocked by push-token bookkeeping.
export async function getExpoPushTokenSafe(): Promise<string | null> {
  if (!Device.isDevice) return null;
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return null;

    const projectId =
      (Constants.expoConfig?.extra?.eas?.projectId as string | undefined) ??
      Constants.easConfig?.projectId;
    if (!projectId) return null;

    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    return data;
  } catch {
    return null;
  }
}
