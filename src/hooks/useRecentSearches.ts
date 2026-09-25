import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'recentSearches';
const MAX_ENTRIES = 8;

/**
 * The user's own recent search terms, persisted on the device.
 *
 * Deliberately local rather than a backend resource: a search term is a record of what
 * someone was looking for, which is exactly the kind of thing that should not be sent to a
 * server unless it earns its keep. Nothing here needs cross-device sync, and keeping it on
 * the device means it is covered by the app's own data deletion rather than needing a
 * separate erasure path.
 *
 * Stored newest-first, de-duplicated case-insensitively so re-running a search promotes the
 * existing entry instead of adding a near-duplicate row.
 */
export function useRecentSearches() {
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (cancelled || !raw) return;
        const parsed = JSON.parse(raw);
        // Guard the shape: a corrupted or hand-edited value must not crash the screen.
        if (Array.isArray(parsed)) {
          setRecent(parsed.filter((t): t is string => typeof t === 'string').slice(0, MAX_ENTRIES));
        }
      })
      .catch(() => {
        /* Unreadable history is not worth surfacing — the list just starts empty. */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback((next: string[]) => {
    setRecent(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const addRecentSearch = useCallback(
    (rawTerm: string) => {
      const term = rawTerm.trim();
      if (term.length < 2) return;
      setRecent((prev) => {
        const next = [term, ...prev.filter((t) => t.toLowerCase() !== term.toLowerCase())].slice(0, MAX_ENTRIES);
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
        return next;
      });
    },
    [],
  );

  const clearRecentSearches = useCallback(() => persist([]), [persist]);

  return { recent, addRecentSearch, clearRecentSearches };
}
