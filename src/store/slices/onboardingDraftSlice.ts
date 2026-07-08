import { createSlice, PayloadAction } from '@reduxjs/toolkit';

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
}

const initialState: OnboardingDraftState = {
  categoryIds: [],
  latitude: null,
  longitude: null,
  manualCity: null,
  notificationPrefs: null,
  isSynced: false,
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
    resetDraft() {
      return initialState;
    },
  },
});

export const {
  setInterests,
  setLocation,
  setManualCity,
  setNotificationPrefs,
  markSynced,
  resetDraft,
} = onboardingDraftSlice.actions;

export default onboardingDraftSlice.reducer;
