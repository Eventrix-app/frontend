// Shared social sign-in config — used by SocialLoginRow (sign in/register) and
// DeleteMyDataModal (re-authentication proof before a social-only account can erase its
// data), so both go through the exact same setup.
//
// Google and Facebook run through their native SDKs (@react-native-google-signin and
// react-native-fbsdk-next), which is what gives them the platform's own account picker /
// login sheet instead of a browser hand-off. It also removes the redirect_uri problem
// entirely: the browser flow had to hand control to an external app and hope the OS routed
// the callback back, whereas both SDKs own the whole round trip and return the token
// directly to the caller.
//
// Their build-time wiring lives in app.config.js — the Facebook App ID and client token, and
// Google's iOS URL scheme — so only the values the JS still reads at runtime are exported.
//
// GOOGLE_WEB_CLIENT_ID is the one Google value the JS needs: it is passed as the SDK's
// webClientId, which decides the `aud` claim on the returned idToken and therefore has to
// match one of the audiences the backend accepts (verifyGoogleToken in auth.service.ts).
// The Android client ID is not referenced — the native SDK resolves the calling app from its
// package name plus signing certificate, checked against the OAuth clients in the Cloud
// project that owns the web client.
export const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS ?? '';
export const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB ?? '';
export const FACEBOOK_APP_ID = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID ?? '';
export const APPLE_CLIENT_ID = process.env.EXPO_PUBLIC_APPLE_CLIENT_ID ?? '';
export const APPLE_REDIRECT_URI = process.env.EXPO_PUBLIC_APPLE_REDIRECT_URI ?? '';

// Apple is still browser-based (expo-auth-session) — it is iOS-only in practice and has no
// native module wired up here yet.
export const APPLE_DISCOVERY = { authorizationEndpoint: 'https://appleid.apple.com/auth/authorize' };
