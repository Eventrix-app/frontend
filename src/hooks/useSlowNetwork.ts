import { useEffect, useState } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

export type SlowNetworkStage = 'none' | 'slow' | 'verySlow';

// Two escalating thresholds rather than one. The first is late enough that a normal fetch
// on a decent connection never trips it — showing "this is slow" during a 900ms load would
// teach users to distrust the message. The second one is where we stop just reassuring and
// offer a way out.
const SLOW_AFTER_MS = 4000;
const VERY_SLOW_AFTER_MS = 12000;

// When the radio itself reports 2G/3G we already know the answer, so there is no reason to
// spend four seconds discovering it — the notice appears almost immediately instead.
const WEAK_SLOW_AFTER_MS = 1200;
const WEAK_VERY_SLOW_AFTER_MS = 7000;

/**
 * True only when the connection is *known* to be slow.
 *
 * Deliberately conservative: Wi-Fi and 4G/5G report nothing useful about actual throughput,
 * so they are never labelled weak and fall back to the plain time-based thresholds. This
 * flag only shortens the delay, it never shows the notice on its own — a weak radio that
 * still returns data in 300ms should stay invisible to the user.
 */
function readIsWeak(state: NetInfoState): boolean {
  if (state.type !== 'cellular') return false;
  const generation = (state.details as { cellularGeneration?: string | null } | null)?.cellularGeneration;
  return generation === '2g' || generation === '3g';
}

// One NetInfo subscription shared by every hook instance. Several screens can be mounted at
// once (a tab navigator keeps them alive), and each registering its own native listener for
// the same global fact would be wasteful. Started lazily on first use and then left running,
// which matches NetworkGate — it already holds a subscription for the whole session.
let weakListeners: Set<(weak: boolean) => void> | null = null;
let latestIsWeak = false;

function subscribeToConnectionQuality(listener: (weak: boolean) => void): () => void {
  if (!weakListeners) {
    weakListeners = new Set();
    NetInfo.addEventListener((state) => {
      const next = readIsWeak(state);
      if (next === latestIsWeak) return;
      latestIsWeak = next;
      weakListeners?.forEach((l) => l(next));
    });
  }
  weakListeners.add(listener);
  return () => {
    weakListeners?.delete(listener);
  };
}

/**
 * Escalates a loading state into "this is taking longer than it should" after a delay.
 *
 * Pair it with the screen's existing skeleton rather than replacing it — the skeleton still
 * communicates *what* is coming, and SlowNetworkNotice explains *why* it hasn't arrived yet.
 *
 * Returns to 'none' the moment `isLoading` goes false, so a screen that finishes loading
 * never leaves a stale warning behind.
 */
export function useSlowNetwork(isLoading: boolean): {
  stage: SlowNetworkStage;
  isWeakConnection: boolean;
} {
  const [stage, setStage] = useState<SlowNetworkStage>('none');
  const [isWeakConnection, setIsWeakConnection] = useState(latestIsWeak);

  useEffect(() => subscribeToConnectionQuality(setIsWeakConnection), []);

  useEffect(() => {
    if (!isLoading) {
      setStage('none');
      return;
    }

    // Timeouts, not an interval: nothing here renders the elapsed time, so ticking once a
    // second would re-render the whole screen ~12 times per load to change nothing.
    const slowAfter = isWeakConnection ? WEAK_SLOW_AFTER_MS : SLOW_AFTER_MS;
    const verySlowAfter = isWeakConnection ? WEAK_VERY_SLOW_AFTER_MS : VERY_SLOW_AFTER_MS;

    const slowTimer = setTimeout(() => setStage('slow'), slowAfter);
    const verySlowTimer = setTimeout(() => setStage('verySlow'), verySlowAfter);

    return () => {
      clearTimeout(slowTimer);
      clearTimeout(verySlowTimer);
    };
  }, [isLoading, isWeakConnection]);

  return { stage, isWeakConnection };
}
