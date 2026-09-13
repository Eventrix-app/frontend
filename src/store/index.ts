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
import checkInEncryptedStorage from './checkInEncryptedStorage';

import authSlice from './slices/authSlice';
import eventsSlice from './slices/eventsSlice';
import uiSlice from './slices/uiSlice';
import onboardingDraftReducer from './slices/onboardingDraftSlice';
import checkInCacheReducer from './slices/checkInCacheSlice';
import reelUploadReducer from './slices/reelUploadSlice';

import { eventsApi } from './services/eventsApi';
import { authApi } from './services/authApi';
import { userApi } from './services/userApi';
import { paymentsApi } from './services/paymentsApi';
import { notificationsApi } from './services/notificationsApi';
import { organizerApi } from './services/organizerApi';
import { chatApi } from './services/chatApi';
import { geocodeApi } from './services/geocodeApi';
import { moderationApi } from './services/moderationApi';
import { shortsApi } from './services/shortsApi';
import { authErrorMiddleware } from './middleware/authErrorMiddleware';
import { clearApiCacheOnLogout } from './middleware/clearApiCacheOnLogout';
import { setupNativeListeners } from './rtkQueryListeners';

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
// losing the cached attendee list or any not-yet-synced check-ins. Encrypted at rest —
// this cache holds a full attendee roster (name/email/ticket code) — see
// checkInEncryptedStorage.ts.
const checkInCachePersistConfig = {
  key: 'checkInCache',
  storage: checkInEncryptedStorage,
};

const rootReducer = combineReducers({
  auth: persistReducer(authPersistConfig, authSlice),
  events: eventsSlice,
  ui: uiSlice,
  onboardingDraft: persistReducer(onboardingDraftPersistConfig, onboardingDraftReducer),
  checkInCache: persistReducer(checkInCachePersistConfig, checkInCacheReducer),
  // Deliberately NOT persisted: an in-flight upload is owned by a live XMLHttpRequest that
  // cannot survive the process being killed. Rehydrating a "42% uploading" row would show a
  // progress bar nothing is driving, which can never finish or be cancelled.
  reelUpload: reelUploadReducer,
  [eventsApi.reducerPath]: eventsApi.reducer,
  [authApi.reducerPath]: authApi.reducer,
  [userApi.reducerPath]: userApi.reducer,
  [paymentsApi.reducerPath]: paymentsApi.reducer,
  [notificationsApi.reducerPath]: notificationsApi.reducer,
  [organizerApi.reducerPath]: organizerApi.reducer,
  [chatApi.reducerPath]: chatApi.reducer,
  [geocodeApi.reducerPath]: geocodeApi.reducer,
  [moderationApi.reducerPath]: moderationApi.reducer,
  [shortsApi.reducerPath]: shortsApi.reducer,
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
      moderationApi.middleware,
      // shortsApi was defined but never registered here. Without its reducer and middleware
      // in the store, every `useCreateShortMutation()` call threw at dispatch time instead
      // of issuing a request — which is why no reel ever finished uploading: the file
      // reached Supabase Storage but the row that makes it a reel was never created.
      shortsApi.middleware,
      authErrorMiddleware,
      clearApiCacheOnLogout,
    ),
});

export const persistor = persistStore(store);

// Passing the native handler rather than relying on the default one. RTK Query's default
// subscribes to window focus/online events, which React Native does not implement — so
// without this, refetchOnFocus/refetchOnReconnect never fire anywhere in the app no matter
// which slice declares them. See rtkQueryListeners.ts.
setupListeners(store.dispatch, setupNativeListeners);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
