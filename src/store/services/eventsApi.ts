import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../index';

// Types
export interface Event {
  id: string;
  title: string;
  description: string;
  categoryId: string;
  organizerId: string;
  locationName: string;
  address: string;
  latitude: number;
  longitude: number;
  startDate: string;
  endDate: string;
  priceRange: string;
  images: string[];
  isFeatured: boolean;
  status: 'draft' | 'published' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface EventsFilters {
  category?: string;
  dateRange?: string;
  priceRange?: string;
  location?: string;
  search?: string;
}

export const eventsApi = createApi({
  reducerPath: 'eventsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8081/api/',
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token;
      if (token) headers.set('Authorization', `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ['Event'],
  endpoints: (builder) => ({
    getEvents: builder.query<Event[], EventsFilters>({
      query: (filters) => {
        const params = new URLSearchParams();
        if (filters.category) params.append('category', filters.category);
        if (filters.dateRange) params.append('dateRange', filters.dateRange);
        if (filters.priceRange) params.append('priceRange', filters.priceRange);
        if (filters.location) params.append('location', filters.location);
        if (filters.search) params.append('search', filters.search);
        return `events?${params.toString()}`;
      },
      providesTags: ['Event'],
    }),
    getFeaturedEvents: builder.query<Event[], void>({
      query: () => 'events/featured',
      providesTags: ['Event'],
    }),
    getEventById: builder.query<Event, string>({
      query: (id) => `events/${id}`,
      providesTags: (result, error, id) => [{ type: 'Event', id }],
    }),
    createEvent: builder.mutation<Event, Partial<Event>>({
      query: (body) => ({
        url: 'events',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Event'],
    }),
    updateEvent: builder.mutation<Event, { id: string; body: Partial<Event> }>({
      query: ({ id, body }) => ({
        url: `events/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Event', id }],
    }),
    deleteEvent: builder.mutation<void, string>({
      query: (id) => ({
        url: `events/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Event'],
    }),
  }),
});

export const {
  useGetEventsQuery,
  useGetFeaturedEventsQuery,
  useGetEventByIdQuery,
  useCreateEventMutation,
  useUpdateEventMutation,
  useDeleteEventMutation,
} = eventsApi;
