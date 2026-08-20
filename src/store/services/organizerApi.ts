import { createApi } from '@reduxjs/toolkit/query/react';
import { createFallbackBaseQuery } from './baseQuery';
import { CACHE_STABLE } from './cachePolicy';
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
  phone?: string;
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

// Where this organizer's payouts are sent. Mirrors BankAccountSummary in
// bank-account.service.ts — note what is NOT here: the account number (only its last four
// digits) and the holder name. Both are encrypted at rest and never leave the server, so
// there is nothing for the app to redact.
export interface BankAccountSummary {
  id: string;
  accountNumberLast4: string;
  ifscCode: string;
  bankName: string;
  branchName?: string | null;
  accountType: 'savings' | 'current';
  // pending — awaiting admin review; verified — details checked against KYC, but NOT yet
  // payable; penny_drop_verified — a ₹1 test transfer landed, the only payable state;
  // rejected — see rejectionReason.
  status: 'pending' | 'verified' | 'penny_drop_verified' | 'rejected';
  rejectionReason?: string | null;
  verifiedAt?: string | null;
  pennyDropAt?: string | null;
  // The single flag the UI should branch on. Do not reimplement it from `status` — the rule
  // is "admin-verified AND penny-dropped", and duplicating it here is how the app ends up
  // telling an organizer they will be paid when the server disagrees.
  isPayoutReady: boolean;
  createdAt: string;
}

export interface SubmitBankAccountPayload {
  accountNumber: string;
  // Compared server-side. Indian account numbers carry no checksum, so a re-entry is the
  // only thing standing between a typo and an irreversible transfer to a stranger.
  confirmAccountNumber: string;
  accountHolderName: string;
  ifscCode: string;
  bankName: string;
  branchName?: string;
  accountType?: 'savings' | 'current';
  // The PAN NUMBER, not the card image (that is panOrAadhaarUrl in the KYC flow above).
  // Optional until TDS withholding ships.
  panNumber?: string;
}

export const organizerApi = createApi({
  reducerPath: 'organizerApi',
  baseQuery: createFallbackBaseQuery(true),
  tagTypes: [
    'OrganizerProfile',
    'MyFollowing',
    'FollowedEvents',
    'OrganizerEvents',
    'MyVerificationStatus',
    'MyBankAccount',
  ],
  // Organizer-owned data changes only through this user's own mutations, all of which
  // invalidate their tags — so a longer window costs nothing in freshness and saves a refetch
  // every time the organizer moves between their dashboard screens.
  keepUnusedDataFor: CACHE_STABLE,
  refetchOnReconnect: true,
  endpoints: (builder) => ({
    // null when nothing has been submitted yet — a fresh organizer, not an error.
    getMyBankAccount: builder.query<BankAccountSummary | null, void>({
      query: () => 'organizers/bank-account/me',
      providesTags: ['MyBankAccount'],
    }),
    // PUT: resubmitting replaces the account rather than adding a second one. The server
    // deactivates the previous row instead of overwriting it, so past payouts stay traceable
    // to the account they actually went to — and the new one always restarts at `pending`.
    submitBankAccount: builder.mutation<BankAccountSummary, SubmitBankAccountPayload>({
      query: (body) => ({ url: 'organizers/bank-account/me', method: 'PUT', body }),
      invalidatesTags: ['MyBankAccount'],
    }),
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
  useGetMyBankAccountQuery,
  useSubmitBankAccountMutation,
} = organizerApi;
