import React, { useEffect, useRef } from 'react';
import { NavigationContainer, NavigationState, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Notifications from 'expo-notifications';
import { RootStackParamList } from './types';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import { setCurrentScreen } from '../store/slices/uiSlice';
import { notificationsApi } from '../store/services/notificationsApi';
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import EventDetailsScreen from '../Pages/main/EventDetailsScreen';
import TicketDetailsScreen from '../Pages/main/TicketDetailsScreen';
import SearchScreen from '../Pages/main/SearchScreen';
import ProfileScreen from '../Pages/main/ProfileScreen';
import EditProfileScreen from '../Pages/main/EditProfileScreen';
import SettingsScreen from '../Pages/main/SettingsScreen';
import SavedEventsScreen from '../Pages/main/SavedEventsScreen';
import NotificationsScreen from '../Pages/main/NotificationsScreen';
import AdminRedirectScreen from '../Pages/authenticationscreens/AdminRedirectScreen';
import ErrorNoInternetScreen from '../Pages/screens/ErrorNoInternetScreen';
import ErrorGenericScreen from '../Pages/screens/ErrorGenericScreen';
import MyEventsScreen from '../Pages/main/MyEventsScreen';
import CreateEventScreen from '../Pages/main/CreateEventScreen';
import OrganizerVerificationScreen from '../Pages/main/OrganizerVerificationScreen';
import ManageTicketTypesScreen from '../Pages/main/ManageTicketTypesScreen';
import CheckInScreen from '../Pages/main/CheckInScreen';
import RefundApprovalScreen from '../Pages/main/RefundApprovalScreen';
import { useForegroundSyncRetry } from '../hooks/useForegroundSyncRetry';
import { useCheckInSyncRetry } from '../hooks/useCheckInSyncRetry';
import { showAlert } from '../utils/crossPlatformAlert';

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
  if ((type === 'event_changed' || type === 'announcement') && typeof data?.eventId === 'string') {
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

  // Cold start: the app was launched by tapping a notification (not already running) —
  // checked once, here, at the true app root. Warm: the app was already running
  // (foreground or backgrounded) when the notification was tapped. Either way, deep-link
  // using the push's own data payload rather than round-tripping through GET /notifications.
  useEffect(() => {
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return;
      if (navigationRef.current) {
        navigateForPushData(navigationRef.current, response.notification.request.content.data as Record<string, unknown>);
      }
      // Without this, Expo keeps returning the same "last tapped" response on every
      // subsequent cold start (not just the one that followed the actual tap), which
      // would otherwise re-trigger this navigation on every future app launch.
      Notifications.clearLastNotificationResponseAsync().catch(() => {});
    });

    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      if (navigationRef.current) {
        navigateForPushData(navigationRef.current, response.notification.request.content.data as Record<string, unknown>);
      }
    });

    // A push arrived while the app is in the foreground — refresh the in-app notifications
    // list so it shows up without the user needing to reopen the screen.
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
        <Stack.Screen name="Search" component={SearchScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="SavedEvents" component={SavedEventsScreen} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="MyEvents" component={MyEventsScreen} />
        <Stack.Screen name="CreateEvent" component={CreateEventScreen} />
        <Stack.Screen name="OrganizerVerification" component={OrganizerVerificationScreen} />
        <Stack.Screen name="ManageTicketTypes" component={ManageTicketTypesScreen} />
        <Stack.Screen name="CheckIn" component={CheckInScreen} />
        <Stack.Screen name="RefundApproval" component={RefundApprovalScreen} />
        <Stack.Screen name="OrganizerProfile" component={ProfileScreen} />
        <Stack.Screen name="ErrorNoInternet" component={ErrorNoInternetScreen} />
        <Stack.Screen name="ErrorGeneric" component={ErrorGenericScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default RootNavigator;
