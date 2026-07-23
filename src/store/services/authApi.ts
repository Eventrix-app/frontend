import { createApi } from '@reduxjs/toolkit/query/react';
import { createFallbackBaseQuery } from './baseQuery';

// Types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
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
  provider: 'google' | 'apple' | 'facebook';
  token: string; // id_token for Google/Apple, access_token for Facebook
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

export const authApi = createApi({
  reducerPath: 'authApi',
  // withAuth=true so POST /auth/refresh (the only endpoint here that requires a token) gets
  // its Authorization header; login/register/forgot/reset-password are all @Public() on the
  // backend and ignore it when there's no token yet (state.auth.token is null pre-login).
  baseQuery: createFallbackBaseQuery(true),
  tagTypes: ['Auth'],
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
    getCurrentUser: builder.query<User, void>({
      query: () => 'users/me',
      providesTags: ['Auth'],
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
  useGetCurrentUserQuery,
} = authApi;
