import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

interface UIState {
  isLoading: boolean;
  isRefreshing: boolean;
  bottomTabBarVisible: boolean;
  currentScreen: string;
  notificationCount: number;
}

const initialState: UIState = {
  isLoading: false,
  isRefreshing: false,
  bottomTabBarVisible: true,
  currentScreen: '',
  notificationCount: 0,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setRefreshing: (state, action: PayloadAction<boolean>) => {
      state.isRefreshing = action.payload;
    },
    setBottomTabBarVisible: (state, action: PayloadAction<boolean>) => {
      state.bottomTabBarVisible = action.payload;
    },
    setCurrentScreen: (state, action: PayloadAction<string>) => {
      state.currentScreen = action.payload;
    },
    incrementNotificationCount: (state) => {
      state.notificationCount += 1;
    },
    decrementNotificationCount: (state) => {
      state.notificationCount = Math.max(0, state.notificationCount - 1);
    },
    clearNotifications: (state) => {
      state.notificationCount = 0;
    },
  },
});

export const {
  setLoading,
  setRefreshing,
  setBottomTabBarVisible,
  setCurrentScreen,
  incrementNotificationCount,
  decrementNotificationCount,
  clearNotifications,
} = uiSlice.actions;

export default uiSlice.reducer;
