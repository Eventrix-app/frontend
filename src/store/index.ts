import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';

// Import slices directly
import authSlice from './slices/authSlice';
import eventsSlice from './slices/eventsSlice';
import uiSlice from './slices/uiSlice';

// Import API services
import { eventsApi } from './services/eventsApi';
import { authApi } from './services/authApi';

export const store = configureStore({
  reducer: {
    auth: authSlice,
    events: eventsSlice,
    ui: uiSlice,
    [eventsApi.reducerPath]: eventsApi.reducer,
    [authApi.reducerPath]: authApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      eventsApi.middleware,
      authApi.middleware
    ),
});

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
