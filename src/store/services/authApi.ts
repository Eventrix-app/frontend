import { createApi } from '@reduxjs/toolkit/query/react';
import { createFallbackBaseQuery } from './baseQuery';

// Types
export interface LoginCredentials {
  email: string;
  password: string;
  deviceLabel?: string; // e.g. "iPhone 14 Pro · iOS 17.4" — shown in Settings → Active Sessions
}

export interface RegisterCredentials {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  // Required: CreateUserDto rejects a signup without one, and the server normalises it to
  // the 10 digits PayU needs so checkout never has to stop and ask.
  phoneNumber: string;
  dateOfBirth: string; // 'YYYY-MM-DD' — backend enforces a minimum age of 18
  deviceLabel?: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatarUrl?: string;
  preferences?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface SocialLoginCredentials {
  provider: 'google';
  token: string; // id_token
  deviceLabel?: string;
}

export interface AuthResponse {
  accessToken: string;
  id: string;
  email: string;
  full_name: string;
  roles: string[];
  hasCompletedOnboarding: boolean;
  expiresIn?: number;
}

export interface SessionRecord {
  id: string;
  deviceLabel: string | null;
  userAgent: string | null;
  createdAt: string;
  lastSeenAt: string;
  isCurrent: boolean;
}

export const authApi = createApi({
  reducerPath: 'authApi',
  // withAuth=true so POST /auth/refresh (the only endpoint here that requires a token) gets
  // its Authorization header; login/register/forgot/reset-password are all @Public() on the
  // backend and ignore it when there's no token yet (state.auth.token is null pre-login).
  baseQuery: createFallbackBaseQuery(true),
  tagTypes: ['Auth', 'Sessions'],
  endpoints: (builder) => ({
    login: builder.mutation<AuthResponse, LoginCredentials>({
      query: (credentials) => ({
        url: 'auth/login',
        method: 'POST',
        body: credentials,
      }),
    }),
    register: builder.mutation<AuthResponse, RegisterCredentials>({
      query: (credentials) => ({
        url: 'auth/register',
        method: 'POST',
        body: credentials,
      }),
    }),
    // Re-issues a token with a fresh 2-day expiry — called on app foreground/launch (see
    // AppStateSync in App.tsx) to keep an actively-used session from expiring. If the
    // previous token had already expired (2+ days of not opening the app), this 401s and
    // authErrorMiddleware turns that into an automatic logout.
    refresh: builder.mutation<AuthResponse, void>({
      query: () => ({
        url: 'auth/refresh',
        method: 'POST',
      }),
    }),
    logout: builder.mutation<void, void>({
      query: () => ({
        url: 'auth/logout',
        method: 'POST',
      }),
    }),
    forgotPassword: builder.mutation<void, { email: string }>({
      query: ({ email }) => ({
        url: 'auth/forgot-password',
        method: 'POST',
        body: { email },
      }),
    }),
    resetPassword: builder.mutation<void, { token: string; password: string }>({
      query: ({ token, password }) => ({
        url: 'auth/reset-password',
        method: 'POST',
        body: { token, password },
      }),
    }),
    socialLogin: builder.mutation<AuthResponse, SocialLoginCredentials>({
      query: (body) => ({
        url: 'auth/social',
        method: 'POST',
        body,
      }),
    }),
    // Both deliberately not passed an email — always acts on the logged-in caller's own
    // account (see auth.controller.ts), so withAuth's Bearer header is what identifies them.
    sendEmailVerificationOtp: builder.mutation<void, void>({
      query: () => ({
        url: 'auth/verify-email/send',
        method: 'POST',
      }),
    }),
    confirmEmailVerification: builder.mutation<void, { otp: string }>({
      query: (body) => ({
        url: 'auth/verify-email/confirm',
        method: 'POST',
        body,
      }),
    }),
    getCurrentUser: builder.query<User, void>({
      query: () => 'users/me',
      providesTags: ['Auth'],
    }),
    // Settings → Active Sessions.
    listSessions: builder.query<SessionRecord[], void>({
      query: () => 'auth/sessions',
      providesTags: ['Sessions'],
    }),
    revokeSession: builder.mutation<void, string>({
      query: (id) => ({ url: `auth/sessions/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Sessions'],
    }),
    revokeOtherSessions: builder.mutation<{ revoked: number }, void>({
      query: () => ({ url: 'auth/sessions/others', method: 'DELETE' }),
      invalidatesTags: ['Sessions'],
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useRefreshMutation,
  useLogoutMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useSocialLoginMutation,
  useSendEmailVerificationOtpMutation,
  useConfirmEmailVerificationMutation,
  useGetCurrentUserQuery,
  useListSessionsQuery,
  useRevokeSessionMutation,
  useRevokeOtherSessionsMutation,
} = authApi;
