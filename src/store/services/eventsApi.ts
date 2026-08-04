import { createApi } from '@reduxjs/toolkit/query/react';
import { createFallbackBaseQuery } from './baseQuery';
import type { TicketCategory } from '../../utils/ticketCategories';

export interface BackendEvent {
  id: string;
  title: string;
  description?: string;
  highlights?: string[];
  whoShouldAttend?: string[];
  categoryId: string;
  organizerId: string;
  venueName: string;
  venueAddress: string;
  latitude?: number;
  longitude?: number;
  eventDate: string;
  // Nullable, defaults to eventDate for single-day events — see Backend's event-dates.util.ts.
  eventEndDate?: string;
  startTime: string;
  endTime?: string;
  pricePerTicket?: number;
  currency?: string;
  // Organizer-entered event-wide cap (Event.capacity) — set once at creation/edit and
  // distinct from totalCapacity/availableTickets below, which are the *computed* numbers
  // the backend derives from it (falling back to summing ticket-tier quantities when this
  // is unset). Only meaningful to read back for pre-filling the edit form.
  capacity?: number;
  totalCapacity?: number;
  availableTickets?: number;
  // Computed at read time (withComputedFields on events.service.ts), never persisted —
  // Event.status only ever advances to 'cancelled', so this is the only reliable signal
  // that an event's end time has already passed.
  isCompleted?: boolean;
  featured: boolean;
  isOnline: boolean;
  meetingLink?: string;
  imageUrl?: string;
  coverImageUrl?: string;
  approvalStatus: 'draft' | 'pending_approval' | 'approved' | 'rejected';
  approvalMethod?: 'auto' | 'manual' | null;
  isPaid: boolean;
  rejectionReason?: string;
  refundPolicyType?: string;
  refundPolicyText?: string;
  // Already returned by the backend (Event.feePayer, default 'organizer') — determines
  // whether checkout needs to show a Service Fee line on top of the raw ticket price. No
  // create/edit-event UI sets this today, so 'organizer' (no buyer-side markup) is the only
  // value reachable in practice, but CheckoutScreen still reads it rather than assuming.
  feePayer?: 'organizer' | 'participant';
  status: string;
  createdAt: string;
  updatedAt: string;
  // Eager-loaded by the backend on both GET /events and GET /events/:id
  // (events.service.ts findAllFiltered/findOne relations: ['organizer', 'organizer.user', 'category']).
  category?: { id: string; name: string };
  // verified/verificationLevel are already returned by the backend (SAFE_ORGANIZER_SELECT on
  // events.service.ts) — this type just hadn't caught up. verified is true exactly when
  // verificationLevel is 'document_verified' (kept in sync in organizer.service.ts), so
  // either can be used to gate a "verified" badge.
  organizer?: {
    id: string;
    userId: string;
    companyName: string;
    companyLogoUrl?: string;
    verified?: boolean;
    verificationLevel?: 'unverified' | 'email_verified' | 'phone_verified' | 'document_verified';
    user?: { id: string; fullName: string };
  };
}

export interface CreateTicketTypePayload {
  // No `name` — the backend derives and stores the display name from `category` (see
  // TICKET_CATEGORY_LABELS on TicketType) so every ticket type on the platform draws from
  // the same small vocabulary instead of organizer-typed free text.
  category: TicketCategory;
  price: number;
  currency?: string;
  quantityTotal?: number;
  // Bullet points shown on the ticket card (see EventDetailsScreen's ticket tab). Capped at
  // 6 server-side — CreateTicketTypeDto's benefits validation.
  benefits?: string[];
  salesStartAt?: string;
  salesEndAt?: string;
  minPerOrder?: number;
  maxPerOrder?: number;
  isHidden?: boolean;
  accessPassword?: string;
}

export interface TicketTypeRecord extends CreateTicketTypePayload {
  id: string;
  eventId: string;
  quantitySold: number;
  // Server-derived from `category` at write time (create or edit) — always
  // TICKET_CATEGORY_LABELS[category]. Present because BookingsScreen and other existing
  // consumers already read `.name` for display and there is no reason to make them all
  // re-derive it from `category` themselves.
  name: string;
}

