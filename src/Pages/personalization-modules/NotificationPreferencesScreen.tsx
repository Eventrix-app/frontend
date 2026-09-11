import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useDispatch, useSelector } from 'react-redux';
import { AuthStackParamList } from '../../navigation/types';
import { AnimatedToggle } from '../../components/AnimatedToggle';
import { CheckBadge } from '../../components/CheckBadge';
import { PrimaryButton } from '../../components/PrimaryButton';
import { spacing } from '../../theme/spacing';
import { colorsLight } from '../../theme/colors.light';
import { setNotificationPrefs } from '../../store/slices/onboardingDraftSlice';
import { AppDispatch, RootState, store } from '../../store';
import { Text } from '../../components/common/Text';
import { syncOnboardingDraft } from '../../utils/syncOnboardingDraft';
import { registerForPushNotifications } from '../../utils/registerForPushNotifications';

type Pref = 'eventReminders' | 'nearbyEvents' | 'reelsAndCommunity' | 'specialOffers';

const ITEMS: { key: Pref; label: string }[] = [
  { key: 'eventReminders', label: 'Event reminders' },
  { key: 'nearbyEvents', label: 'New events near you' },
  { key: 'reelsAndCommunity', label: 'Reels & community activity' },
  { key: 'specialOffers', label: 'Special offers & updates' },
];

type ModalProps = {
  visible: boolean;
  onClose: () => void;
  onContinue: (prefs: Record<Pref, boolean>) => void;
};

const { height } = Dimensions.get('window');

export const NotificationsModal: React.FC<ModalProps> = ({ visible, onClose, onContinue }) => {
  const dispatch = useDispatch<AppDispatch>();
  const persistedPrefs = useSelector((state: RootState) => state.onboardingDraft.notificationPrefs);

  const [prefs, setPrefs] = useState<Record<Pref, boolean>>({
    eventReminders: true,
    nearbyEvents: true,
    reelsAndCommunity: true,
    specialOffers: true,
  });
  const styles = useMemo(() => createStyles(colorsLight), []);

  useEffect(() => {
    if (persistedPrefs) {
      setPrefs(persistedPrefs);
    }
  }, [persistedPrefs]);

  useEffect(() => {
    const timer = setTimeout(() => {
      dispatch(setNotificationPrefs(prefs));
    }, 250);

    return () => clearTimeout(timer);
  }, [dispatch, prefs]);

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

  const toggle = (key: Pref) => setPrefs((p) => ({ ...p, [key]: !p[key] }));

  const handleContinue = () => {
    dispatch(setNotificationPrefs(prefs));
    onContinue(prefs);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, { opacity: fade }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        <Animated.View style={[styles.sheet, { transform: [{ translateY: slide }] }]}>
          <View style={styles.handle} />

          <Text style={styles.title}>Stay in the loop</Text>
          <Text style={styles.subtitle}>
            You can manage notifications anytime in settings.
          </Text>

          <View style={styles.divider} />

          <View style={styles.list}>
            {ITEMS.map((item, i) => (
              <View
                key={item.key}
                style={[styles.row, i < ITEMS.length - 1 && styles.rowDivider]}
              >
                <View style={styles.left}>
                  <CheckBadge checked={prefs[item.key]} />
                  <Text style={styles.rowLabel}>{item.label}</Text>
                </View>
                <AnimatedToggle value={prefs[item.key]} onChange={() => toggle(item.key)} />
              </View>
            ))}
          </View>

          <View style={styles.actions}>
            <PrimaryButton
              label="Continue  →"
              variant="solid"
              onPress={handleContinue}
              style={styles.continueBtn}
            />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const createStyles = (colors: typeof colorsLight) => StyleSheet.create({
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
    backgroundColor: colors.neutralLine,
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
  divider: { height: 1, backgroundColor: colors.borderLight, marginVertical: spacing.lg },
  list: {},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  left: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: spacing.md },
  rowLabel: { fontSize: 15, fontWeight: '500', color: colors.text, flexShrink: 1 },
  actions: { flexDirection: 'row', marginTop: spacing.xl, justifyContent: 'center' },
  continueBtn: { minWidth: 220 },
});

// Standalone screen wrapper (used when navigated to directly)
type ScreenProps = NativeStackScreenProps<AuthStackParamList, 'NotificationPreferences'>;

export const NotificationPreferencesScreen: React.FC<ScreenProps> = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch<AppDispatch>();
  const [visible, setVisible] = useState(true);

  const handleClose = () => {
    setVisible(false);
    navigation.goBack();
  };

  // This is the last step of the post-login onboarding chain (Onboarding -> Interests ->
  // LocationAccess -> here) — Login has already happened by this point, so push the
  // collected interests/location/prefs (syncOnboardingDraft also marks the account as
  // onboarded once that sync succeeds — see its own comment), then land on Main.
  // Awaited (not fire-and-forget) so the account's hasCompletedOnboarding flag is durably
  // set server-side before the user can leave/background the app — otherwise a login
  // shortly after would still see hasCompletedOnboarding: false and re-run onboarding.
  const handleContinue = async () => {
    setVisible(false);
    await syncOnboardingDraft(dispatch, store.getState);
    // Request OS push notification permission at the natural end of onboarding
    // (after the user has set their in-app preferences) rather than right after login.
    registerForPushNotifications(dispatch);
    navigation.getParent()?.navigate('Main' as never);
  };

  return (
    <NotificationsModal
      visible={visible}
      onClose={handleClose}
      onContinue={handleContinue}
    />
  );
};

export default NotificationPreferencesScreen;
