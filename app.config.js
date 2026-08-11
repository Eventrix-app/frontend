// Converted from the previous static app.json (content preserved as-is) so the native
// Google Maps SDK key can be injected from an env var at config-evaluation time instead of
// being hardcoded/committed. Expo's CLI loads .env/.env.local into process.env before this
// file runs, the same way it already does for the EXPO_PUBLIC_* vars baseQuery.ts reads.
// Native Google sign-in config — a native module configured at build time, so this value
// has to be resolvable when this file is evaluated (not at runtime) — hence reading it here
// rather than inside the app.
//
// Google's iOS SDK needs the reversed iOS client ID registered as a URL scheme.
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS ?? '';
const GOOGLE_IOS_URL_SCHEME = GOOGLE_IOS_CLIENT_ID
  ? `com.googleusercontent.apps.${GOOGLE_IOS_CLIENT_ID.replace('.apps.googleusercontent.com', '')}`
  : undefined;

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
    icon: './assets/app/logo.jpg',
    userInterfaceStyle: 'light',
    newArchEnabled: true,
    splash: {
      image: './assets/app/logo.jpg',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.eventrix.app',
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSLocationWhenInUseUsageDescription:
          'Eventrix uses your location to show how far away events are and to let you filter events near you.',
      },
    },
    android: {
      package: 'com.eventrix.app',
      // Locally this file just sits at the repo root (gitignored). EAS Build clones from
      // git and never sees gitignored files, so on EAS it's injected as a file environment
      // variable instead — GOOGLE_SERVICES_JSON then holds the path to that injected copy.
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
      adaptiveIcon: {
        foregroundImage: './assets/app/adaptive-icon-foreground.png',
        backgroundColor: '#FF3366',
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      permissions: [
        'android.permission.CAMERA',
        'android.permission.RECORD_AUDIO',
        'android.permission.READ_CALENDAR',
        'android.permission.WRITE_CALENDAR',
        'android.permission.ACCESS_COARSE_LOCATION',
        'android.permission.ACCESS_FINE_LOCATION',
      ],
      // Register the app's package-name URI scheme so Android redirects back here after
      // Google OAuth completes. expo-auth-session/providers/google generates the redirect
      // URI as `${Application.applicationId}:/oauthredirect` (= com.eventrix.app:/oauthredirect)
      // rather than the Google reverse-client-ID scheme, so this is what needs intercepting.
      intentFilters: [
        {
          action: 'VIEW',
          autoVerify: false,
          data: [
            {
              scheme: 'com.eventrix.app',
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
      favicon: './assets/app/favicon.jpg',
    },
    plugins: [
      // PayU's Android SDK pulls in `in.payu:phonepe-intent`, which depends on
      // `phonepe.intentsdk.android.release:IntentSDK` — an artifact PhonePe publishes ONLY to
      // their own Maven server, not to Google's repo or Maven Central. Without this the
      // Android build fails at :app:processDebugResources with "Could not find
      // phonepe.intentsdk.android.release:IntentSDK", and the error names the missing
      // artifact rather than the missing repository, which sends you looking for a version
      // problem that isn't there.
      //
      // Declared as a config plugin rather than edited into android/build.gradle because
      // android/ is generated (gitignored, CNG workflow): a hand-edit there survives until
      // the next prebuild and never reaches EAS Build at all, so the cloud AAB build would
      // keep failing exactly the same way while the local one looked fixed.
      [
        'expo-build-properties',
        {
          android: {
            extraMavenRepos: [
              'https://phonepe.mycloudrepo.io/public/repositories/phonepe-intentsdk-android',
            ],
          },
        },
      ],
      // Lets the app's own android:theme win over the one PayU's checkout UI declares on
      // <application>; without it the manifest merger fails the Android build outright.
      './plugins/withPayuManifestTheme',
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
        'expo-location',
        {
          locationWhenInUsePermission:
            'Allow Eventrix to use your location to show how far away events are.',
        },
      ],
      [
        'expo-notifications',
        {
          icon: './assets/app/logo.jpg',
          color: '#F43362',
        },
      ],
      'expo-video',
      'expo-secure-store',
      // Native Google sign-in — shows Android's own "Choose an account" system sheet
      // instead of handing off to a browser.
      //
      // Included only when an iOS client ID exists, because registering the reversed iOS
      // client ID as a URL scheme is the *only* thing this plugin does (it is a single
      // withInfoPlist call). Android needs nothing from it — the native module is picked up
      // by autolinking — and the plugin hard-errors on a missing `iosUrlScheme` rather than
      // treating it as optional, so listing it unconditionally breaks `expo start` for an
      // Android-only setup. Creating an iOS-type OAuth client and setting
      // EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS is all that's needed to switch it back on.
      ...(GOOGLE_IOS_URL_SCHEME
        ? [['@react-native-google-signin/google-signin', { iosUrlScheme: GOOGLE_IOS_URL_SCHEME }]]
        : []),
    ],
    extra: {
      eas: {
        projectId: 'bd75abcd-7153-41dc-987a-7e0bdd9240c6',
      },
    },
    owner: 'aarish34',
  },
};
