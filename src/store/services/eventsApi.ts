import { createApi } from '@reduxjs/toolkit/query/react';
import { createFallbackBaseQuery } from './baseQuery';

export interface BackendEvent {
  id: string;
  title: string;
  description?: string;
  categoryId: string;
  organizerId: string;
  venueName: string;
  venueAddress: string;
  latitude?: number;
  longitude?: number;
  eventDate: string;
  startTime: string;
  endTime?: string;
  durationMinutes?: number;
  pricePerTicket?: number;
  currency?: string;
  totalCapacity?: number;
  availableTickets?: number;
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
  status: string;
  createdAt: string;
  updatedAt: string;
  // Eager-loaded by the backend on both GET /events and GET /events/:id
  // (events.service.ts findAllFiltered/findOne relations: ['organizer', 'organizer.user', 'category']).
  category?: { id: string; name: string; emoji?: string; colorHex?: string };
  organizer?: { id: string; userId: string; companyName: string; companyLogoUrl?: string; user?: { id: string; fullName: string } };
}

export interface CreateTicketTypePayload {
  name: string;
  price: number;
  currency?: string;
  quantityTotal?: number;
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
}

export interface CreateEventPayload {
  title: string;
  description?: string;
  categoryId: string;
  venueName: string;
  venueAddress: string;
  eventDate: string;
  startTime: string;
  endTime?: string;
  pricePerTicket?: number;
  totalCapacity?: number;
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

export type UploadPurpose = 'profile-picture' | 'event-image' | 'event-cover' | 'company-logo';
export type UploadContentType = 'image/png' | 'image/jpeg' | 'image/jpg' | 'image/heic' | 'image/webp';
export const ALLOWED_UPLOAD_CONTENT_TYPES: UploadContentType[] = ['image/png', 'image/jpeg', 'image/jpg', 'image/heic', 'image/webp'];

export const eventsApi = createApi({
  reducerPath: 'eventsApi',
  baseQuery: createFallbackBaseQuery(true),
  tagTypes: ['Event', 'MyEvents', 'MyEnrollments', 'MyWaitlist', 'TicketType'],
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
    getEvents: builder.query<BackendEvent[], { categoryId?: string; isOnline?: boolean; page?: number; limit?: number }>({
      query: (filters) => {
        const params = new URLSearchParams();
        if (filters.categoryId) params.append('categoryId', filters.categoryId);
        if (filters.isOnline !== undefined) params.append('isOnline', String(filters.isOnline));
        if (filters.page) params.append('page', String(filters.page));
        if (filters.limit) params.append('limit', String(filters.limit));
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
      invalidatesTags: (result, error, { id }) => [{ type: 'Event', id }, 'MyEvents'],
    }),
    deleteEvent: builder.mutation<void, string>({
      query: (id) => ({
        url: `events/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Event', 'MyEvents'],
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
    }),
    getMyEnrollments: builder.query<EnrollmentRecord[], void>({
      query: () => 'events/my-enrollments',
      providesTags: ['MyEnrollments'],
    }),
    getMyWaitlist: builder.query<WaitlistEntryRecord[], void>({
      query: () => 'events/my-waitlist',
      providesTags: ['MyWaitlist'],
    }),
    checkIn: builder.mutation<EnrollmentRecord, { ticketCode: string }>({
      query: (body) => ({
        url: 'events/check-in',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['MyEnrollments'],
    }),
    getEnrollmentById: builder.query<EnrollmentRecord, string>({
      query: (enrollmentId) => `events/enrollments/${enrollmentId}`,
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
  }),
});

export const {
  useGetEventsQuery,
  useGetEventByIdQuery,
  useGetMyEventsQuery,
  useCreateEventMutation,
  useUpdateEventMutation,
  useDeleteEventMutation,
  useEnrollEventMutation,
  useGetUploadUrlMutation,
  useGetEventEnrollmentsQuery,
  useGetMyEnrollmentsQuery,
  useGetMyWaitlistQuery,
  useCheckInMutation,
  useGetEnrollmentByIdQuery,
  useGetTicketTypesQuery,
  useLazyGetTicketTypesQuery,
  useCreateTicketTypeMutation,
  useUpdateTicketTypeMutation,
  useDeleteTicketTypeMutation,
} = eventsApi;
