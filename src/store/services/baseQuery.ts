import { fetchBaseQuery, BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../index';

const URLS = [
  process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api/',
];

const makeQuery = (baseUrl: string, withAuth = false) =>
  fetchBaseQuery({
    baseUrl,
    prepareHeaders: withAuth
      ? (headers, { getState }) => {
          const token = (getState() as RootState).auth.token;
          if (token) headers.set('Authorization', `Bearer ${token}`);
          return headers;
        }
      : undefined,
  });

export function createFallbackBaseQuery(withAuth = false): BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> {
  return async (args, api, extraOptions) => {
    for (let i = 0; i < URLS.length; i++) {
      const result = await makeQuery(URLS[i], withAuth)(args, api, extraOptions);
      if (!result.error || i === URLS.length - 1) return result;
    }
    return makeQuery(URLS[0], withAuth)(args, api, extraOptions);
  };
}
