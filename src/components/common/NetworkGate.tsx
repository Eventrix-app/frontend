import React, { useCallback, useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useSelector } from 'react-redux';
import OfflineScreen from './OfflineScreen';
import type { RootState } from '../../store';

interface Props {
  children: React.ReactNode;
}

// Screens that must stay reachable with zero connectivity — blocking them behind a
// full-screen offline gate would defeat the whole point of their offline-first design
// (CheckIn caches attendees locally and queues scans to sync later).
const GATE_EXEMPT_SCREENS = new Set(['CheckIn']);

const NetworkGate: React.FC<Props> = ({ children }) => {
  const [isOffline, setIsOffline] = useState(false);
  const currentScreen = useSelector((state: RootState) => state.ui.currentScreen);
  const isExempt = GATE_EXEMPT_SCREENS.has(currentScreen);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      console.log('NetInfo state:', state.isConnected, state.isInternetReachable);
      const offline = state.isConnected === false || state.isInternetReachable === false;
      setIsOffline(offline);
    });
    return () => unsubscribe();
  }, []);

  const handleRetry = useCallback(async () => {
    const state = await NetInfo.fetch();
    setIsOffline(state.isConnected === false || state.isInternetReachable === false);
  }, []);

  if (isOffline && !isExempt) {
    return <OfflineScreen onRetry={handleRetry} />;
  }

  return <>{children}</>;
};

export default NetworkGate;