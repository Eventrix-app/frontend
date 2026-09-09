import { createSlice } from '@reduxjs/toolkit';
import { authApi } from '../services/authApi';

interface User {
  id: string;
  email: string;
  full_name: string;
  roles: string[];
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.error = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addMatcher(authApi.endpoints.login.matchFulfilled, (state, { payload }) => {
        state.user = { id: payload.id, email: payload.email, full_name: payload.full_name, roles: payload.roles };
        state.token = payload.accessToken;
        state.isAuthenticated = true;
        state.isLoading = false;
        state.error = null;
      })
      .addMatcher(authApi.endpoints.login.matchPending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addMatcher(authApi.endpoints.login.matchRejected, (state, { error }) => {
        state.isLoading = false;
        state.error = error.message ?? 'Login failed';
      })
      .addMatcher(authApi.endpoints.register.matchFulfilled, (state, { payload }) => {
        state.user = { id: payload.id, email: payload.email, full_name: payload.full_name, roles: payload.roles };
        state.token = payload.accessToken;
        state.isAuthenticated = true;
        state.isLoading = false;
        state.error = null;
      })
      .addMatcher(authApi.endpoints.socialLogin.matchFulfilled, (state, { payload }) => {
        state.user = { id: payload.id, email: payload.email, full_name: payload.full_name, roles: payload.roles };
        state.token = payload.accessToken;
        state.isAuthenticated = true;
        state.isLoading = false;
        state.error = null;
      })
      .addMatcher(authApi.endpoints.refresh.matchFulfilled, (state, { payload }) => {
        // refresh() is fired-and-forgotten from AppStateSync (on launch/foreground) with no
        // await at the call site, so it can still be in flight when the user explicitly logs
        // out. Without this guard, a refresh that resolves after logout() has already run
        // would blindly repopulate user/token and flip isAuthenticated back to true,
        // resurrecting a session the user just ended.
        if (!state.isAuthenticated) return;
        state.user = { id: payload.id, email: payload.email, full_name: payload.full_name, roles: payload.roles };
        state.token = payload.accessToken;
        state.isAuthenticated = true;
      });
  },
});

export const { logout, clearError } = authSlice.actions;

export default authSlice.reducer;
