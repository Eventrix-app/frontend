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
}

export interface EnrollmentRecord {
  id: string;
  userId: string;
  eventId: string;
  quantity: number;
  totalAmount: number;
  status: string;
  bookingReference: string;
  ticketCode?: string;
  checkedInAt?: string;
  bookingDate?: string;
  user?: { id: string; email: string; fullName: string };
}

export interface UploadUrlResponse {
  signedUrl: string;
  path: string;
  token: string;
}

export const eventsApi = createApi({
  reducerPath: 'eventsApi',
  baseQuery: createFallbackBaseQuery(true),
  tagTypes: ['Event', 'MyEvents'],
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
    enrollEvent: builder.mutation<{ id: string; ticketCode?: string }, string>({
      query: (eventId) => ({
        url: `events/${eventId}/enroll`,
        method: 'POST',
      }),
      invalidatesTags: ['Event'],
    }),
    getUploadUrl: builder.mutation<UploadUrlResponse, string>({
      query: (fileName) => ({
        url: 'events/upload-url',
        method: 'POST',
        body: { fileName },
      }),
    }),
    getEventEnrollments: builder.query<EnrollmentRecord[], string>({
      query: (eventId) => `events/${eventId}/enrollments`,
    }),
    checkIn: builder.mutation<EnrollmentRecord, { ticketCode: string }>({
      query: (body) => ({
        url: 'events/check-in',
        method: 'POST',
        body,
      }),
    }),
    getEnrollmentById: builder.query<EnrollmentRecord, string>({
      query: (enrollmentId) => `events/enrollments/${enrollmentId}`,
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
  useCheckInMutation,
  useGetEnrollmentByIdQuery,
} = eventsApi;
