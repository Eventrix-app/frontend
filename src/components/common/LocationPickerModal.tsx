import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import MapView, { PROVIDER_GOOGLE, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { Feather } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { borderRadius } from '../../theme/borderRadius';
import { Text } from './Text';
import { useLazyReverseGeocodeQuery } from '../../store/services/geocodeApi';

// Falls back to India's rough centroid when no coordinates exist yet (new event, no prior
// location signal) — matches the geographic assumption already baked into LocationAccessScreen.
const DEFAULT_REGION: Region = {
  latitude: 20.5937,
  longitude: 78.9629,
  latitudeDelta: 8,
  longitudeDelta: 8,
};

interface Props {
  visible: boolean;
  initialLatitude?: number;
  initialLongitude?: number;
  onClose: () => void;
  onConfirm: (result: { latitude: number; longitude: number; address?: string }) => void;
}

// A center-fixed pin the map pans under, rather than a draggable Marker — avoids
// draggable-Marker gesture conflicts with MapView's own pan/zoom gestures (a common
// react-native-maps pain point across Android/iOS), while giving the same "drop a pin" UX:
// whatever's under the crosshair when the organizer stops moving the map is the picked point.
export const LocationPickerModal: React.FC<Props> = ({ visible, initialLatitude, initialLongitude, onClose, onConfirm }) => {
  const [region, setRegion] = useState<Region>(
    initialLatitude != null && initialLongitude != null
      ? { latitude: initialLatitude, longitude: initialLongitude, latitudeDelta: 0.01, longitudeDelta: 0.01 }
      : DEFAULT_REGION,
  );
  const [address, setAddress] = useState<string | undefined>();
  const [isResolvingAddress, setIsResolvingAddress] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const reverseGeocodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [triggerReverseGeocode] = useLazyReverseGeocodeQuery();

  // Routed through the backend (GET /geocode/reverse) rather than calling Google directly —
  // keeps the Geocoding API key server-side only (see geocode.service.ts).
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    setIsResolvingAddress(true);
    try {
      const result = await triggerReverseGeocode({ lat, lng }).unwrap();
      setAddress(result.address ?? undefined);
    } catch {
      setAddress(undefined);
    } finally {
      setIsResolvingAddress(false);
    }
  }, [triggerReverseGeocode]);

  useEffect(() => {
    if (!visible) return;
    reverseGeocode(region.latitude, region.longitude);
    // Only on open — subsequent moves are debounced via onRegionChangeComplete below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const handleRegionChangeComplete = (nextRegion: Region) => {
    setRegion(nextRegion);
    if (reverseGeocodeTimer.current) clearTimeout(reverseGeocodeTimer.current);
    reverseGeocodeTimer.current = setTimeout(() => {
      reverseGeocode(nextRegion.latitude, nextRegion.longitude);
    }, 500);
  };

  const useCurrentLocation = async () => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const next: Region = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      setRegion(next);
      reverseGeocode(next.latitude, next.longitude);
    } finally {
      setIsLocating(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} hitSlop={8}>
            <Feather name="x" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text variant="h3">Pin event location</Text>
          <View style={{ width: 22 }} />
        </View>

        <View style={styles.mapWrap}>
          <MapView
            style={StyleSheet.absoluteFill}
            // Google provider on Android needs the native Maps SDK key from
            // app.config.js; iOS keeps Apple Maps (the platform default) since Google's
            // provider requires its own iOS SDK setup this app doesn't use.
            provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
            initialRegion={region}
            onRegionChangeComplete={handleRegionChangeComplete}
          />
          <View pointerEvents="none" style={styles.pinWrap}>
            <Feather name="map-pin" size={36} color={colors.brandPink} />
          </View>

          <TouchableOpacity style={styles.currentLocationBtn} onPress={useCurrentLocation} disabled={isLocating}>
            {isLocating ? (
              <ActivityIndicator size="small" color={colors.brandPink} />
            ) : (
              <Feather name="navigation" size={18} color={colors.brandPink} />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <View style={styles.addressRow}>
            <Feather name="map-pin" size={14} color={colors.textSecondary} />
            {isResolvingAddress ? (
              <Text style={styles.addressText}>Resolving address…</Text>
            ) : (
              <Text style={styles.addressText} numberOfLines={2}>
                {address ?? `${region.latitude.toFixed(5)}, ${region.longitude.toFixed(5)}`}
              </Text>
            )}
          </View>
          <TouchableOpacity
            style={styles.confirmBtn}
            onPress={() => onConfirm({ latitude: region.latitude, longitude: region.longitude, address })}
          >
            <Text style={styles.confirmText}>Use this location</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  mapWrap: { flex: 1 },
  pinWrap: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -18,
    marginTop: -36,
  },
  currentLocationBtn: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  footer: {
    padding: spacing.md,
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
  },
  addressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs },
  addressText: { flex: 1, fontSize: 13, color: colors.textSecondary },
  confirmBtn: {
    backgroundColor: colors.brandPink,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  confirmText: { color: colors.white, fontWeight: '700', fontSize: 15 },
});
