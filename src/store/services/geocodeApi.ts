import { createApi } from '@reduxjs/toolkit/query/react';
import { createFallbackBaseQuery } from './baseQuery';

export interface ReverseGeocodeResult {
  address: string | null;
}

// Backend-proxied so the Google Geocoding API key stays server-side only — see
// Backend/src/geocode/geocode.service.ts.
export const geocodeApi = createApi({
  reducerPath: 'geocodeApi',
  baseQuery: createFallbackBaseQuery(true),
  endpoints: (builder) => ({
    reverseGeocode: builder.query<ReverseGeocodeResult, { lat: number; lng: number }>({
      query: ({ lat, lng }) => `geocode/reverse?lat=${lat}&lng=${lng}`,
    }),
  }),
});

export const { useLazyReverseGeocodeQuery } = geocodeApi;
