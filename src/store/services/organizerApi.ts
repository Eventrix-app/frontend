import { createApi } from '@reduxjs/toolkit/query/react';
import { createFallbackBaseQuery } from './baseQuery';
import type { BackendEvent } from './eventsApi';
import { userApi } from './userApi';

export interface OrganizerPublicProfile {
  id: string;
  companyName: string;
  companyDescription?: string;
  companyWebsite?: string;
  companyLogoUrl?: string;
  verified: boolean;
  memberSince: string;
  eventCount: number;
  followerCount: number;
  isFollowing?: boolean;
}

// Mirrors VerificationStatusRecord in organizer.service.ts.
export interface VerificationStatus {
  status: 'not_submitted' | 'pending' | 'approved' | 'rejected';
  verificationLevel: 'unverified' | 'email_verified' | 'phone_verified' | 'document_verified';
  submittedForReviewAt?: string;
  rejectionReason?: string;
}

// identityProofUrl/addressProofUrl/panOrAadhaarUrl are storage paths returned by
// POST /uploads/signed-url (purpose: identity-proof / address-proof / pan-or-aadhaar),
// not public URLs — the private KYC bucket has no public read access. See uploads.service.ts.
export interface SubmitVerificationPayload {
  fullName: string;
  companyName: string;
  identityProofUrl: string;
  addressProofUrl: string;
  panOrAadhaarUrl: string;
  upiId: string;
}

export const organizerApi = createApi({
  reducerPath: 'organizerApi',
  baseQuery: createFallbackBaseQuery(true),
  tagTypes: ['OrganizerProfile', 'MyFollowing', 'FollowedEvents', 'OrganizerEvents', 'MyVerificationStatus'],
  endpoints: (builder) => ({
    getMyVerificationStatus: builder.query<VerificationStatus, void>({
      query: () => 'organizers/verification/me',
      providesTags: ['MyVerificationStatus'],
    }),
    submitVerification: builder.mutation<VerificationStatus, SubmitVerificationPayload>({
      query: (body) => ({ url: 'organizers/verification', method: 'POST', body }),
      invalidatesTags: ['MyVerificationStatus'],
    }),
    getOrganizerProfile: builder.query<OrganizerPublicProfile, string>({
      query: (organizerId) => `organizers/${organizerId}/profile`,
      providesTags: (_result, _error, organizerId) => [{ type: 'OrganizerProfile', id: organizerId }],
    }),
    getMyFollowedOrganizers: builder.query<OrganizerPublicProfile[], void>({
      query: () => 'organizers/my-following',
      providesTags: ['MyFollowing'],
    }),
    // Events from every organizer the caller follows — powers ExploreScreen's "Following"
    // filter. NOT what an organizer's own profile page should show (that's
    // getOrganizerEvents below): this list is empty for anyone the viewer doesn't yet follow.
    getFollowedEvents: builder.query<BackendEvent[], { page?: number; limit?: number } | void>({
      query: (params) => ({ url: 'events/from-following', params: params ?? undefined }),
      providesTags: ['FollowedEvents'],
    }),
    // A single organizer's own public events, independent of the viewer's follow status —
    // backs ProfileScreen's organizer branch so a not-yet-followed organizer still shows
    // their events.
    getOrganizerEvents: builder.query<BackendEvent[], string>({
      query: (organizerId) => `events/by-organizer/${organizerId}`,
      providesTags: (_result, _error, organizerId) => [{ type: 'OrganizerEvents', id: organizerId }],
    }),
    followOrganizer: builder.mutation<void, string>({
      query: (organizerId) => ({ url: `organizers/${organizerId}/follow`, method: 'POST' }),
      // invalidatesTags alone means the button's "Follow"/"Following" text is driven by a
      // *second* round-trip (the refetch the invalidation triggers) — the mutation itself
      // finishes and its loading spinner disappears before that refetch lands, so the
      // button briefly re-renders showing the stale pre-tap state. Patching the cache here
      // the instant the tap happens removes that gap; invalidatesTags stays as a
      // reconciling safety net for drift (e.g. another user's concurrent follow/unfollow).
      async onQueryStarted(organizerId, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          organizerApi.util.updateQueryData('getOrganizerProfile', organizerId, (draft) => {
            draft.isFollowing = true;
            draft.followerCount += 1;
          }),
        );
        try {
          await queryFulfilled;
          // followingCount lives on userApi's getMe, a separate RTK Query slice whose tags
          // this api's invalidatesTags can't reach — invalidate it directly so the profile
          // stat updates without waiting out getMe's cache TTL.
          dispatch(userApi.util.invalidateTags(['Me']));
        } catch {
          patch.undo();
        }
      },
      invalidatesTags: (_result, _error, organizerId) => [
        { type: 'OrganizerProfile', id: organizerId },
        'MyFollowing',
        'FollowedEvents',
      ],
    }),
    unfollowOrganizer: builder.mutation<void, string>({
      query: (organizerId) => ({ url: `organizers/${organizerId}/follow`, method: 'DELETE' }),
      async onQueryStarted(organizerId, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          organizerApi.util.updateQueryData('getOrganizerProfile', organizerId, (draft) => {
            draft.isFollowing = false;
            draft.followerCount = Math.max(draft.followerCount - 1, 0);
          }),
        );
        try {
          await queryFulfilled;
          dispatch(userApi.util.invalidateTags(['Me']));
        } catch {
          patch.undo();
        }
      },
      invalidatesTags: (_result, _error, organizerId) => [
        { type: 'OrganizerProfile', id: organizerId },
        'MyFollowing',
        'FollowedEvents',
      ],
    }),
  }),
});

export const {
  useGetOrganizerProfileQuery,
  useGetMyFollowedOrganizersQuery,
  useGetFollowedEventsQuery,
  useGetOrganizerEventsQuery,
  useFollowOrganizerMutation,
  useUnfollowOrganizerMutation,
  useGetMyVerificationStatusQuery,
  useSubmitVerificationMutation,
} = organizerApi;
