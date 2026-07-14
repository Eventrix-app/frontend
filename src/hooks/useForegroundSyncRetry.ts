import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useSelector } from 'react-redux';
import { RootState, AppDispatch, store } from '../store';
import { syncOnboardingDraft } from '../utils/syncOnboardingDraft';
import { useDispatch } from 'react-redux';

/**
 * Retries the onboarding draft sync whenever the app returns to the foreground,
 * as long as the user is authenticated and the draft has not yet been synced.
 * Satisfies Section 1e: "Add retry on app foreground: if isAuthenticated && !draft.isSynced"
 */
export function useForegroundSyncRetry() {
  const dispatch = useDispatch<AppDispatch>();
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const isSynced = useSelector((state: RootState) => state.onboardingDraft.isSynced);

  const appState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      const comingToForeground =
        appState.current.match(/inactive|background/) && nextState === 'active';

      if (comingToForeground && isAuthenticated && !isSynced) {
        syncOnboardingDraft(dispatch, store.getState);
      }

      appState.current = nextState;
    });

    return () => subscription.remove();
  }, [dispatch, isAuthenticated, isSynced]);
}
