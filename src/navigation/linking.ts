import type { LinkingOptions } from '@react-navigation/native';
import { RootStackParamList } from './types';

// Deep-link routing — used by both real link taps (email CTAs, eventrix://... URLs) and
// React Navigation's own linking prop on NavigationContainer. Deliberately mirrors
// navigateForPushData in RootNavigator.tsx: an event-cancelled email and an
// event-cancelled push notification should land on the same screen for the same reason.
//
// Only wires the screens email templates actually need to link to (event details, a
// booking's ticket, the notifications list, and the Bookings tab) rather than exposing
// every screen in the app as a deep-linkable path — most screens (Settings, Edit Profile,
// admin tooling) have no legitimate external entry point and shouldn't be reachable via a
// bare URL.
export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['eventrix://'],
  config: {
    screens: {
      EventDetails: 'event/:eventId',
      TicketDetails: 'booking/:bookingId',
      Notifications: 'notifications',
      // RootStackParamList types `Main`'s param as `{ screen?: keyof MainTabParamList }`
      // rather than React Navigation's `NavigatorScreenParams<MainTabParamList>` helper, so
      // TS can't automatically recognize it as a nested navigator here — same reason several
      // `navigation.navigate('Main', ...)` call sites elsewhere in this app already cast
      // with `as never`. The runtime behavior (matching by screen name into the nested Tab
      // navigator) is unaffected by this cast.
      Main: {
        screens: {
          Home: 'home',
          Explore: 'explore',
          Bookings: 'bookings',
        },
      } as object,
      // Everything else (Auth, Settings, admin screens, etc.) is intentionally left
      // unmapped — a URL that doesn't match falls through to the app's normal initial
      // route (see RootNavigator's initialRouteName), not a broken/blank screen.
    },
  },
};
