import { useEffect, useState } from 'react';
import { Image } from 'react-native';

const sizeCache = new Map<string, { width: number; height: number }>();

export function useNaturalImageSize(uri: string | undefined): { width: number; height: number } | null {
  const [size, setSize] = useState(() => (uri ? sizeCache.get(uri) ?? null : null));

  useEffect(() => {
    if (!uri) {
      setSize(null);
      return;
    }
    const cached = sizeCache.get(uri);
    if (cached) {
      setSize(cached);
      return;
    }
    let cancelled = false;
    Image.getSize(
      uri,
      (width, height) => {
        if (cancelled) return;
        const resolved = { width, height };
        sizeCache.set(uri, resolved);
        setSize(resolved);
      },
      () => {
        if (!cancelled) setSize(null);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [uri]);

  return size;
}
