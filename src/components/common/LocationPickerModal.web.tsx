import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import * as Location from 'expo-location';
import Feather from '@expo/vector-icons/Feather';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/spacing';
import { borderRadius } from '../../theme/borderRadius';
import { Text } from './Text';
import { useLazyReverseGeocodeQuery } from '../../store/services/geocodeApi';

// Web build of LocationPickerModal — react-native-maps has no web implementation (it
// imports native-only codegen internals that fail to bundle for web at all), so Metro
// picks this file over LocationPickerModal.tsx for web builds automatically (the .web.tsx
// convention). Same Props/behavior, manual lat/lng entry instead of a draggable map:
// "Use current location" still works via the browser's geolocation API (expo-location
// supports web), and reverse geocoding goes through the same backend proxy.
const DEFAULT_LATITUDE = 20.5937;
const DEFAULT_LONGITUDE = 78.9629;

interface Props {
  visible: boolean;
  initialLatitude?: number;
  initialLongitude?: number;
  /** Kept in sync with the native variant so callers can use either interchangeably. */
  title?: string;
  onClose: () => void;
  onConfirm: (result: { latitude: number; longitude: number; address?: string }) => void;
}

export const LocationPickerModal: React.FC<Props> = ({ visible, initialLatitude, initialLongitude, title = 'Pin event location', onClose, onConfirm }) => {
  const [latitude, setLatitude] = useState(initialLatitude ?? DEFAULT_LATITUDE);
  const [longitude, setLongitude] = useState(initialLongitude ?? DEFAULT_LONGITUDE);
  const [latText, setLatText] = useState(String(latitude));
  const [lngText, setLngText] = useState(String(longitude));
  const [address, setAddress] = useState<string | undefined>();
  const [isResolvingAddress, setIsResolvingAddress] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const reverseGeocodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [triggerReverseGeocode] = useLazyReverseGeocodeQuery();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

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
    reverseGeocode(latitude, longitude);
    // Only on open — subsequent coordinate edits are debounced below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const applyCoords = (lat: number, lng: number) => {
    setLatitude(lat);
    setLongitude(lng);
    setLatText(String(lat));
    setLngText(String(lng));
    if (reverseGeocodeTimer.current) clearTimeout(reverseGeocodeTimer.current);
    reverseGeocodeTimer.current = setTimeout(() => reverseGeocode(lat, lng), 500);
  };

  const handleLatChange = (text: string) => {
    setLatText(text);
    const parsed = Number(text);
    if (!Number.isNaN(parsed) && text.trim() !== '') applyCoords(parsed, longitude);
  };

  const handleLngChange = (text: string) => {
    setLngText(text);
    const parsed = Number(text);
    if (!Number.isNaN(parsed) && text.trim() !== '') applyCoords(latitude, parsed);
  };

  const useCurrentLocation = async () => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      applyCoords(pos.coords.latitude, pos.coords.longitude);
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
          <Text variant="h3">{title}</Text>
          <View style={{ width: 22 }} />
        </View>

        <View style={styles.body}>
          <Text style={styles.notice}>
            An interactive map picker is available in the mobile app. Enter coordinates directly here, or use your
            current location.
          </Text>

          <TouchableOpacity style={styles.currentLocationBtn} onPress={useCurrentLocation} disabled={isLocating}>
            {isLocating ? (
              <ActivityIndicator size="small" color={colors.brandPink} />
            ) : (
              <Feather name="navigation" size={16} color={colors.brandPink} />
            )}
            <Text style={styles.currentLocationText}>Use current location</Text>
          </TouchableOpacity>

          <Text style={styles.label}>Latitude</Text>
          <TextInput
            style={styles.input}
            value={latText}
            onChangeText={handleLatChange}
            placeholder="e.g. 20.5937"
            placeholderTextColor={colors.textSecondary}
            keyboardType="numeric"
          />

          <Text style={styles.label}>Longitude</Text>
          <TextInput
            style={styles.input}
            value={lngText}
            onChangeText={handleLngChange}
            placeholder="e.g. 78.9629"
            placeholderTextColor={colors.textSecondary}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.footer}>
          <View style={styles.addressRow}>
            <Feather name="map-pin" size={14} color={colors.textSecondary} />
            {isResolvingAddress ? (
              <Text style={styles.addressText}>Resolving address…</Text>
            ) : (
              <Text style={styles.addressText} numberOfLines={2}>
                {address ?? `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`}
              </Text>
            )}
          </View>
          <TouchableOpacity
            style={styles.confirmBtn}
            onPress={() => onConfirm({ latitude, longitude, address })}
          >
            <Text style={styles.confirmText}>Use this location</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
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
  body: { flex: 1, padding: spacing.md },
  notice: { fontSize: 13, color: colors.textSecondary, marginBottom: spacing.md, lineHeight: 18 },
  currentLocationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.brandPink,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.lg,
  },
  currentLocationText: { color: colors.brandPink, fontWeight: '600', fontSize: 13 },
  label: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.xs },
  input: {
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 15,
    color: colors.text,
    marginBottom: spacing.md,
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