export interface CreateEventPayload {
  title: string;
  description?: string;
  highlights?: string[];
  whoShouldAttend?: string[];
  categoryId: string;
  venueName: string;
  venueAddress: string;
  latitude?: number;
  longitude?: number;
  eventDate: string;
  startTime: string;
  endTime?: string;
  // Only set when the event's end time crosses midnight relative to eventDate (e.g. a
  // 10 PM start with a 2 AM end) — see getEventEndDateTime on the backend, which defaults
  // this to eventDate itself (a same-day event) whenever it's omitted.
  eventEndDate?: string;
  pricePerTicket?: number;
  totalCapacity?: number;
  // Event-wide seat cap the organizer sets directly; when omitted, the backend derives it
  // from the sum of ticket-tier quantities instead (see events.service.ts withComputedSeats).
  // Accepted on both create and edit (PATCH keeps it — only ticketTypes is create-only).
  capacity?: number;
  isOnline?: boolean;
  meetingLink?: string;
  coverImageUrl?: string;
  approvalStatus?: 'draft' | 'pending_approval';
  isPaid?: boolean;
  refundPolicyType?: string;
  refundPolicyText?: string;
  // Only accepted by POST /events — PATCH /events/:id omits it (nested ticket-type
  // endpoints own edits to tiers after creation).
  ticketTypes?: CreateTicketTypePayload[];
}

export interface EnrollmentRecord {
  id: string;
  userId: string;
  eventId: string;
  quantity: number;
  totalAmount: number;
  status: string;
  paymentStatus?: string;
  bookingReference: string;
  ticketCode?: string;
  checkedInAt?: string;
  bookingDate?: string;
  user?: { id: string; email: string; fullName: string };
  // Eager-loaded on GET /events/my-enrollments (relations: ['event', 'ticketType']).
  event?: BackendEvent;
  ticketType?: { id: string; name: string; price: number };
}

export interface WaitlistEntryRecord {
  id: string;
  eventId: string;
  ticketTypeId: string;
  userId: string;
  quantity: number;
  status: 'waiting' | 'promoted' | 'expired' | 'cancelled';
  // 1-indexed FIFO position among still-WAITING entries for the same tier; 0 once the
  // entry has moved on (promoted/expired/cancelled). See WaitlistService.getPosition().
  position: number;
  promotedAt?: string;
  promotedEnrollmentId?: string;
  createdAt: string;
  updatedAt: string;
  // Eager-loaded on GET /events/my-waitlist (relations: ['event', 'ticketType']).
  event?: BackendEvent;
  ticketType?: { id: string; name: string; price: number };
}

// EventsService.enroll() returns a confirmed Enrollment when a tier has room, or a
// WaitlistEntryRecord when it's sold out — `position` only ever appears on the latter,
// so its presence is what the UI branches on (see EventDetailsScreen's handleEnroll).
export type EnrollResult = EnrollmentRecord | WaitlistEntryRecord;

export function isWaitlistResult(result: EnrollResult): result is WaitlistEntryRecord {
  return 'position' in result;
}

export interface UploadUrlResponse {
  uploadUrl: string;
  publicUrl: string;
}

export type UploadPurpose =
  | 'profile-picture'
  | 'event-image'
  | 'event-cover'
  | 'company-logo'
  // KYC documents for organizer verification (#7) — land in a private bucket server-side,
  // not the public ones the other purposes above use. See uploads.service.ts.
  | 'identity-proof'
  | 'address-proof'
  | 'pan-or-aadhaar'
  // Reel/short media. Unlike every purpose above, any authenticated user may request this
  // one (UploadsService.PURPOSE_CONFIG gives it allowedRoles: null) rather than just
  // organizers/admins, because reel uploaders are attendees. Mirrors UploadPurpose.REEL_VIDEO
  // in Backend/src/uploads/dto/create-signed-url.dto.ts.
  | 'reel-video';
