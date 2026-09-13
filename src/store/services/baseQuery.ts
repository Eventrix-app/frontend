import { fetchBaseQuery, BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../index';

// Exported so callers that need the raw backend origin outside RTK Query's baseQuery — e.g.
// PayUCheckoutModal building surl/furl for PayU's redirect — don't duplicate this fallback.
//
// Trailing slash trimmed here rather than at each call site: EXPO_PUBLIC_API_URL ends in one,
// so `${API_URL}/payments/payu/return` produced a doubled slash that the backend answers with
// a 308. PayU POSTs its result to that URL and does not follow the redirect, so checkout hung
// waiting for a return that never landed. RTK Query normalises its own joins either way.
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api').replace(/\/+$/, '');

// Named/shaped as a BaseQueryFn (rather than exporting fetchBaseQuery(...) directly) so
// every API slice can keep calling createFallbackBaseQuery(withAuth) — only one backend
// host is actually configured today, so there's nothing to fail over between yet.
export function createFallbackBaseQuery(withAuth = false): BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> {
  return fetchBaseQuery({
    baseUrl: API_URL,
    // Without this, a request that is accepted but never answered (a silently dropped
    // mobile connection, a hung upstream) has no client-side deadline at all. The worst
    // case is payment-adjacent: initiatePayUNativeOrder hanging leaves the Pay button
    // spinning with no error and no recovery short of backgrounding the app. 30s is well
    // clear of a slow-but-real request while still failing in human time.
    timeout: 30000,
    prepareHeaders: withAuth
      ? (headers, { getState }) => {
          const token = (getState() as RootState).auth.token;
          if (token) headers.set('Authorization', `Bearer ${token}`);
          return headers;
        }
      : undefined,
  });
}
