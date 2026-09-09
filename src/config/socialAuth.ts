// Shared social sign-in config — used by SocialLoginRow (sign in/register) and
// DeleteMyDataModal (re-authentication proof before a social-only account can erase its
// data), so both go through the exact same setup.
//
// Google runs through its native SDK (@react-native-google-signin), which is what gives it
// the platform's own account picker instead of a browser hand-off — no redirect_uri to
// route back to the app, since the SDK owns the whole round trip and returns the token
// directly to the caller.
//
// GOOGLE_WEB_CLIENT_ID is the one Google value the JS needs: it is passed as the SDK's
// webClientId, which decides the `aud` claim on the returned idToken and therefore has to
// match one of the audiences the backend accepts (verifyGoogleToken in auth.service.ts).
// The Android client ID is not referenced — the native SDK resolves the calling app from its
// package name plus signing certificate, checked against the OAuth clients in the Cloud
// project that owns the web client.
export const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS ?? '';
export const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB ?? '';
