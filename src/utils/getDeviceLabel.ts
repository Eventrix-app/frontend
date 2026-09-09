import * as Device from 'expo-device';

// Best-effort human-readable device label sent at login/register/social-login time so
// Settings → Active Sessions can show "iPhone 14 Pro · iOS 17.4" instead of a raw
// User-Agent string. Same Device.isDevice guard as registerForPushNotifications — on a
// simulator/emulator these fields are frequently null/generic, so falling back to
// Platform.OS keeps the label at least meaningful there too.
export function getDeviceLabel(): string {
  const name = Device.deviceName ?? Device.modelName ?? 'Unknown device';
  const os = Device.osName ?? '';
  const osVersion = Device.osVersion ?? '';
  return [name, [os, osVersion].filter(Boolean).join(' ')].filter(Boolean).join(' · ');
}