export type UploadContentType = 'image/png' | 'image/jpeg' | 'image/jpg' | 'image/heic' | 'image/webp' | 'video/mp4' | 'video/quicktime';
export const ALLOWED_UPLOAD_CONTENT_TYPES: UploadContentType[] = ['image/png', 'image/jpeg', 'image/jpg', 'image/heic', 'image/webp', 'video/mp4', 'video/quicktime'];

export interface ScheduleItemRecord {
  id: string;
  eventId: string;
  time: string;
  title: string;
  order: number;
}

export interface CreateScheduleItemPayload {
  time: string;
  title: string;
  order?: number;
}

export interface AnnouncementRecord {
  id: string;
  eventId: string;
  postedByUserId: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  postedBy?: { id: string; fullName: string };
}

export interface CreateAnnouncementPayload {
  title: string;
  body: string;
}

export type UpdateAnnouncementPayload = Partial<CreateAnnouncementPayload>;

export interface ReviewRecord {
  id: string;
  eventId: string;
  userId: string;
  rating: number;
  text?: string;
  createdAt: string;
  updatedAt: string;
  user?: { id: string; fullName: string };
}

export interface CreateReviewPayload {
  rating: number;
  text?: string;
}

export type UpdateReviewPayload = Partial<CreateReviewPayload>;

export interface EventMediaRecord {
  id: string;
  eventId: string;
  type: 'image' | 'video';
  url: string;
  position: number;
}

export interface CreateEventMediaPayload {
  type: 'image' | 'video';
  url: string;
  position?: number;
}

