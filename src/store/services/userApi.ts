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

export interface CurrentUser {
  id: string;
  email: string;
  fullName: string | null;
  firstName: string;
  lastName: string;
  phoneNumber: string | null;
  profilePictureUrl: string | null;
  location: string | null;
  city: string;
  latitude: number | null;
  longitude: number | null;
  roles: string[];
  createdAt: string;
}

// Fields participants can self-edit — mirrors the backend's UpdateParticipantDto.
// PATCH /participants/:id is self-accessible (ownership-checked) even though
// GET /participants/:id is admin-only; GET /users/me is the read counterpart.
export interface UpdateParticipantBody {
  firstName?: string;
  lastName?: string;
  phone?: string;
  city?: string;
  profileImageUrl?: string;
}

export const userApi = createApi({
  reducerPath: 'userApi',
  baseQuery: createFallbackBaseQuery(true),
  tagTypes: ['Categories', 'Me'],
  endpoints: (builder) => ({
    getCategories: builder.query<Category[], void>({
      query: () => 'categories',
      providesTags: ['Categories'],
    }),
    getMe: builder.query<CurrentUser, void>({
      query: () => 'users/me',
      providesTags: ['Me'],
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
    updateParticipant: builder.mutation<void, { id: string; body: UpdateParticipantBody }>({
      query: ({ id, body }) => ({ url: `participants/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['Me'],
    }),
  }),
});

export const {
  useGetCategoriesQuery,
  useGetMeQuery,
  useUpdateInterestsMutation,
  useUpdateLocationMutation,
  useUpdateNotificationPreferencesMutation,
  useUpdateParticipantMutation,
} = userApi;
