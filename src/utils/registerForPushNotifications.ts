import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { AppDispatch } from '../store';
import { userApi } from '../store/services/userApi';

/**
 * Requests notification permission (if not already granted/denied) and, once granted,
 * registers this device's Expo push token with the backend. Fire-and-forget, same shape
 * as syncOnboardingDraft — called from the login/register success handlers and once on
 * app launch for an already-authenticated session (see App.tsx's AppStateSync).
 *
 * No-ops on simulators/emulators (Device.isDevice is false there — Expo's push service
 * can't deliver to them) and when permission is denied, rather than throwing.
 */
export async function registerForPushNotifications(dispatch: AppDispatch): Promise<void> {
  if (!Device.isDevice) {
    console.log('[registerForPushNotifications] Skipped — not a physical device');
    return;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log(`[registerForPushNotifications] Skipped — permission "${finalStatus}"`);
      return;
    }

    // Constants.expoConfig can be unpopulated in some EAS build/runtime combinations —
    // Constants.easConfig?.projectId is the documented fallback for that case.
    const projectId =
      (Constants.expoConfig?.extra?.eas?.projectId as string | undefined) ??
      Constants.easConfig?.projectId;
    if (!projectId) {
      console.warn('[registerForPushNotifications] No EAS projectId resolved — cannot fetch a push token');
      return;
    }

    const { data: pushToken } = await Notifications.getExpoPushTokenAsync({ projectId });
    console.log(`[registerForPushNotifications] Got token ${pushToken.slice(0, 24)}… — registering with backend`);

    await dispatch(userApi.endpoints.updatePushToken.initiate(pushToken)).unwrap();
    console.log('[registerForPushNotifications] Push token registered successfully');
  } catch (err) {
    console.warn('[registerForPushNotifications] Failed to register push token', err);
  }
}
