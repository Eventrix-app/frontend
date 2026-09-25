import { useEffect, useState } from 'react';
import * as Location from 'expo-location';

interface LocatableUser {
  latitude: number | null;
  longitude: number | null;
  city?: string | null;
}

// Turns the coordinates captured during onboarding's location-access step (persisted on
// the user's account, GET /users/me) into a real, human-readable address. Shared by
// HomeScreen and ProfileScreen so both show the exact same resolved location instead of
// each computing/displaying it differently (e.g. one showing the geocoded address, the
// other showing the raw city field). No new location permission prompt: this only
// reverse-geocodes coordinates already on file, it doesn't read live GPS.
export function useDisplayAddress(user: LocatableUser | undefined, fallback = 'Add your location'): string {
  const [accessedAddress, setAccessedAddress] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (user?.latitude == null || user?.longitude == null) {
      setAccessedAddress(null);
      return;
    }
    const { latitude, longitude } = user;

    // expo-location's reverseGeocodeAsync has no web implementation at all — it always
    // throws there (see expo-location/src/ExpoLocation.web.ts) — and some Android devices
    // ship without a native Geocoder either. Nominatim's reverse endpoint is a plain HTTP
    // call, so it works the same everywhere; same API LocationAccessScreen already uses
    // for forward geocoding of a manually-typed city.
    const reverseGeocodeViaNominatim = async (): Promise<string | null> => {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=14`;
      const res = await fetch(url, { headers: { 'User-Agent': 'Eventrix/1.0 (eventrix-app)' } });
      const data = await res.json();
      const address = data?.address ?? {};
      const parts = [
        address.suburb || address.city_district || address.neighbourhood,
        address.city || address.town || address.village || address.county,
      ].filter((part): part is string => !!part);
      return parts.length > 0 ? parts.join(', ') : address.state ?? null;
    };

    Location.reverseGeocodeAsync({ latitude, longitude })
      .then((results) => {
        if (cancelled) return null;
        const first = results[0];
        const parts = [first?.district || first?.subregion, first?.city].filter(
          (part): part is string => !!part,
        );
        const resolved = parts.length > 0 ? parts.join(', ') : first?.region ?? null;
        if (resolved) return resolved;
        return reverseGeocodeViaNominatim();
      })
      .catch(() => (cancelled ? null : reverseGeocodeViaNominatim().catch(() => null)))
      .then((resolved) => {
        if (!cancelled && resolved !== null) setAccessedAddress(resolved);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.latitude, user?.longitude]);

  return accessedAddress || user?.city || fallback;
}
