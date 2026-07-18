import React, { useEffect, useRef } from 'react';
import { NavigationContainer, NavigationState, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import { setCurrentScreen } from '../store/slices/uiSlice';
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
import ManageTicketTypesScreen from '../Pages/main/ManageTicketTypesScreen';
import CheckInScreen from '../Pages/main/CheckInScreen';
import { useForegroundSyncRetry } from '../hooks/useForegroundSyncRetry';
import { useCheckInSyncRetry } from '../hooks/useCheckInSyncRetry';

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
        <Stack.Screen name="ManageTicketTypes" component={ManageTicketTypesScreen} />
        <Stack.Screen name="CheckIn" component={CheckInScreen} />
        <Stack.Screen name="ErrorNoInternet" component={ErrorNoInternetScreen} />
        <Stack.Screen name="ErrorGeneric" component={ErrorGenericScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default RootNavigator;