export const eventsApi = createApi({
  reducerPath: 'eventsApi',
  baseQuery: createFallbackBaseQuery(true),
  tagTypes: ['Event', 'MyEvents', 'MyEnrollments', 'MyWaitlist', 'TicketType', 'Favorite', 'EventMedia', 'Enrollment', 'Schedule', 'Announcements', 'Reviews'],
  // A query that fails once (e.g. hitting a backend mid-deploy/restart) otherwise stays
  // cached as an error indefinitely. Bottom-tab screens (Home/Explore/Bookings/etc.) stay
  // mounted when switching tabs, so a plain remount won't retry it — refetchOnFocus
  // (window/tab regains focus, via the setupListeners() call in store/index.ts) is the
  // one that actually fires when just switching back to a tab in a browser session.
  // refetchOnMountOrArgChange covers the case where the screen genuinely does remount
  // (e.g. after an app reload) with cached data older than 10s.
  refetchOnMountOrArgChange: 10,
  refetchOnFocus: true,
  endpoints: (builder) => ({
    getEvents: builder.query<
      BackendEvent[],
      {
        categoryId?: string;
        isOnline?: boolean;
        page?: number;
        limit?: number;
        search?: string;
        priceMin?: number;
        priceMax?: number;
        dateFrom?: string;
        dateTo?: string;
        sortBy?: 'eventDate' | 'newest';
      }
    >({
      query: (filters) => {
        const params = new URLSearchParams();
        if (filters.categoryId) params.append('categoryId', filters.categoryId);
        if (filters.isOnline !== undefined) params.append('isOnline', String(filters.isOnline));
        if (filters.page) params.append('page', String(filters.page));
        if (filters.limit) params.append('limit', String(filters.limit));
        if (filters.search) params.append('search', filters.search);
        if (filters.priceMin !== undefined) params.append('priceMin', String(filters.priceMin));
        if (filters.priceMax !== undefined) params.append('priceMax', String(filters.priceMax));
        if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
        if (filters.dateTo) params.append('dateTo', filters.dateTo);
        if (filters.sortBy) params.append('sortBy', filters.sortBy);
        return `events?${params.toString()}`;
      },
      // GET /events returns a paginated wrapper ({events, total, page, totalPages}), not a bare array.
      transformResponse: (response: { events: BackendEvent[] }) => response.events,
      providesTags: ['Event'],
    }),
    getEventById: builder.query<BackendEvent, string>({
      query: (id) => `events/${id}`,
      providesTags: (result, error, id) => [{ type: 'Event', id }],
    }),
    getMyEvents: builder.query<BackendEvent[], void>({
      query: () => 'events/my-events',
      providesTags: ['MyEvents'],
    }),
    createEvent: builder.mutation<BackendEvent, CreateEventPayload>({
      query: (body) => ({
        url: 'events',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Event', 'MyEvents'],
    }),
    updateEvent: builder.mutation<BackendEvent, { id: string; body: Partial<CreateEventPayload> }>({
      query: ({ id, body }) => ({
        url: `events/${id}`,
        method: 'PATCH',
        body,
      }),
      // Also invalidates the plain 'Event' tag (not just the specific id) — without it,
      // getEvents' list query (providesTags: ['Event'], used by Home/Explore/Search) kept
      // serving cached pre-edit data until its own TTL/focus-refetch happened to fire,
      // making an edit look like it silently didn't save. Matches createEvent/deleteEvent/
      // cancelEvent below, which already invalidate the broad tag.
      invalidatesTags: (result, error, { id }) => [{ type: 'Event', id }, 'Event', 'MyEvents'],
    }),
    deleteEvent: builder.mutation<void, string>({
      query: (id) => ({
        url: `events/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Event', 'MyEvents'],
    }),
    cancelEvent: builder.mutation<BackendEvent, { id: string; reason?: string }>({
      query: ({ id, reason }) => ({
        url: `events/${id}/cancel`,
        method: 'PATCH',
        body: reason ? { reason } : undefined,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Event', id }, 'Event', 'MyEvents'],
    }),
    enrollEvent: builder.mutation<EnrollResult, { eventId: string; ticketTypeId: string; quantity: number }>({
      query: ({ eventId, ticketTypeId, quantity }) => ({
        url: `events/${eventId}/enroll`,
        method: 'POST',
        body: { ticketTypeId, quantity },
      }),
      invalidatesTags: (result, error, { eventId }) => [
        { type: 'Event', id: eventId },
        { type: 'TicketType', id: eventId },
        'Event',
        'MyEnrollments',
        'MyWaitlist',
      ],
    }),
    getUploadUrl: builder.mutation<UploadUrlResponse, { purpose: UploadPurpose; contentType: UploadContentType }>({
      query: (body) => ({
        url: 'uploads/signed-url',
        method: 'POST',
        body,
      }),
    }),
    getEventEnrollments: builder.query<EnrollmentRecord[], string>({
      query: (eventId) => `events/${eventId}/enrollments`,
      providesTags: (result, error, eventId) => [{ type: 'Event', id: eventId }],
    }),
    getMyEnrollments: builder.query<EnrollmentRecord[], void>({
      query: () => 'events/my-enrollments',
      providesTags: ['MyEnrollments'],
    }),
    getMyWaitlist: builder.query<WaitlistEntryRecord[], void>({
      query: () => 'events/my-waitlist',
      providesTags: ['MyWaitlist'],
    }),
    getMyFavorites: builder.query<BackendEvent[], void>({
      query: () => 'events/my-favorites',
      providesTags: ['Favorite'],
    }),
    addFavorite: builder.mutation<void, string>({
      query: (eventId) => ({ url: `events/${eventId}/favorite`, method: 'POST' }),
      invalidatesTags: ['Favorite'],
    }),
    removeFavorite: builder.mutation<void, string>({
      query: (eventId) => ({ url: `events/${eventId}/favorite`, method: 'DELETE' }),
      invalidatesTags: ['Favorite'],
    }),
    // idempotencyKey identifies the *scan*, not the request: generated once when the QR is
    // read and reused for every retry of that scan. It is what lets the backend answer 200
    // for "this same scan, arriving again" and 409 only for "a different scan of an
    // already-used ticket" — see events.service.ts checkIn().
    checkIn: builder.mutation<EnrollmentRecord, { ticketCode: string; idempotencyKey?: string }>({
      query: (body) => ({
        url: 'events/check-in',
        method: 'POST',
        body,
      }),
      invalidatesTags: (result) => [
        'MyEnrollments',
        ...(result ? [{ type: 'Event' as const, id: result.eventId }] : []),
      ],
    }),
    cancelEnrollment: builder.mutation<EnrollmentRecord, string>({
      query: (enrollmentId) => ({ url: `events/enrollments/${enrollmentId}/cancel`, method: 'PATCH' }),
      // Cancelling frees a seat exactly like enrollEvent claims one (and can trigger a
      // waitlist promotion server-side, per EventsService.cancelEnrollment) — mirrors
      // enrollEvent's invalidatesTags so ticket-tier availability and any promoted
      // waitlist entry refresh without a manual pull-to-refresh.
      invalidatesTags: (result, error, enrollmentId) => [
        'MyEnrollments',
        'MyWaitlist',
        'Event',
        { type: 'Enrollment', id: enrollmentId },
        ...(result ? [{ type: 'Event' as const, id: result.eventId }, { type: 'TicketType' as const, id: result.eventId }] : []),
      ],
    }),
    getEnrollmentById: builder.query<EnrollmentRecord, string>({
      query: (enrollmentId) => `events/enrollments/${enrollmentId}`,
      providesTags: (result, error, enrollmentId) => [{ type: 'Enrollment', id: enrollmentId }],
    }),
    getTicketTypes: builder.query<TicketTypeRecord[], string>({
      query: (eventId) => `events/${eventId}/ticket-types`,
      providesTags: (result, error, eventId) => [{ type: 'TicketType', id: eventId }],
    }),
    createTicketType: builder.mutation<TicketTypeRecord, { eventId: string; body: CreateTicketTypePayload }>({
      query: ({ eventId, body }) => ({
        url: `events/${eventId}/ticket-types`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (result, error, { eventId }) => [{ type: 'TicketType', id: eventId }],
    }),
    updateTicketType: builder.mutation<TicketTypeRecord, { eventId: string; ticketTypeId: string; body: Partial<CreateTicketTypePayload> }>({
      query: ({ eventId, ticketTypeId, body }) => ({
        url: `events/${eventId}/ticket-types/${ticketTypeId}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (result, error, { eventId }) => [{ type: 'TicketType', id: eventId }],
    }),
    deleteTicketType: builder.mutation<void, { eventId: string; ticketTypeId: string }>({
      query: ({ eventId, ticketTypeId }) => ({
        url: `events/${eventId}/ticket-types/${ticketTypeId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { eventId }) => [{ type: 'TicketType', id: eventId }],
    }),
    getEventMedia: builder.query<EventMediaRecord[], string>({
      query: (eventId) => `events/${eventId}/media`,
      providesTags: (result, error, eventId) => [{ type: 'EventMedia', id: eventId }],
    }),
    createEventMedia: builder.mutation<EventMediaRecord, { eventId: string; body: CreateEventMediaPayload }>({
      query: ({ eventId, body }) => ({
        url: `events/${eventId}/media`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (result, error, { eventId }) => [{ type: 'EventMedia', id: eventId }],
    }),
    deleteEventMedia: builder.mutation<void, { eventId: string; mediaId: string }>({
      query: ({ eventId, mediaId }) => ({
        url: `events/${eventId}/media/${mediaId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { eventId }) => [{ type: 'EventMedia', id: eventId }],
    }),
    getSchedule: builder.query<ScheduleItemRecord[], string>({
      query: (eventId) => `events/${eventId}/schedule`,
      providesTags: (result, error, eventId) => [{ type: 'Schedule', id: eventId }],
    }),
    createScheduleItem: builder.mutation<ScheduleItemRecord, { eventId: string; body: CreateScheduleItemPayload }>({
      query: ({ eventId, body }) => ({ url: `events/${eventId}/schedule`, method: 'POST', body }),
      invalidatesTags: (result, error, { eventId }) => [{ type: 'Schedule', id: eventId }],
    }),
    deleteScheduleItem: builder.mutation<void, { eventId: string; itemId: string }>({
      query: ({ eventId, itemId }) => ({ url: `events/${eventId}/schedule/${itemId}`, method: 'DELETE' }),
      invalidatesTags: (result, error, { eventId }) => [{ type: 'Schedule', id: eventId }],
    }),
    getAnnouncements: builder.query<AnnouncementRecord[], string>({
      query: (eventId) => `events/${eventId}/announcements`,
      providesTags: (result, error, eventId) => [{ type: 'Announcements', id: eventId }],
    }),
    createAnnouncement: builder.mutation<AnnouncementRecord, { eventId: string; body: CreateAnnouncementPayload }>({
      query: ({ eventId, body }) => ({ url: `events/${eventId}/announcements`, method: 'POST', body }),
      invalidatesTags: (result, error, { eventId }) => [{ type: 'Announcements', id: eventId }],
    }),
    updateAnnouncement: builder.mutation<
      AnnouncementRecord,
      { eventId: string; announcementId: string; body: UpdateAnnouncementPayload }
    >({
      query: ({ eventId, announcementId, body }) => ({
        url: `events/${eventId}/announcements/${announcementId}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (result, error, { eventId }) => [{ type: 'Announcements', id: eventId }],
    }),
    deleteAnnouncement: builder.mutation<void, { eventId: string; announcementId: string }>({
      query: ({ eventId, announcementId }) => ({
        url: `events/${eventId}/announcements/${announcementId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { eventId }) => [{ type: 'Announcements', id: eventId }],
    }),
    getReviews: builder.query<ReviewRecord[], string>({
      query: (eventId) => `events/${eventId}/reviews`,
      providesTags: (result, error, eventId) => [{ type: 'Reviews', id: eventId }],
    }),
    createReview: builder.mutation<ReviewRecord, { eventId: string; body: CreateReviewPayload }>({
      query: ({ eventId, body }) => ({ url: `events/${eventId}/reviews`, method: 'POST', body }),
      invalidatesTags: (result, error, { eventId }) => [{ type: 'Reviews', id: eventId }],
    }),
    updateReview: builder.mutation<ReviewRecord, { eventId: string; reviewId: string; body: UpdateReviewPayload }>({
      query: ({ eventId, reviewId, body }) => ({
        url: `events/${eventId}/reviews/${reviewId}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (result, error, { eventId }) => [{ type: 'Reviews', id: eventId }],
    }),
    deleteReview: builder.mutation<void, { eventId: string; reviewId: string }>({
      query: ({ eventId, reviewId }) => ({ url: `events/${eventId}/reviews/${reviewId}`, method: 'DELETE' }),
      invalidatesTags: (result, error, { eventId }) => [{ type: 'Reviews', id: eventId }],
    }),
  }),
});

export const {
  useGetEventsQuery,
  useGetEventByIdQuery,
  useGetMyEventsQuery,
  useCreateEventMutation,
  useUpdateEventMutation,
  useDeleteEventMutation,
  useCancelEventMutation,
  useEnrollEventMutation,
  useGetUploadUrlMutation,
  useGetEventEnrollmentsQuery,
  useGetMyEnrollmentsQuery,
  useGetMyWaitlistQuery,
  useGetMyFavoritesQuery,
  useAddFavoriteMutation,
  useRemoveFavoriteMutation,
  useCheckInMutation,
  useCancelEnrollmentMutation,
  useGetEnrollmentByIdQuery,
  useGetTicketTypesQuery,
  useLazyGetTicketTypesQuery,
  useCreateTicketTypeMutation,
  useUpdateTicketTypeMutation,
  useDeleteTicketTypeMutation,
  useGetEventMediaQuery,
  useCreateEventMediaMutation,
  useDeleteEventMediaMutation,
  useGetScheduleQuery,
  useCreateScheduleItemMutation,
  useDeleteScheduleItemMutation,
  useGetAnnouncementsQuery,
  useCreateAnnouncementMutation,
  useUpdateAnnouncementMutation,
  useDeleteAnnouncementMutation,
  useGetReviewsQuery,
  useCreateReviewMutation,
  useUpdateReviewMutation,
  useDeleteReviewMutation,
} = eventsApi;
