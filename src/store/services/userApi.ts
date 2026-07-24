import { createApi } from '@reduxjs/toolkit/query/react';
import { createFallbackBaseQuery } from './baseQuery';

export interface Category {
  id: string;
  name: string;
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
// Master per-transport switches (SettingsScreen's toggles) — distinct from the
// onboarding-category UpdateNotificationPrefsBody above.
interface UpdateNotificationChannelsBody {
  pushEnabled?: boolean;
  emailEnabled?: boolean;
}

export interface CurrentUser {
  id: string;
  email: string;
  fullName: string | null;
  firstName: string;
  lastName: string;
  phoneNumber: string | null;
  profilePictureUrl: string | null;
  isEmailVerified: boolean;
  location: string | null;
  city: string;
  latitude: number | null;
  longitude: number | null;
  pushEnabled: boolean;
  emailEnabled: boolean;
  roles: string[];
  // Count of organizers this user follows — the reverse of Organizer.followerCount.
  followingCount: number;
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
    updateNotificationChannels: builder.mutation<void, UpdateNotificationChannelsBody>({
      query: (body) => ({ url: 'users/me/notification-channels', method: 'PATCH', body }),
      invalidatesTags: ['Me'],
    }),
    // Called once, from the last screen of the post-login onboarding chain
    // (NotificationPreferencesScreen) — flips the account-level flag so future logins go
    // straight to Main instead of replaying Onboarding/InterestSelection/etc.
    completeOnboarding: builder.mutation<void, void>({
      query: () => ({ url: 'users/me/complete-onboarding', method: 'PATCH' }),
    }),
    updateParticipant: builder.mutation<void, { id: string; body: UpdateParticipantBody }>({
      query: ({ id, body }) => ({ url: `participants/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['Me'],
    }),
    // Re-registered on every login/app start (see utils/registerForPushNotifications.ts) —
    // upserts a device_tokens row server-side; multiple devices can each hold their own.
    updatePushToken: builder.mutation<void, string>({
      query: (pushToken) => ({ url: 'users/me/push-token', method: 'PATCH', body: { pushToken } }),
    }),
    // Called on logout — clears only *this* device's registration (push tokens are
    // multi-device now), not every device this account is signed in on. See
    // utils/getExpoPushToken.ts for how the caller obtains its own current token, and
    // Backend's UsersService.clearPushToken for the server side.
    clearPushToken: builder.mutation<void, string>({
      query: (pushToken) => ({ url: 'users/me/push-token', method: 'DELETE', body: { pushToken } }),
    }),
    // Self-service account deletion (Settings → Delete Account). Soft-deletes the account
    // server-side — see Backend's UsersService.deleteMe. The caller is responsible for
    // dispatching logout() afterwards; this mutation only performs the deletion itself.
    deleteAccount: builder.mutation<void, void>({
      query: () => ({ url: 'users/me', method: 'DELETE' }),
    }),
    // Self-service data export (Settings → Download My Data) — the backend emails a JSON
    // copy to the account's own registered address rather than returning it here. See
    // Backend's UsersService.exportMyData for exactly what's included.
    exportMyData: builder.mutation<void, void>({
      query: () => ({ url: 'users/me/export', method: 'POST' }),
    }),
  }),
});

export const {
  useGetCategoriesQuery,
  useGetMeQuery,
  useUpdateInterestsMutation,
  useUpdateLocationMutation,
  useUpdateNotificationPreferencesMutation,
  useUpdateNotificationChannelsMutation,
  useUpdateParticipantMutation,
  useUpdatePushTokenMutation,
  useClearPushTokenMutation,
  useCompleteOnboardingMutation,
  useDeleteAccountMutation,
  useExportMyDataMutation,
} = userApi;
