import { Middleware } from '@reduxjs/toolkit';
import { logout } from '../slices/authSlice';
import { eventsApi } from '../services/eventsApi';
import { authApi } from '../services/authApi';
import { userApi } from '../services/userApi';
import { paymentsApi } from '../services/paymentsApi';
import { notificationsApi } from '../services/notificationsApi';
import { organizerApi } from '../services/organizerApi';

// dispatch(logout()) only ever clears `auth` state — every RTK Query slice's cache
// (enrollments, favorites, current user, notifications...) survives untouched. On a
// shared device, a second user logging in right after would be served the first user's
// cached data instantly on mount, before any refetch. This is the single choke point
// for logout regardless of which screen/middleware dispatches it (SettingsScreen,
// AdminRedirectScreen, or authErrorMiddleware's 401 handler).
export const clearApiCacheOnLogout: Middleware = (storeApi) => (next) => (action) => {
  const result = next(action);
  if (logout.match(action)) {
    [eventsApi, authApi, userApi, paymentsApi, notificationsApi, organizerApi].forEach((api) => {
      storeApi.dispatch(api.util.resetApiState());
    });
  }
  return result;
};
