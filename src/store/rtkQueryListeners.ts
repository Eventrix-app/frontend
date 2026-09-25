import type { ThunkDispatch, UnknownAction } from '@reduxjs/toolkit';
import NetInfo from '@react-native-community/netinfo';
import { AppState, type AppStateStatus } from 'react-native';

type SetupListenersActions = {
  onFocus: () => UnknownAction;
  onFocusLost: () => UnknownAction;
  onOnline: () => UnknownAction;
  onOffline: () => UnknownAction;
};

/**
 * Bridges RTK Query's focus/online signals to React Native's lifecycle.
 *
 * `setupListeners(dispatch)` with no second argument installs RTK Query's default handler,
 * which subscribes to `window`'s visibilitychange/focus/online/offline events. React Native
 * has no such events — `window.addEventListener` is not implemented — so the default handler
 * attaches nothing and RTK Query never learns the app was foregrounded or reconnected.
 *
 * The practical effect is that `refetchOnFocus` and `refetchOnReconnect` are inert on native:
 * an endpoint can declare them and still never revalidate. Passing this handler instead is
 * what makes those flags mean anything here.
 *
 * Deliberately reuses the two subscriptions the app already depends on elsewhere (AppState in
 * App.tsx's AppStateSync, NetInfo in NetworkGate) rather than introducing a third mechanism.
 */
export function setupNativeListeners(
  dispatch: ThunkDispatch<any, any, UnknownAction>,
  { onFocus, onFocusLost, onOnline, onOffline }: SetupListenersActions,
): () => void {
  const appStateSub = AppState.addEventListener('change', (next: AppStateStatus) => {
    // 'inactive' is a transient iOS state (app switcher, incoming call overlay) that is not
    // a real background — treating it as focus-lost would fire a spurious refetch the moment
    // the user dismisses the switcher without ever leaving the app.
    if (next === 'active') {
      dispatch(onFocus());
    } else if (next === 'background') {
      dispatch(onFocusLost());
    }
  });

  const netInfoUnsub = NetInfo.addEventListener((state) => {
    // isInternetReachable is null while NetInfo is still probing. Only isConnected is known
    // then, so treat null as "assume reachable" rather than reporting a false offline that
    // would suppress refetches on a working connection.
    const online = !!state.isConnected && state.isInternetReachable !== false;
    dispatch(online ? onOnline() : onOffline());
  });

  return () => {
    appStateSub.remove();
    netInfoUnsub();
  };
}
