import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import ErrorScreen from './ErrorScreen';
import type { RootState } from '../../store';

// Was hardcoded to localhost, so this health check always reported the server as
// unreachable in any non-local build. Read the same source of truth as baseQuery.ts.
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api/';
const CHECK_INTERVAL = 10000; // re-check every 10s while down

// Same rationale as NetworkGate's exemption set: CheckIn must stay usable even when the
// backend is briefly unreachable, since it caches attendees locally and queues scans.
const GATE_EXEMPT_SCREENS = new Set(['CheckIn']);

const ServerGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isServerDown, setIsServerDown] = useState(false);
  const currentScreen = useSelector((state: RootState) => state.ui.currentScreen);
  const isExempt = GATE_EXEMPT_SCREENS.has(currentScreen);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkServer = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(API_BASE_URL, { signal: controller.signal });
      clearTimeout(timeout);
      setIsServerDown(!res.ok && res.status >= 500);
    } catch {
      // network error / connection refused / timeout — server is unreachable
      setIsServerDown(true);
    }
  }, []);

  useEffect(() => {
    checkServer();
  }, [checkServer]);

  useEffect(() => {
    if (isServerDown) {
      intervalRef.current = setInterval(checkServer, CHECK_INTERVAL);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isServerDown, checkServer]);

  if (isServerDown && !isExempt) {
    return (
      <ErrorScreen
        onBack={checkServer}
        onGoHome={checkServer}
        title="Oops, something went wrong"
        subtitle="We can't reach our servers right now."
      />
    );
  }

  return <>{children}</>;
};

export default ServerGate;