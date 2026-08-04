import { fetchBaseQuery, BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../index';

// Exported so callers that need the raw backend origin outside RTK Query's baseQuery — e.g.
// PayUCheckoutModal building surl/furl for PayU's redirect — don't duplicate this fallback.
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api';

// Named/shaped as a BaseQueryFn (rather than exporting fetchBaseQuery(...) directly) so
// every API slice can keep calling createFallbackBaseQuery(withAuth) — only one backend
// host is actually configured today, so there's nothing to fail over between yet.
export function createFallbackBaseQuery(withAuth = false): BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> {
  return fetchBaseQuery({
    baseUrl: API_URL,
    prepareHeaders: withAuth
      ? (headers, { getState }) => {
          const token = (getState() as RootState).auth.token;
          if (token) headers.set('Authorization', `Bearer ${token}`);
          return headers;
        }
      : undefined,
  });
}
