// Converted from the previous static app.json (content preserved as-is) so the native
// Google Maps SDK key can be injected from an env var at config-evaluation time instead of
// being hardcoded/committed. Expo's CLI loads .env/.env.local into process.env before this
// file runs, the same way it already does for the EXPO_PUBLIC_* vars baseQuery.ts reads.
module.exports = {
  expo: {
    name: 'Eventrix',
    slug: 'frontend',
    version: '1.0.0',
    // Custom URL scheme for deep links (eventrix://event/<id>, etc.) — see
    // navigation/linking.ts. This works immediately with no extra hosting/console setup;
    // upgrading to universal/app links (https://yourdomain.com/... that also falls back to
    // a web page when the app isn't installed) additionally requires: a production domain,
    // hosting .well-known/apple-app-site-association + assetlinks.json there, and adding
    // `ios.associatedDomains` / `android.intentFilters` here — none of that is set up yet.
    scheme: 'eventrix',
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
      // Locally this file just sits at the repo root (gitignored). EAS Build clones from
      // git and never sees gitignored files, so on EAS it's injected as a file environment
      // variable instead — GOOGLE_SERVICES_JSON then holds the path to that injected copy.
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
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
      // Register the Google reverse-client-ID URL scheme so Android knows to redirect
      // back into this app after the Google OAuth browser flow completes.
      // The scheme is the dot-reversed form of the Android OAuth client ID — without this,
      // the OS cannot intercept the redirect and the auth flow silently fails.
      intentFilters: [
        {
          action: 'VIEW',
          autoVerify: false,
          data: [
            {
              scheme: 'com.googleusercontent.apps.990228259919-ifq4na1hke80aarq6l6b4iv38bp768dl',
            },
          ],
          category: ['BROWSABLE', 'DEFAULT'],
        },
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
      'expo-splash-screen',
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
      'expo-web-browser',
      '@sentry/react-native/expo',
    ],
    extra: {
      eas: {
        projectId: 'bd75abcd-7153-41dc-987a-7e0bdd9240c6',
      },
    },
    owner: 'aarish34',
  },
};
