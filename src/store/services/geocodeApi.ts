import { createApi } from '@reduxjs/toolkit/query/react';
import { createFallbackBaseQuery } from './baseQuery';
import { CACHE_STATIC } from './cachePolicy';

export interface ReverseGeocodeResult {
  address: string | null;
}

// Backend-proxied so the Google Geocoding API key stays server-side only — see
// Backend/src/geocode/geocode.service.ts.
export const geocodeApi = createApi({
  reducerPath: 'geocodeApi',
  baseQuery: createFallbackBaseQuery(true),
  // A coordinate's address does not change. Holding results for the session turns the
  // repeated lookups one user generates (every foreground, every map pan back to the same
  // place) into a single billable Google Geocoding call instead of one per request.
  keepUnusedDataFor: CACHE_STATIC,
  refetchOnFocus: false,
  endpoints: (builder) => ({
    reverseGeocode: builder.query<ReverseGeocodeResult, { lat: number; lng: number }>({
      query: ({ lat, lng }) => `geocode/reverse?lat=${lat}&lng=${lng}`,
    }),
  }),
});

export const { useLazyReverseGeocodeQuery } = geocodeApi;
