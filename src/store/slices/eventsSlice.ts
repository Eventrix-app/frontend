import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

interface Event {
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

interface EventsState {
  events: Event[];
  featuredEvents: Event[];
  currentEvent: Event | null;
  isLoading: boolean;
  error: string | null;
  filters: {
    category?: string;
    dateRange?: string;
    priceRange?: string;
    location?: string;
  };
}

const initialState: EventsState = {
  events: [],
  featuredEvents: [],
  currentEvent: null,
  isLoading: false,
  error: null,
  filters: {},
};

const eventsSlice = createSlice({
  name: 'events',
  initialState,
  reducers: {
    setEvents: (state, action: PayloadAction<Event[]>) => {
      state.events = action.payload;
    },
    setFeaturedEvents: (state, action: PayloadAction<Event[]>) => {
      state.featuredEvents = action.payload;
    },
    setCurrentEvent: (state, action: PayloadAction<Event | null>) => {
      state.currentEvent = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setFilters: (state, action: PayloadAction<Partial<EventsState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = {};
    },
  },
});

export const {
  setEvents,
  setFeaturedEvents,
  setCurrentEvent,
  setLoading,
  setError,
  setFilters,
  clearFilters,
} = eventsSlice.actions;

export default eventsSlice.reducer;
