import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
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
import ErrorBoundary from './src/components/common/ErrorBoundary';
import ServerGate from './src/components/common/ServerGate';

// Keep the native splash screen up until both the Redux persist rehydration (handled by
// PersistGate below) and these font files are ready, so no screen ever flashes with the
// system fallback font before Zalando Sans Expanded / Poppins are available.
SplashScreen.preventAutoHideAsync().catch(() => {});

function AppStateSync() {
  const dispatch = useDispatch<AppDispatch>();
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);
  const isSynced = useSelector((s: RootState) => s.onboardingDraft.isSynced);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      const comingToForeground =
        appState.current.match(/inactive|background/) && next === 'active';
      appState.current = next;

      if (comingToForeground && isAuthenticated && !isSynced) {
        syncOnboardingDraft(dispatch, store.getState);
      }
    });
    return () => sub.remove();
  }, [isAuthenticated, isSynced, dispatch]);

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

  useEffect(() => {
    // Don't block forever on a font-load failure (e.g. offline first install) — fall back
    // to the system font rather than leaving the app stuck behind the splash screen.
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <BottomSheetModalProvider>
            <SafeAreaProvider>
              <AppStateSync />
              <NetworkGate>
                 <ServerGate>
                  <ErrorBoundary>
                    <RootNavigator />
                  </ErrorBoundary>
                 </ServerGate>
              </NetworkGate>
              <StatusBar style="auto" />
            </SafeAreaProvider>
          </BottomSheetModalProvider>
        </GestureHandlerRootView>
      </PersistGate>
    </Provider>
  );
}
