import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { store, persistor } from './src/store';
import { AppDispatch, RootState } from './src/store';
import RootNavigator from './src/navigation/RootNavigator';
import { syncOnboardingDraft } from './src/utils/syncOnboardingDraft';

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
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <BottomSheetModalProvider>
            <SafeAreaProvider>
              <AppStateSync />
              <RootNavigator />
              <StatusBar style="auto" />
            </SafeAreaProvider>
          </BottomSheetModalProvider>
        </GestureHandlerRootView>
      </PersistGate>
    </Provider>
  );
}
