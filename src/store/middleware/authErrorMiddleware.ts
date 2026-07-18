import { isRejectedWithValue, Middleware } from '@reduxjs/toolkit';
import { logout } from '../slices/authSlice';

// Catches a 401 from *any* RTK Query slice (events/user/payments/notifications/auth APIs)
// and forces a logout — the single place that turns "the backend just rejected this token"
// into "the user is logged out locally". Complements the proactive refresh-on-foreground
// call (see AppStateSync in App.tsx): that call keeps an active session's token from
// expiring, this middleware is the fallback for whenever an expired/invalid token slips
// through anyway (e.g. the app was left open uninterrupted since before the 2-day cutoff).
export const authErrorMiddleware: Middleware = (storeApi) => (next) => (action) => {
  if (isRejectedWithValue(action) && (action.payload as { status?: number } | undefined)?.status === 401) {
    storeApi.dispatch(logout());
  }
  return next(action);
};
