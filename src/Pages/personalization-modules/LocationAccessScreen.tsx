import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  View,
  Image,
  TextInput,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import { useDispatch, useSelector } from 'react-redux';
import { setLocation, setManualCity } from '../../store/slices/onboardingDraftSlice';
import { AppDispatch, RootState } from '../../store';
import { spacing } from '../../theme/spacing';
import { useTheme } from '../../theme/ThemeContext';
import { PrimaryButton } from '../../components/PrimaryButton';
import { Text } from '../../components/common/Text';

const { height } = Dimensions.get('window');

const LocationAccessScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch<AppDispatch>();
  const persistedCity = useSelector((state: RootState) => state.onboardingDraft.manualCity) ?? '';

  const [visible, setVisible] = useState(true);
  const [cityInput, setCityInput] = useState(persistedCity);
  const [isLocating, setIsLocating] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // ── Animation (identical to NotificationsModal) ──────────────────────────
  const slide = useRef(new Animated.Value(height)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(slide, { toValue: 0, useNativeDriver: true, speed: 14, bounciness: 6 }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fade, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(slide, {
          toValue: height,
          duration: 220,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, fade, slide]);

  // ── Persist city input to Redux (debounced) ───────────────────────────────
  useEffect(() => {
    setCityInput(persistedCity);
  }, [persistedCity]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = cityInput.trim();
      dispatch(setManualCity(trimmed.length > 0 ? trimmed : null));
    }, 300);
    return () => clearTimeout(timer);
  }, [cityInput, dispatch]);

  // ── Navigation helpers ────────────────────────────────────────────────────
  const proceed = () => {
    setVisible(false);
    navigation.navigate('NotificationPreferences' as never);
  };

  const handleClose = () => {
    setVisible(false);
    navigation.goBack();
  };

  // ── Location logic (unchanged) ────────────────────────────────────────────
  const handleAllowLocation = async () => {
    setIsLocating(true);
    setLocationError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Location permission denied. Enter your city below or skip.');
        setIsLocating(false);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      dispatch(setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }));
      proceed();
    } catch {
      setLocationError('Could not get location. Enter your city below or skip.');
    } finally {
      setIsLocating(false);
    }
  };

  const handleManualCity = async () => {
    const city = cityInput.trim();
    if (!city) { proceed(); return; }
    setIsGeocoding(true);
    setLocationError(null);
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`;
      const res = await fetch(url, { headers: { 'User-Agent': 'Eventrix/1.0 (eventrix-app)' } });
      const data = await res.json();
      if (data && data.length > 0) {
        dispatch(setManualCity(city));
        dispatch(setLocation({ latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) }));
      } else {
        dispatch(setManualCity(city));
      }
    } catch {
      dispatch(setManualCity(city));
    } finally {
      setIsGeocoding(false);
      proceed();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View style={styles.root}>
        {/* Dimmed backdrop — tap to go back */}
        <Animated.View style={[styles.backdrop, { opacity: fade }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        </Animated.View>

        {/* Bottom sheet */}
        <Animated.View style={[styles.sheet, { transform: [{ translateY: slide }] }]}>
          <View style={styles.handle} />

          <Text style={styles.title}>Enable location access</Text>
          <Text style={styles.subtitle}>
            We use your location to show events happening near you.
          </Text>

          <View style={styles.divider} />

          {/* Map image */}
          <View style={styles.imageContainer}>
            <Image
              source={require('../../../assets/location/location.png')}
              style={styles.locationImage}
              resizeMode="cover"
            />
          </View>

          {locationError ? (
            <Text style={styles.errorText}>{locationError}</Text>
          ) : null}

          {/* Manual city input */}
          <View style={styles.inputContainer}>
            <Image
              source={require('../../../assets/location/search.png')}
              style={styles.searchIcon}
              resizeMode="contain"
              tintColor="#9CA3AF"
            />
            <TextInput
              style={styles.cityInput}
              placeholder="or enter your city manually"
              placeholderTextColor="#9CA3AF"
              value={cityInput}
              onChangeText={setCityInput}
              editable={!isLocating && !isGeocoding}
            />
          </View>

          {/* Primary action */}
          <View style={styles.actions}>
            <PrimaryButton
              label={isLocating ? '  Locating…  ' : 'Allow Location Access'}
              variant="solid"
              onPress={handleAllowLocation}
              style={StyleSheet.flatten([styles.primaryBtn, (isLocating || isGeocoding) ? styles.btnDisabled : undefined])}
            />
          </View>

          {/* Secondary row */}
          <View style={styles.secondaryRow}>
            <TouchableOpacity
              onPress={handleManualCity}
              disabled={isLocating || isGeocoding}
              activeOpacity={0.7}
            >
              {isGeocoding ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Text style={styles.manualCityText}>
                  {cityInput.trim() ? 'Continue with city name' : 'Skip'}
                </Text>
              )}
            </TouchableOpacity>

            {cityInput.trim() ? (
              <TouchableOpacity onPress={proceed} activeOpacity={0.7}>
                <Text style={styles.skipText}>Skip</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  // ── Shell (mirrors NotificationsModal exactly) ──────────────────────────
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(20,20,30,0.45)',
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 24,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#D8D8DE',
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 20,
    lineHeight: 20,
    textAlign: 'center',
    color: colors.text,
      fontFamily: 'ZalandoSansExpanded_500Medium'
},
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    color: colors.subtext,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
      fontFamily: 'ZalandoSansExpanded_500Medium'
},
  divider: { height: 1, backgroundColor: '#EDEDF1', marginVertical: spacing.lg },

  // ── Content ──────────────────────────────────────────────────────────────
  imageContainer: {
    width: '100%',
    height: 150,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  locationImage: { width: '100%', height: '100%' },
  errorText: {
    fontSize: 13,
    color: '#D32F2F',
    textAlign: 'center',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  searchIcon: { width: 18, height: 18, marginRight: 10 },
  cityInput: { flex: 1, fontSize: 15, color: colors.text, paddingVertical: 12 },
  actions: { flexDirection: 'row', justifyContent: 'center', marginBottom: spacing.md },
  primaryBtn: { minWidth: 220 },
  btnDisabled: { opacity: 0.6 },
  secondaryRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    alignItems: 'center',
  },
  manualCityText: { fontSize: 14, color: colors.primary, fontWeight: '600' },
  skipText: { fontSize: 14, color: colors.subtext },
});

export default LocationAccessScreen;
