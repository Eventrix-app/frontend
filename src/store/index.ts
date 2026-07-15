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

import authSlice from './slices/authSlice';
import eventsSlice from './slices/eventsSlice';
import uiSlice from './slices/uiSlice';
import onboardingDraftReducer from './slices/onboardingDraftSlice';

import { eventsApi } from './services/eventsApi';
import { authApi } from './services/authApi';
import { userApi } from './services/userApi';
import { paymentsApi } from './services/paymentsApi';

// Persist only the onboarding draft so it survives app kills mid-onboarding
const onboardingDraftPersistConfig = {
  key: 'onboardingDraft',
  storage: AsyncStorage,
};

const rootReducer = combineReducers({
  auth: authSlice,
  events: eventsSlice,
  ui: uiSlice,
  onboardingDraft: persistReducer(onboardingDraftPersistConfig, onboardingDraftReducer),
  [eventsApi.reducerPath]: eventsApi.reducer,
  [authApi.reducerPath]: authApi.reducer,
  [userApi.reducerPath]: userApi.reducer,
  [paymentsApi.reducerPath]: paymentsApi.reducer,
});

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // redux-persist actions are non-serializable by design
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }).concat(eventsApi.middleware, authApi.middleware, userApi.middleware, paymentsApi.middleware),
});

export const persistor = persistStore(store);

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
