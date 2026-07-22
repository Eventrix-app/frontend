import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { useFonts } from 'expo-font';
import {
  ZalandoSansExpanded_200ExtraLight,
  ZalandoSansExpanded_300Light,
  ZalandoSansExpanded_400Regular,
  ZalandoSansExpanded_500Medium,
  ZalandoSansExpanded_600SemiBold,
  ZalandoSansExpanded_700Bold,
  ZalandoSansExpanded_800ExtraBold,
  ZalandoSansExpanded_900Black,
} from '@expo-google-fonts/zalando-sans-expanded';
import {
  Poppins_200ExtraLight,
  Poppins_300Light,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  Poppins_800ExtraBold,
  Poppins_900Black,
} from '@expo-google-fonts/poppins';
import { store, persistor } from './src/store';
import { AppDispatch, RootState } from './src/store';
import RootNavigator from './src/navigation/RootNavigator';
import NetworkGate from './src/components/common/NetworkGate';
import { syncOnboardingDraft } from './src/utils/syncOnboardingDraft';
import { registerForPushNotifications } from './src/utils/registerForPushNotifications';
import { useRefreshMutation } from './src/store/services/authApi';
import ErrorBoundary from './src/components/common/ErrorBoundary';
import ServerGate from './src/components/common/ServerGate';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';

// Keep the native splash screen up until Redux persist rehydration (handled by
// PersistGate below), these font files, and — for the logged-out flow — the intro video
// are all ready. See SplashGate and SplashScreen.tsx (the video screen) for the two
// places that actually call hideAsync().
SplashScreen.preventAutoHideAsync().catch(() => {});

// Governs how a push is presented while the app is in the foreground — without this,
// Expo's default is to suppress the OS alert/sound entirely while the app is open. The
// actual "show a banner / update the list" behavior for a foreground push lives in
// RootNavigator's notification listeners, which is where navigation + the notifications
// cache are both reachable.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Only the logged-out flow (AuthNavigator) mounts the video Splash screen, which hides
// the native splash itself once the video reports readyToPlay (see SplashScreen.tsx) —
// that hand-off is deliberately deferred so there's no blank flash between the native
// splash and the video's first frame. Authenticated/admin users skip straight to
// Main/AdminRedirect and never mount that screen, so hide the native splash here
// instead, mirroring RootNavigator's own isAdmin/isAuthenticated routing decision.
function SplashGate() {
  const { isAuthenticated, user } = useSelector((s: RootState) => s.auth);
  const isAdmin = isAuthenticated && (user?.roles ?? []).includes('admin');

  useEffect(() => {
    if (isAdmin || isAuthenticated) {
      SplashScreen.hideAsync().catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

// "auto" would follow the OS color scheme, not the app's own theme choice — once a user
// manually toggles dark mode (ThemeContext persists that override independent of the OS
// setting, see ThemeContext.tsx), the status bar needs to track that choice instead.
function ThemedStatusBar() {
  const { theme } = useTheme();
  return <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />;
}

function AppStateSync() {
  const dispatch = useDispatch<AppDispatch>();
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);
  const isSynced = useSelector((s: RootState) => s.onboardingDraft.isSynced);
  const appState = useRef(AppState.currentState);
  const [refresh] = useRefreshMutation();

  // Extends the session on launch (covers: app was killed while logged in and reopened
  // later) — if the persisted token already expired (2+ days unused), this 401s and
  // authErrorMiddleware turns that into an automatic logout; no manual error handling
  // needed here. Also re-registers for push here — LoginScreen/RegisterScreen cover the
  // fresh-login case, this covers "already logged in, app relaunched" (Expo push tokens
  // can change across app reinstalls/updates, so this isn't a one-time-ever registration).
  useEffect(() => {
    if (isAuthenticated) {
      refresh();
      registerForPushNotifications(dispatch);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      const comingToForeground =
        appState.current.match(/inactive|background/) && next === 'active';
      appState.current = next;

      if (comingToForeground && isAuthenticated) {
        // Same sliding-session refresh as on launch, triggered on every foreground so a
        // daily-active user's session never expires; only 2+ days of not opening the app
        // at all lets the token actually lapse.
        refresh();
        if (!isSynced) {
          syncOnboardingDraft(dispatch, store.getState);
        }
      }
    });
    return () => sub.remove();
  }, [isAuthenticated, isSynced, dispatch, refresh]);

  return null;
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    ZalandoSansExpanded_200ExtraLight,
    ZalandoSansExpanded_300Light,
    ZalandoSansExpanded_400Regular,
    ZalandoSansExpanded_500Medium,
    ZalandoSansExpanded_600SemiBold,
    ZalandoSansExpanded_700Bold,
    ZalandoSansExpanded_800ExtraBold,
    ZalandoSansExpanded_900Black,
    Poppins_200ExtraLight,
    Poppins_300Light,
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_800ExtraBold,
    Poppins_900Black,
  });

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <ThemeProvider>
            <BottomSheetModalProvider>
              <SafeAreaProvider>
                <SplashGate />
                <AppStateSync />
                <NetworkGate>
                   <ServerGate>
                    <ErrorBoundary>
                      <RootNavigator />
                    </ErrorBoundary>
                   </ServerGate>
                </NetworkGate>
                <ThemedStatusBar />
              </SafeAreaProvider>
            </BottomSheetModalProvider>
          </ThemeProvider>
        </GestureHandlerRootView>
      </PersistGate>
    </Provider>
  );
}
