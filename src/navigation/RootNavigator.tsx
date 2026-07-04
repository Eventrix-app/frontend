import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import EventDetailsScreen from '../Pages/main/EventDetailsScreen';
import CheckoutScreen from '../Pages/main/CheckoutScreen';
import PaymentConfirmationScreen from '../Pages/main/PaymentConfirmationScreen';
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

const Stack = createNativeStackNavigator<RootStackParamList>();

const RootNavigator = () => {
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const isAdmin = isAuthenticated && user?.role?.toLowerCase() === 'admin';

  return (
    <NavigationContainer>
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
        <Stack.Screen name="Checkout" component={CheckoutScreen} />
        <Stack.Screen name="PaymentConfirmation" component={PaymentConfirmationScreen} />
        <Stack.Screen name="TicketDetails" component={TicketDetailsScreen} />
        <Stack.Screen name="Search" component={SearchScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="SavedEvents" component={SavedEventsScreen} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="ErrorNoInternet" component={ErrorNoInternetScreen} />
        <Stack.Screen name="ErrorGeneric" component={ErrorGenericScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default RootNavigator;
