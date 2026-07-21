import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import secureStorage from './secureStorage';

import authSlice from './slices/authSlice';
import eventsSlice from './slices/eventsSlice';
import uiSlice from './slices/uiSlice';
import onboardingDraftReducer from './slices/onboardingDraftSlice';
import checkInCacheReducer from './slices/checkInCacheSlice';

import { eventsApi } from './services/eventsApi';
import { authApi } from './services/authApi';
import { userApi } from './services/userApi';
import { paymentsApi } from './services/paymentsApi';
import { notificationsApi } from './services/notificationsApi';
import { organizerApi } from './services/organizerApi';
import { chatApi } from './services/chatApi';
import { geocodeApi } from './services/geocodeApi';
import { authErrorMiddleware } from './middleware/authErrorMiddleware';
import { clearApiCacheOnLogout } from './middleware/clearApiCacheOnLogout';

// Persisted so a logged-in session survives an app restart — the 2-day inactivity logout
// (POST /auth/refresh, called on every app foreground/launch — see AppStateSync in App.tsx)
// is enforced by the token's own server-side expiry, not by this persistence; without it,
// every app restart would force a re-login regardless of how recently the user was active.
// isLoading/error are transient UI state, not session state, so they're excluded.
const authPersistConfig = {
  key: 'auth',
  storage: secureStorage,
  blacklist: ['isLoading', 'error'],
};

// Persist only the onboarding draft so it survives app kills mid-onboarding
const onboardingDraftPersistConfig = {
  key: 'onboardingDraft',
  storage: AsyncStorage,
};

// Persisted so an organizer scanning tickets offline can kill/reopen the app without
// losing the cached attendee list or any not-yet-synced check-ins.
const checkInCachePersistConfig = {
  key: 'checkInCache',
  storage: AsyncStorage,
};

const rootReducer = combineReducers({
  auth: persistReducer(authPersistConfig, authSlice),
  events: eventsSlice,
  ui: uiSlice,
  onboardingDraft: persistReducer(onboardingDraftPersistConfig, onboardingDraftReducer),
  checkInCache: persistReducer(checkInCachePersistConfig, checkInCacheReducer),
  [eventsApi.reducerPath]: eventsApi.reducer,
  [authApi.reducerPath]: authApi.reducer,
  [userApi.reducerPath]: userApi.reducer,
  [paymentsApi.reducerPath]: paymentsApi.reducer,
  [notificationsApi.reducerPath]: notificationsApi.reducer,
  [organizerApi.reducerPath]: organizerApi.reducer,
  [chatApi.reducerPath]: chatApi.reducer,
  [geocodeApi.reducerPath]: geocodeApi.reducer,
});

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // redux-persist actions are non-serializable by design
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }).concat(
      eventsApi.middleware,
      authApi.middleware,
      userApi.middleware,
      paymentsApi.middleware,
      notificationsApi.middleware,
      organizerApi.middleware,
      chatApi.middleware,
      geocodeApi.middleware,
      authErrorMiddleware,
      clearApiCacheOnLogout,
    ),
});

export const persistor = persistStore(store);

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
