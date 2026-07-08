import { createApi } from '@reduxjs/toolkit/query/react';
import { createFallbackBaseQuery } from './baseQuery';

export interface Category {
  id: string;
  name: string;
  emoji?: string;
  colorHex?: string;
  description?: string;
}

interface UpdateInterestsBody { categoryIds: string[] }
interface UpdateLocationBody { latitude: number; longitude: number }
interface UpdateNotificationPrefsBody {
  eventReminders: boolean;
  nearbyEvents: boolean;
  reelsAndCommunity: boolean;
  specialOffers: boolean;
}

export const userApi = createApi({
  reducerPath: 'userApi',
  baseQuery: createFallbackBaseQuery(true),
  tagTypes: ['Categories'],
  endpoints: (builder) => ({
    getCategories: builder.query<Category[], void>({
      query: () => 'categories',
      providesTags: ['Categories'],
    }),
    updateInterests: builder.mutation<void, UpdateInterestsBody>({
      query: (body) => ({ url: 'users/me/interests', method: 'PUT', body }),
    }),
    updateLocation: builder.mutation<void, UpdateLocationBody>({
      query: (body) => ({ url: 'users/me/location', method: 'PATCH', body }),
    }),
    updateNotificationPreferences: builder.mutation<void, UpdateNotificationPrefsBody>({
      query: (body) => ({ url: 'users/me/notification-preferences', method: 'PATCH', body }),
    }),
  }),
});

export const {
  useGetCategoriesQuery,
  useUpdateInterestsMutation,
  useUpdateLocationMutation,
  useUpdateNotificationPreferencesMutation,
} = userApi;
