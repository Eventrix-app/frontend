import React, { useEffect, useMemo, useRef } from 'react';
import { DarkTheme, DefaultTheme, NavigationContainer, NavigationState, NavigationContainerRef, Theme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Notifications from 'expo-notifications';
import { RootStackParamList } from './types';
import { linking } from './linking';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import { setCurrentScreen } from '../store/slices/uiSlice';
import { notificationsApi } from '../store/services/notificationsApi';
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import EventDetailsScreen from '../Pages/main/EventDetailsScreen';
import TicketDetailsScreen from '../Pages/main/TicketDetailsScreen';
import InvoiceDetailScreen from '../Pages/main/InvoiceDetailScreen';
import SearchScreen from '../Pages/main/SearchScreen';
import ProfileScreen from '../Pages/main/ProfileScreen';
import EditProfileScreen from '../Pages/main/EditProfileScreen';
import SettingsScreen from '../Pages/main/SettingsScreen';
import VerifyEmailScreen from '../Pages/main/VerifyEmailScreen';
import HelpCenterScreen from '../Pages/main/HelpCenterScreen';
import LegalDocumentScreen from '../Pages/main/LegalDocumentScreen';
import ActiveSessionsScreen from '../Pages/main/ActiveSessionsScreen';
import BlockedUsersScreen from '../Pages/main/BlockedUsersScreen';
import SavedEventsScreen from '../Pages/main/SavedEventsScreen';
import NotificationsScreen from '../Pages/main/NotificationsScreen';
import AdminRedirectScreen from '../Pages/authenticationscreens/AdminRedirectScreen';
import ErrorNoInternetScreen from '../Pages/screens/ErrorNoInternetScreen';
import ErrorGenericScreen from '../Pages/screens/ErrorGenericScreen';
import MyEventsScreen from '../Pages/main/MyEventsScreen';
import CreateEventScreen from '../Pages/main/CreateEventScreen';
import OrganizerVerificationScreen from '../Pages/main/OrganizerVerificationScreen';
import VerificationSubmittedScreen from '../Pages/main/VerificationSubmittedScreen';
import PayoutBankAccountScreen from '../Pages/main/PayoutBankAccountScreen';
import PayoutHistoryScreen from '../Pages/main/PayoutHistoryScreen';
import ManageTicketTypesScreen from '../Pages/main/ManageTicketTypesScreen';
import CheckInScreen from '../Pages/main/CheckInScreen';
import RefundApprovalScreen from '../Pages/main/RefundApprovalScreen';
import RecordReelScreen from '../Pages/main/RecordReelScreen';
import EditReelScreen from '../Pages/main/EditReelScreen';
import ShareReelScreen from '../Pages/main/ShareReelScreen';
import UserProfileScreen from '../Pages/main/UserProfileScreen';
import { useForegroundSyncRetry } from '../hooks/useForegroundSyncRetry';
import { useCheckInSyncRetry } from '../hooks/useCheckInSyncRetry';
import { showAlert } from '../utils/crossPlatformAlert';
import CheckoutScreen from '../Pages/main/CheckoutScreen'; 
import { REEL_UPLOAD_NOTIFICATION_TYPE } from '../utils/reelUploadManager';
import { useTheme } from '../theme/ThemeContext';

const Stack = createNativeStackNavigator<RootStackParamList>();

// Finds the deepest active route name, recursing through nested navigators (tabs inside
// "Main", etc.) — NetworkGate/ServerGate need this to know when CheckIn is on screen even
// though it's a plain top-level Stack.Screen today.
function getActiveRouteName(state: NavigationState | undefined): string | undefined {
  if (!state) return undefined;
  const route = state.routes[state.index];
  if (route.state) return getActiveRouteName(route.state as NavigationState);
  return route.name;
}

// Mirrors the payload shapes NotificationService actually enqueues (see
// notification.service.ts's notify* methods): event_changed carries {eventId},
// waitlist_promoted and refund_status both carry {enrollmentId} — TicketDetailsScreen
// needs a bookingId (= enrollmentId), not a refundId, so refund_status routes there too
// rather than only to the general Bookings list.
function navigateForPushData(
  navRef: NavigationContainerRef<RootStackParamList>,
  data: Record<string, unknown> | undefined,
): void {
  const type = data?.type;
  // Locally-posted reel upload progress/result, not a server push — it has no row in the
  // Notifications list, so the catch-all below would open an empty screen. Tapping it takes
  // the user to the Shorts feed, where the reel they just uploaded actually lives.
  if (type === REEL_UPLOAD_NOTIFICATION_TYPE) {
    navRef.navigate('Main', { screen: 'Shorts' });
    return;
  }
  // Someone liked one of your reels. Opens the Shorts tab — there is no single-reel route
  // to deep-link to yet, so this is the closest honest destination.
  if (type === 'short_liked') {
    navRef.navigate('Main', { screen: 'Shorts' });
    return;
  }
  if (
    (type === 'event_changed' || type === 'announcement' || type === 'event_approved' || type === 'event_rejected') &&
    typeof data?.eventId === 'string'
  ) {
    navRef.navigate('EventDetails', { eventId: data.eventId });
  } else if (
    (type === 'waitlist_promoted' || type === 'refund_status') &&
    typeof data?.enrollmentId === 'string'
  ) {
    navRef.navigate('TicketDetails', { bookingId: data.enrollmentId });
  } else if (type === 'organizer_followed') {
    navRef.navigate('Profile');
  } else if (type === 'organizer_verification_approved') {
    navRef.navigate('Main', { screen: 'Home' });
    showAlert("You're verified!", 'Your organizer verification was approved — you can now create and publish events.');
  } else if (type === 'organizer_verification_rejected') {
    navRef.navigate('Main', { screen: 'Home' });
    showAlert('Verification needs another look', typeof data?.reason === 'string' && data.reason ? String(data.reason) : undefined);
  } else {
    navRef.navigate('Notifications');
  }
}

const RootNavigator = () => {
  useForegroundSyncRetry();
  useCheckInSyncRetry();
  const dispatch = useDispatch<AppDispatch>();
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const isAdmin = isAuthenticated && (user?.roles ?? []).includes('admin');
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);
  const wasAuthenticated = useRef(isAuthenticated);
  // Always-current mirror of isAuthenticated used inside async callbacks and
  // event listeners (which close over the mount-time value and would otherwise
  // see a stale false even after the user has logged in).
  const isAuthenticatedRef = useRef(isAuthenticated);

  // Without this, NavigationContainer defaults to react-navigation's own DefaultTheme
  // (background #fff) regardless of our app's dark/light mode — its native-stack and
  // bottom-tabs internals paint screen/scene containers with that background, so it shows
  // through as a stray white sliver at screen edges (e.g. around the custom tab bar) any
  // time our own screen content doesn't pixel-perfectly cover the area. Mapping our
  // ThemeContext colors onto react-navigation's Theme keeps those internal backgrounds in
  // sync with the app's actual theme instead.
  const { theme: appTheme, colors: appColors } = useTheme();
  const navigationTheme = useMemo<Theme>(() => {
    const base = appTheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      dark: appTheme === 'dark',
      colors: {
        ...base.colors,
        primary: appColors.brandPink,
        background: appColors.background,
        card: appColors.white,
        text: appColors.text,
        border: appColors.border,
        notification: appColors.brandPink,
      },
    };
  }, [appTheme, appColors]);

  // Keep the ref in sync so async callbacks always see the current auth state.
  useEffect(() => {
    isAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated]);

  // initialRouteName below only applies on the Navigator's first mount — it does not
  // re-route on its own if isAuthenticated flips to false later (e.g. the 2-day inactivity
  // logout, or a live ban). Without this, a user logged out mid-session (anywhere other
  // than AdminRedirectScreen, which had the same gap) would be stuck on whatever screen
  // they were already on with no way back to the Auth stack short of a manual app restart.
  useEffect(() => {
    if (wasAuthenticated.current && !isAuthenticated) {
      navigationRef.current?.reset({ index: 0, routes: [{ name: 'Auth' }] });
    }
    wasAuthenticated.current = isAuthenticated;
  }, [isAuthenticated]);

  // Cold start: the app was launched by tapping a notification (not already running).
  // Warm: the app was already running when the notification was tapped.
  // In both cases, only navigate when the user is authenticated — a stale cold-start
  // notification must not route into authenticated screens after a fresh login.
  useEffect(() => {
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return;
      // Clear immediately so the same notification doesn't re-trigger on the next
      // cold start.
      Notifications.clearLastNotificationResponseAsync().catch(() => {});
      // Only navigate if already authenticated at the time this resolves.
      // If the user is mid-login (not yet authenticated), discard — we must not
      // push Notifications on top of Onboarding/Main after the login navigation
      // has already completed.
      if (isAuthenticatedRef.current && navigationRef.current) {
        navigateForPushData(navigationRef.current, response.notification.request.content.data as Record<string, unknown>);
      }
    });

    // Warm: only navigate when authenticated so a tapped notification can't
    // deep-link into authenticated screens while the user is on the Auth stack.
    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      if (navigationRef.current && isAuthenticatedRef.current) {
        navigateForPushData(navigationRef.current, response.notification.request.content.data as Record<string, unknown>);
      }
    });

    // A push arrived while the app is in the foreground — refresh the in-app
    // notifications list so it shows up without the user needing to reopen the screen.
    const receivedSub = Notifications.addNotificationReceivedListener(() => {
      dispatch(notificationsApi.util.invalidateTags(['Notifications']));
    });

    return () => {
      responseSub.remove();
      receivedSub.remove();
    };
  }, [dispatch]);

  return (
    <NavigationContainer
      ref={navigationRef}
      theme={navigationTheme}
      linking={linking}
      onStateChange={(state) => {
        const routeName = getActiveRouteName(state);
        if (routeName) dispatch(setCurrentScreen(routeName));
      }}
    >
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
        initialRouteName={isAdmin ? 'AdminRedirect' : (isAuthenticated ? 'Main' : 'Auth')}
      >
        <Stack.Screen name="Auth" component={AuthNavigator} />
        <Stack.Screen name="Main" component={MainNavigator} />
        <Stack.Screen name="AdminRedirect" component={AdminRedirectScreen} />
        <Stack.Screen name="EventDetails" component={EventDetailsScreen} />
        <Stack.Screen name="TicketDetails" component={TicketDetailsScreen} />
        <Stack.Screen name="InvoiceDetail" component={InvoiceDetailScreen} />
        <Stack.Screen name="Search" component={SearchScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
        <Stack.Screen name="Checkout" component={CheckoutScreen} />
        <Stack.Screen name="HelpCenter" component={HelpCenterScreen} />
        <Stack.Screen name="LegalDocument" component={LegalDocumentScreen} />
        <Stack.Screen name="ActiveSessions" component={ActiveSessionsScreen} />
        <Stack.Screen name="BlockedUsers" component={BlockedUsersScreen} />
        <Stack.Screen name="SavedEvents" component={SavedEventsScreen} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="UserProfile" component={UserProfileScreen} />
        <Stack.Screen name="MyEvents" component={MyEventsScreen} />
        <Stack.Screen name="CreateEvent" component={CreateEventScreen} />
        <Stack.Screen name="OrganizerVerification" component={OrganizerVerificationScreen} />
        <Stack.Screen name="VerificationSubmitted" component={VerificationSubmittedScreen} />
        <Stack.Screen name="PayoutBankAccount" component={PayoutBankAccountScreen} />
        <Stack.Screen name="PayoutHistory" component={PayoutHistoryScreen} />
        <Stack.Screen name="ManageTicketTypes" component={ManageTicketTypesScreen} />
        <Stack.Screen name="CheckIn" component={CheckInScreen} />
        <Stack.Screen name="RefundApproval" component={RefundApprovalScreen} />
        {/* Reel creation flow. Record and Edit are full-bleed black camera/preview surfaces,
            so they slide up as a modal group rather than pushing sideways like the rest of
            the stack — and Record replaces itself with Edit (navigation.replace) so the back
            gesture from Edit returns to wherever the flow was entered, not to the camera. */}
        <Stack.Screen
          name="RecordReel"
          component={RecordReelScreen}
          options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="EditReel"
          component={EditReelScreen}
          options={{ presentation: 'fullScreenModal' }}
        />
        <Stack.Screen name="ShareReel" component={ShareReelScreen} />
        <Stack.Screen name="OrganizerProfile" component={ProfileScreen} />
        <Stack.Screen name="ErrorNoInternet" component={ErrorNoInternetScreen} />
        <Stack.Screen name="ErrorGeneric" component={ErrorGenericScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default RootNavigator;
