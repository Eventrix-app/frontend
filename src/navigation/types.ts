import type { UploadContentType } from '../store/services/eventsApi';
import type { ShortOverlay } from '../store/services/shortsApi';

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
  // Tax invoice for a settled booking. Takes the enrollment id under its real name (unlike
  // TicketDetails' legacy `bookingId` alias) since that is exactly what
  // GET /payments/invoice/:enrollmentId expects. Only reachable from a paid booking —
  // the endpoint 400s on anything still pending.
  InvoiceDetail: { enrollmentId: string };
  Search: { categoryId?: string } | undefined;
  Profile: undefined;
  EditProfile: undefined;
  Settings: undefined;
  VerifyEmail: { reason?: string } | undefined;
  HelpCenter: undefined;
  LegalDocument: { doc: LegalDocumentKey };
  ActiveSessions: undefined;
  BlockedUsers: undefined;
  SavedEvents: undefined;
  Notifications: undefined;
  MyEvents: undefined;
  CreateEvent: { eventId?: string };
  OrganizerVerification: undefined;
  VerificationSubmitted: undefined;
  ManageTicketTypes: { eventId: string };
  CheckIn: { eventId: string };
  RefundApproval: undefined;
  Checkout: { eventId: string; ticketTypeId: string; quantity: number };
  OrganizerProfile: { organizerId: string };
  // Another user's public profile — their name, avatar and reels. Distinct from
  // OrganizerProfile, which needs an organizer record most reel uploaders do not have.
  UserProfile: { userId: string };
  // Reel creation flow: RecordReel (capture or pick) -> EditReel (text overlay) ->
  // ShareReel (caption + upload). Each step carries the media forward rather than holding it
  // in a store, so backing out of the flow leaves nothing behind to clean up.
  //
  // `contentType` is threaded through explicitly instead of being re-derived at upload time:
  // a gallery pick reports its own asset.mimeType, whereas expo-camera's recordAsync() only
  // returns a { uri } and iOS records .mov (QuickTime), not .mp4. Guessing 'video/mp4' at the
  // end would send a Content-Type inconsistent with the actual bytes, and Supabase Storage
  // enforces the bucket's allowedMimeTypes.
  RecordReel: { eventId: string };
  EditReel: {
    eventId: string;
    mediaUri: string;
    mediaType: 'video';
    contentType: UploadContentType;
  };
  ShareReel: {
    eventId: string;
    mediaUri: string;
    mediaType: 'video';
    contentType: UploadContentType;
    // Text the user added on EditReel, used to seed the caption — which is what makes a
    // reel readable in a list and searchable.
    overlayText?: string;
    // The same text as a full composition: colour, face, size and placement, with every
    // geometric value stored as a ratio of the video's rendered size so it lands correctly
    // on any device. Persisted with the reel and drawn back over the video by the Shorts
    // feed. Still not burned into the video file — that needs server-side compositing.
    overlay?: ShortOverlay;
  };
  
  ErrorNoInternet: undefined;
  ErrorGeneric: undefined;
};

export type AuthStackParamList = {
  Splash: undefined;
  CompleteProfile: undefined;
  Onboarding: undefined;
  InterestSelection: undefined;
  LocationAccess: undefined;
  NotificationPreferences: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  UpdatePassword: { email: string };
};

// MyEvents is NOT a tab — MainNavigator only registers Home/Explore/Shorts/Bookings.
// It's a separate top-level RootStackParamList screen (see above), reached by pushing
// onto the root stack, not by tab-switching within Main. A phantom `MyEvents: undefined`
// entry here previously type-checked `navigate('Main', { screen: 'MyEvents' })` as valid
// even though react-navigation has no matching registered route for it.
export type MainTabParamList = {
  Home: undefined;
  Explore: undefined;
  Shorts: undefined;
  Bookings: undefined;
};
