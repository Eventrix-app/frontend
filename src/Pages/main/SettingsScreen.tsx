import React, { useEffect, useMemo, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Switch, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useDispatch } from 'react-redux';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { RootStackParamList } from '../../navigation/types';
import { logout } from '../../store/slices/authSlice';
import { ColorPalette } from '../../theme/colors.light';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/spacing';
import { borderRadius } from '../../theme/borderRadius';
import { Text } from '../../components/common/Text';
import {
  useGetMeQuery,
  useUpdateNotificationChannelsMutation,
  useClearPushTokenMutation,
} from '../../store/services/userApi';
import { showAlert } from '../../utils/crossPlatformAlert';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

type SettingRow = {
  id: string;
  label: string;
  subtitle?: string;
  type: 'toggle' | 'link' | 'danger';
};

const SETTINGS: SettingRow[] = [
  { id: 'push', label: 'Push Notifications', subtitle: 'Event reminders & updates', type: 'toggle' },
  { id: 'email', label: 'Email Notifications', subtitle: 'Receipts and confirmations', type: 'toggle' },
  { id: 'location', label: 'Location Services', subtitle: 'Show nearby events', type: 'toggle' },
  { id: 'privacy', label: 'Privacy Policy', type: 'link' },
  { id: 'terms', label: 'Terms of Service', type: 'link' },
  { id: 'help', label: 'Help & Support', type: 'link' },
  { id: 'logout', label: 'Log Out', type: 'danger' },
];

const SettingsScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const { data: me } = useGetMeQuery();
  const [updateNotificationChannels] = useUpdateNotificationChannelsMutation();
  const [clearPushToken] = useClearPushTokenMutation();
  const { theme, colors, toggleTheme } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  // push/email default true (matching the backend's default for a newly created account)
  // until `me` loads, so the switches don't flash off-then-on; location has no backend
  // field at all and stays purely local/decorative.
  const [toggles, setToggles] = useState({
    push: true,
    email: true,
    location: false,
  });

  useEffect(() => {
    if (!me) return;
    setToggles((prev) => ({ ...prev, push: me.pushEnabled, email: me.emailEnabled }));
  }, [me]);

  const toggle = async (id: string) => {
    const next = !toggles[id as keyof typeof toggles];
    setToggles((prev) => ({ ...prev, [id]: next }));

    if (id !== 'push' && id !== 'email') return;
    try {
      await updateNotificationChannels(id === 'push' ? { pushEnabled: next } : { emailEnabled: next }).unwrap();
    } catch {
      // Revert so the switch stays truthful to what's actually persisted server-side.
      setToggles((prev) => ({ ...prev, [id]: !next }));
      showAlert('Something went wrong', "Couldn't update this setting. Please check your connection and try again.");
    }
  };

  const handleLogout = async () => {
    // Best-effort — a logged-out device shouldn't keep receiving this account's pushes,
    // but a failure here (e.g. offline) must never block the actual logout below.
    try {
      await clearPushToken().unwrap();
    } catch {
      // ignore — the token will simply be overwritten next time someone registers on
      // this device, or on this account's next login elsewhere.
    }

    // Clears (and persists) isAuthenticated/token/user — RootNavigator watches
    // isAuthenticated and resets the root stack to 'Auth' itself once this lands (same
    // pattern as AdminRedirectScreen's logout), so no manual navigation call here. Without
    // actually clearing this state, a browser refresh would rehydrate the stale
    // isAuthenticated: true and silently sign the user back in.
    dispatch(logout());
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScreenHeader title="Settings" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.groupTitle}>Preferences</Text>
        <View style={styles.groupGlass}>
          <View style={styles.group}>
            {SETTINGS.filter((s) => s.type === 'toggle').map((item) => (
              <View key={item.id} style={styles.row}>
                <View style={styles.rowText}>
                  <Text style={styles.label}>{item.label}</Text>
                  {item.subtitle ? (
                    <Text style={styles.subtitle}>{item.subtitle}</Text>
                  ) : null}
                </View>
                <Switch
                  value={toggles[item.id as keyof typeof toggles]}
                  onValueChange={() => toggle(item.id)}
                  trackColor={{ false: colors.border, true: colors.brandPink }}
                  thumbColor={colors.white}
                />
              </View>
            ))}
          </View>
        </View>

        <Text style={styles.groupTitle}>Appearance</Text>
        <View style={styles.groupGlass}>
          <View style={styles.group}>
            <View style={styles.row}>
              <View style={styles.rowText}>
                <Text style={styles.label}>Dark Mode</Text>
                <Text style={styles.subtitle}>{theme === 'dark' ? 'On' : 'Off'}</Text>
              </View>
              <Switch
                value={theme === 'dark'}
                onValueChange={toggleTheme}
                trackColor={{ false: colors.border, true: colors.brandPink }}
                thumbColor={colors.white}
              />
            </View>
          </View>
        </View>

        <Text style={styles.groupTitle}>Legal</Text>
        <View style={styles.groupGlass}>
          <View style={styles.group}>
            {SETTINGS.filter((s) => s.type === 'link').map((item) => (
              <TouchableOpacity key={item.id} style={styles.row}>
                <Text style={styles.label}>{item.label}</Text>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity style={styles.logoutWrap} onPress={handleLogout}>
          <View style={styles.logoutBtn}>
            <View style={styles.logoutContent}>
              <Text style={styles.logoutText}>Log Out</Text>
            </View>
          </View>
        </TouchableOpacity>

        <Text style={styles.version}>Eventrix v1.0.0</Text>
      </ScrollView>
    </View>
  );
};

const createStyles = (colors: ColorPalette) => StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.neutralBg,
  },
  scroll: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  groupTitle: {
    fontSize: 11,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
      fontFamily: 'ZalandoSansExpanded_600SemiBold'
},
  groupGlass: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: colors.white,
    marginBottom: spacing.md,
    ...Platform.select({
      android: { elevation: 6 },
      default: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.14,
        shadowRadius: 18,
      },
    }),
  },
  group: {
    paddingVertical: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  rowText: {
    flex: 1,
    paddingRight: spacing.md,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
      fontFamily: 'ZalandoSansExpanded_700Bold'
},
  chevron: {
    fontSize: 20,
    color: colors.textSecondary,
  },
  logoutWrap: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    marginTop: spacing.xl,
  },
  logoutBtn: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.white,
    ...Platform.select({
      android: { elevation: 6 },
      default: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.14,
        shadowRadius: 18,
      },
    }),
  },
  logoutContent: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  logoutText: {
    color: colors.error,
    fontSize: 16,
    fontWeight: '600',
  },
  version: {
    textAlign: 'center',
    marginTop: spacing.lg,
    fontSize: 12,
    color: colors.textSecondary,
  },
});

export default SettingsScreen;
