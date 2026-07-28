// Converted from the previous static app.json (content preserved as-is) so the native
// Google Maps SDK key can be injected from an env var at config-evaluation time instead of
// being hardcoded/committed. Expo's CLI loads .env/.env.local into process.env before this
// file runs, the same way it already does for the EXPO_PUBLIC_* vars baseQuery.ts reads.
// Native social sign-in config. Both SDKs are native modules configured at build time, so
// these values have to be resolvable when this file is evaluated (not at runtime) — hence
// reading them here rather than inside the app.
//
// The Facebook scheme is fixed by the SDK: literally 'fb' + the app ID. It is what the
// Facebook app / Custom Tab redirects back to, and the plugin writes it into the native
// manifest for us.
const FACEBOOK_APP_ID = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID ?? '';
const FACEBOOK_CLIENT_TOKEN = process.env.EXPO_PUBLIC_FACEBOOK_CLIENT_TOKEN ?? '';
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
      // Native Facebook login — uses the installed Facebook app when present, otherwise a
      // Custom Tab. Either way the SDK owns the round trip, so there is no redirect_uri to
      // whitelist under "Valid OAuth Redirect URIs" (Facebook rejects custom schemes there,
      // which is what made the browser-based flow unworkable once Expo retired its proxy).
      [
        'react-native-fbsdk-next',
        {
          appID: FACEBOOK_APP_ID,
          clientToken: FACEBOOK_CLIENT_TOKEN,
          displayName: 'Eventrix',
          scheme: FACEBOOK_APP_ID ? `fb${FACEBOOK_APP_ID}` : undefined,
          isAutoInitEnabled: true,
          advertiserIDCollectionEnabled: false,
          autoLogAppEventsEnabled: false,
        },
      ],
    ],
    extra: {
      eas: {
        projectId: 'bd75abcd-7153-41dc-987a-7e0bdd9240c6',
      },
    },
    owner: 'aarish34',
  },
};
