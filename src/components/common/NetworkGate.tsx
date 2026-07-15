import React, { useCallback, useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import OfflineScreen from './OfflineScreen';

interface Props {
  children: React.ReactNode;
}

const NetworkGate: React.FC<Props> = ({ children }) => {
  const [isOffline, setIsOffline] = useState(false);

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

  if (isOffline) {
    return <OfflineScreen onRetry={handleRetry} />;
  }

  return <>{children}</>;
};

export default NetworkGate;