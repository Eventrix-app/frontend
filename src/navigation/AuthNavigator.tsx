import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthStackParamList } from './types';
import SplashScreen from '../Pages/splashscreen/SplashScreen';
import OnboardingScreen from '../Pages/onboardscreen/OnboardingScreen';
import RoleSelectionScreen from '../Pages/roleselection/RoleSelectionScreen';
import InterestSelectionScreen from '../Pages/interestselection/InterestSelectionScreen';
import LocationAccessScreen from '../Pages/personalization-modules/LocationAccessScreen';
import NotificationPreferencesScreen from '../Pages//personalization-modules/NotificationPreferencesScreen';
import LoginScreen from '../Pages/authenticationscreens/LoginScreen';
import RegisterScreen from '../Pages/authenticationscreens/RegisterScreen';
import ForgotPasswordScreen from '../Pages/authenticationscreens/ForgotPasswordScreen';
import UpdatePasswordScreen from '../Pages/authenticationscreens/UpdatePasswordScreen';

const Stack = createNativeStackNavigator<AuthStackParamList>();

const AuthNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
      initialRouteName="Splash"
    >
      <Stack.Screen name="Splash" component={SplashScreen} options={{ animation: 'none' }} />
      <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ animation: 'none' }} />
      <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} options={{ animation: 'none' }} />
      <Stack.Screen name="InterestSelection" component={InterestSelectionScreen} />
      <Stack.Screen name="LocationAccess" component={LocationAccessScreen} />
      <Stack.Screen name="NotificationPreferences" component={NotificationPreferencesScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="UpdatePassword" component={UpdatePasswordScreen} />
    </Stack.Navigator>
  );
};

export default AuthNavigator;
