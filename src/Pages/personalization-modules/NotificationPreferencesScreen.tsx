import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/types';
import { AnimatedToggle } from '../../components/AnimatedToggle';
import { CheckBadge } from '../../components/CheckBadge';
import { PrimaryButton } from '../../components/PrimaryButton';
import { colors, spacing } from '../../theme';

type Pref =
  | 'eventReminders'
  | 'newEventsNearby'
  | 'reelsCommunity'
  | 'specialOffers';

const ITEMS: { key: Pref; label: string }[] = [
  { key: 'eventReminders', label: 'Event reminders' },
  { key: 'newEventsNearby', label: 'New events near you' },
  { key: 'reelsCommunity', label: 'Reels & community activity' },
  { key: 'specialOffers', label: 'Special offers & updates' },
];

type Props = {
  visible: boolean;
  onClose: () => void;
  onContinue: (prefs: Record<Pref, boolean>) => void;
};

const { height } = Dimensions.get('window');

export const NotificationsModal: React.FC<Props> = ({
  visible,
  onClose,
  onContinue,
}) => {
  const [prefs, setPrefs] = useState<Record<Pref, boolean>>({
    eventReminders: true,
    newEventsNearby: true,
    reelsCommunity: true,
    specialOffers: false,
  });

  const slide = useRef(new Animated.Value(height)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fade, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(slide, {
          toValue: 0,
          useNativeDriver: true,
          speed: 14,
          bounciness: 6,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fade, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(slide, {
          toValue: height,
          duration: 220,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, fade, slide]);

  const toggle = (key: Pref) =>
    setPrefs((p) => ({ ...p, [key]: !p[key] }));

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

        <Animated.View
          style={[styles.sheet, { transform: [{ translateY: slide }] }]}
        >
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
                style={[
                  styles.row,
                  i < ITEMS.length - 1 && styles.rowDivider,
                ]}
              >
                <View style={styles.left}>
                  <CheckBadge checked={prefs[item.key]} />
                  <Text style={styles.rowLabel}>{item.label}</Text>
                </View>
                <AnimatedToggle
                  value={prefs[item.key]}
                  onChange={() => toggle(item.key)}
                />
              </View>
            ))}
          </View>

          <View style={styles.actions}>
            <PrimaryButton
              label="Continue  →"
              variant="solid"
              onPress={() => onContinue(prefs)}
              style={styles.continueBtn}
            />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
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
    fontFamily: 'ZalandoSansExpanded-Medium',
    fontWeight: '500',
    fontSize: 20,
    lineHeight: 20,
    textAlign: 'center',
    color: colors.text,
  },
  subtitle: {
    fontFamily: 'Poppins-Medium',
    fontWeight: '500',
    fontSize: 14,
    lineHeight: 21, // 150%
    textAlign: 'center',
    color: colors.subtext,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: '#EDEDF1',
    marginVertical: spacing.lg,
  },
  list: {},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F5',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  rowLabel: {
    fontFamily: 'Poppins-Medium',
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
    flexShrink: 1,
  },
  actions: {
    flexDirection: 'row',
    marginTop: spacing.xl,
    justifyContent: 'center',
  },
  continueBtn: { minWidth: 220 },
});

// Screen component for navigation
type NotificationPreferencesScreenProps = NativeStackScreenProps<
  AuthStackParamList,
  'NotificationPreferences'
>;

export const NotificationPreferencesScreen: React.FC<NotificationPreferencesScreenProps> =
  () => {
    const navigation = useNavigation();
    const [visible, setVisible] = useState(true);

    const handleClose = () => {
      setVisible(false);
      navigation.goBack();
    };

    const handleContinue = (prefs: Record<Pref, boolean>) => {
      setVisible(false);
      console.log('Notification preferences:', prefs);
      navigation.navigate('Login' as never);
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
