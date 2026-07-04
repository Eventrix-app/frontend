export type RootStackParamList = {
  Auth: undefined;
  Main: { screen?: keyof MainTabParamList } | undefined;
  AdminRedirect: undefined;
  EventDetails: { eventId: string };
  Checkout: { eventId: string };
  PaymentConfirmation: { eventId: string; quantity?: number; total?: string };
  TicketDetails: { bookingId: string };
  Search: undefined;
  Profile: undefined;
  EditProfile: undefined;
  Settings: undefined;
  SavedEvents: undefined;
  Notifications: undefined;
  ErrorNoInternet: undefined;
  ErrorGeneric: undefined;
};

export type AuthStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  RoleSelection: undefined;
  InterestSelection: undefined;
  LocationAccess: undefined;
  NotificationPreferences: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  UpdatePassword: { email: string };
};

export type MainTabParamList = {
  Home: undefined;
  Explore: undefined;
  Shorts: undefined;
  Bookings: undefined;
};
