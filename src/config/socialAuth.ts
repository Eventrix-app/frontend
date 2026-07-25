// Shared OAuth client config — used by SocialLoginRow (sign in/register) and
// DeleteMyDataModal (re-authentication proof before a social-only account can erase its
// data), so both go through the exact same provider/scope/discovery setup.
export const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS ?? '';
export const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID ?? '';
export const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB ?? '';
export const FACEBOOK_APP_ID = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID ?? '';
export const APPLE_CLIENT_ID = process.env.EXPO_PUBLIC_APPLE_CLIENT_ID ?? '';
export const APPLE_REDIRECT_URI = process.env.EXPO_PUBLIC_APPLE_REDIRECT_URI ?? '';

// Raw discovery endpoints — avoids using the Facebook provider which unconditionally
// injects the `email` scope (requires App Review) causing "Invalid Scopes" in dev mode.
export const FACEBOOK_DISCOVERY = { authorizationEndpoint: 'https://www.facebook.com/v18.0/dialog/oauth' };
export const APPLE_DISCOVERY = { authorizationEndpoint: 'https://appleid.apple.com/auth/authorize' };
