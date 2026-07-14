import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { authApi } from '../services/authApi';

interface NotificationPrefs {
  eventReminders: boolean;
  nearbyEvents: boolean;
  reelsAndCommunity: boolean;
  specialOffers: boolean;
}

interface OnboardingDraftState {
  categoryIds: string[];
  latitude: number | null;
  longitude: number | null;
  manualCity: string | null;
  notificationPrefs: NotificationPrefs | null;
  isSynced: boolean;
  // Device-level, persisted (see store/index.ts) — gates whether SplashScreen shows the
  // pre-auth onboarding chain again. Distinct from the account-level flag returned by
  // login/register: this one is per-device ("don't replay the carousel on this phone"),
  // that one is per-account ("this person has ever finished onboarding, anywhere").
  hasCompletedOnboarding: boolean;
}

const initialState: OnboardingDraftState = {
  categoryIds: [],
  latitude: null,
  longitude: null,
  manualCity: null,
  notificationPrefs: null,
  isSynced: false,
  hasCompletedOnboarding: false,
};

const onboardingDraftSlice = createSlice({
  name: 'onboardingDraft',
  initialState,
  reducers: {
    setInterests(state, action: PayloadAction<string[]>) {
      state.categoryIds = action.payload;
    },
    setLocation(state, action: PayloadAction<{ latitude: number; longitude: number }>) {
      state.latitude = action.payload.latitude;
      state.longitude = action.payload.longitude;
    },
    setManualCity(state, action: PayloadAction<string | null>) {
      state.manualCity = action.payload;
    },
    setNotificationPrefs(state, action: PayloadAction<NotificationPrefs>) {
      state.notificationPrefs = action.payload;
    },
    markSynced(state) {
      state.isSynced = true;
    },
    markOnboardingComplete(state) {
      state.hasCompletedOnboarding = true;
    },
    resetDraft(state) {
      // Preserve hasCompletedOnboarding across a reset — resetDraft() runs right after a
      // successful sync, which is exactly when this flag must NOT be wiped back to false.
      return { ...initialState, hasCompletedOnboarding: state.hasCompletedOnboarding };
    },
  },
  extraReducers: (builder) => {
    builder
      // Successfully authenticating at all — via register (which in this app's flow
      // always follows the full onboarding chain) or login (an existing account,
      // possibly on a fresh device) — means this device never needs to show the
      // pre-auth onboarding carousel/interest-selection UI again.
      .addMatcher(authApi.endpoints.register.matchFulfilled, (state) => {
        state.hasCompletedOnboarding = true;
      })
      .addMatcher(authApi.endpoints.login.matchFulfilled, (state) => {
        state.hasCompletedOnboarding = true;
      });
  },
});

export const {
  setInterests,
  setLocation,
  setManualCity,
  setNotificationPrefs,
  markSynced,
  markOnboardingComplete,
  resetDraft,
} = onboardingDraftSlice.actions;

export default onboardingDraftSlice.reducer;
