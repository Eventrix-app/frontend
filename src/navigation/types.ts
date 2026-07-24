// Kept in sync with the DOCUMENTS map in Pages/main/LegalDocumentScreen.tsx.
export type LegalDocumentKey =
  | 'privacy'
  | 'terms'
  | 'refund'
  | 'cookies'
  | 'community'
  | 'dataRetention'
  | 'security'
  | 'payment'
  | 'accountDeletion'
  | 'grievance';

export type RootStackParamList = {
  Auth: undefined;
  Main: { screen?: keyof MainTabParamList } | undefined;
  AdminRedirect: undefined;
  EventDetails: { eventId: string };
  TicketDetails: { bookingId: string };
  Search: { category?: string } | undefined;
  Profile: undefined;
  EditProfile: undefined;
  Settings: undefined;
  VerifyEmail: undefined;
  HelpCenter: undefined;
  LegalDocument: { doc: LegalDocumentKey };
  ActiveSessions: undefined;
  BlockedUsers: undefined;
  SavedEvents: undefined;
  Notifications: undefined;
  MyEvents: undefined;
  CreateEvent: { eventId?: string };
  OrganizerVerification: undefined;
  ManageTicketTypes: { eventId: string };
  CheckIn: { eventId: string };
  RefundApproval: undefined;
  OrganizerProfile: { organizerId: string };
  ErrorNoInternet: undefined;
  ErrorGeneric: undefined;
};

export type AuthStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
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
  MyEvents: undefined;
  Bookings: undefined;
};
