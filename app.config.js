// Converted from the previous static app.json (content preserved as-is) so the native
// Google Maps SDK key can be injected from an env var at config-evaluation time instead of
// being hardcoded/committed. Expo's CLI loads .env/.env.local into process.env before this
// file runs, the same way it already does for the EXPO_PUBLIC_* vars baseQuery.ts reads.
module.exports = {
  expo: {
    name: 'Eventrix',
    slug: 'frontend',
    version: '1.0.0',
    orientation: 'portrait',
    sdkVersion: '54.0.0',
    icon: './assets/logo/logo.jpg',
    userInterfaceStyle: 'light',
    newArchEnabled: true,
    splash: {
      image: './assets/logo/logo.jpg',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.eventrix.app',
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      package: 'com.eventrix.app',
      googleServicesFile: './google-services.json',
      adaptiveIcon: {
        foregroundImage: './assets/logo/adaptive-icon-foreground.png',
        backgroundColor: '#FF3366',
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      permissions: [
        'android.permission.CAMERA',
        'android.permission.RECORD_AUDIO',
        'android.permission.READ_CALENDAR',
        'android.permission.WRITE_CALENDAR',
      ],
      // Native Maps SDK key for tile rendering (LocationPickerModal) — restrict this key
      // in Google Cloud Console to the app's package name + release/debug SHA-1
      // fingerprints, and to the Maps SDK for Android only. Distinct from the server-side
      // GOOGLE_MAPS_API_KEY in Backend/.env, which powers reverse geocoding instead (see
      // Backend/src/geocode/geocode.service.ts) and should never be embedded here.
      config: {
        googleMaps: {
          apiKey: process.env.GOOGLE_MAPS_API_KEY,
        },
      },
    },
    web: {
      favicon: './assets/favicon.jpg',
    },
    plugins: [
      '@react-native-community/datetimepicker',
      'expo-font',
      [
        'expo-camera',
        {
          cameraPermission: 'Allow Eventrix to use the camera to scan attendee ticket QR codes.',
        },
      ],
      [
        'expo-calendar',
        {
          calendarPermission: "Allow Eventrix to access your calendar to add events you're attending.",
        },
      ],
      [
        'expo-notifications',
        {
          icon: './assets/logo/logo.jpg',
          color: '#F43362',
        },
      ],
      'expo-video',
      'expo-secure-store',
    ],
    extra: {
      eas: {
        projectId: 'edfe8b87-7c19-4917-b0f0-ccca04f33197',
      },
    },
    owner: 'aarish45',
  },
};
