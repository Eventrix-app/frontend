import React, { useEffect, useMemo, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Switch, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useDispatch } from 'react-redux';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { RootStackParamList, LegalDocumentKey } from '../../navigation/types';
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
  useDeleteAccountMutation,
  useExportMyDataMutation,
} from '../../store/services/userApi';
import { showAlert, showConfirm } from '../../utils/crossPlatformAlert';
import { getExpoPushTokenSafe } from '../../utils/getExpoPushToken';
import { SpringPressable } from '../../components/common/SpringPressable';
import { DeleteMyDataModal } from '../../components/common/DeleteMyDataModal';
import Skeleton from '../../components/common/Skeleton';
import { authApi } from '../../store/services/authApi';
import { moderationApi } from '../../store/services/moderationApi';
import type { AppDispatch } from '../../store';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

type SettingRow = {
  id: string;
  label: string;
  subtitle?: string;
  type: 'toggle' | 'link' | 'danger';
  legalDoc?: LegalDocumentKey;
};

const SETTINGS: SettingRow[] = [
  { id: 'push', label: 'Push Notifications', subtitle: 'Event reminders & updates', type: 'toggle' },
  { id: 'email', label: 'Email Notifications', subtitle: 'Receipts and confirmations', type: 'toggle' },
  { id: 'location', label: 'Location Services', subtitle: 'Show nearby events', type: 'toggle' },
  { id: 'help', label: 'Help & Support', type: 'link' },
  { id: 'privacy', label: 'Privacy Policy', type: 'link', legalDoc: 'privacy' },
  { id: 'terms', label: 'Terms of Service', type: 'link', legalDoc: 'terms' },
  { id: 'payment', label: 'Payment Policy', type: 'link', legalDoc: 'payment' },
  { id: 'refund', label: 'Refund & Cancellation Policy', type: 'link', legalDoc: 'refund' },
  { id: 'community', label: 'Community Guidelines', type: 'link', legalDoc: 'community' },
  { id: 'security', label: 'Security Policy', type: 'link', legalDoc: 'security' },
  { id: 'dataRetention', label: 'Data Retention Policy', type: 'link', legalDoc: 'dataRetention' },
  { id: 'accountDeletion', label: 'Account Deletion Policy', type: 'link', legalDoc: 'accountDeletion' },
  { id: 'cookies', label: 'Cookie Policy', type: 'link', legalDoc: 'cookies' },
  { id: 'grievance', label: 'Contact & Grievance Policy', type: 'link', legalDoc: 'grievance' },
  { id: 'logout', label: 'Log Out', type: 'danger' },
];

const SettingsScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch<AppDispatch>();
  const { data: me, isLoading: isLoadingMe } = useGetMeQuery();

  // Warms the two screens reachable only from here (Active sessions, Blocked users). They
  // are the app's only genuinely cold queries — everything else a user can reach is either
  // already prefetched at login or derived from getMe.
  //
  // Prefetched on arriving *here* rather than at login on purpose: firing every screen's
  // query at login would put ~30 requests in flight at once, competing for bandwidth with
  // the screens the user is actually looking at and spending mobile data on screens most
  // people never open. Doing it at the entry point costs two requests, only for someone who
  // opened Settings, and gives the row they tap a warm cache by the time it mounts.
  //
  // force: false leaves an already-fresh entry alone instead of re-requesting it.
  useEffect(() => {
    dispatch(authApi.util.prefetch('listSessions', undefined, { force: false }));
    dispatch(moderationApi.util.prefetch('listBlockedUsers', undefined, { force: false }));
  }, [dispatch]);
  const [updateNotificationChannels] = useUpdateNotificationChannelsMutation();
  const [clearPushToken] = useClearPushTokenMutation();
  const [deleteAccount, { isLoading: isDeletingAccount }] = useDeleteAccountMutation();
  const [exportMyData, { isLoading: isExportingData }] = useExportMyDataMutation();
  const [deleteMyDataModalVisible, setDeleteMyDataModalVisible] = useState(false);
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
    // but a failure here (e.g. offline) must never block the actual logout below. Only
    // this device's token is cleared (multi-device push) — read it back rather than
    // guessing, since nothing else in the app holds onto it after registration.
    try {
      const pushToken = await getExpoPushTokenSafe();
      if (pushToken) await clearPushToken(pushToken).unwrap();
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

  const handleExportData = async () => {
    try {
      await exportMyData().unwrap();
      showAlert('Export requested', `We've emailed a copy of your account data to ${me?.email ?? 'your registered email address'}.`);
    } catch (err: any) {
      if (err?.status === 429) {
        showAlert('Please wait', "You've requested a few too many exports recently — try again in a bit.");
        return;
      }
      showAlert('Something went wrong', "Couldn't request your data export. Please check your connection and try again.");
    }
  };

  const handleDeleteAccount = () => {
    showConfirm(
      'Delete your account?',
      'This permanently deactivates your account and signs you out. This action cannot be undone.',
      async () => {
        try {
          await deleteAccount().unwrap();
        } catch {
          showAlert('Something went wrong', "Couldn't delete your account. Please check your connection and try again.");
          return;
        }
        // Only sign out on confirmed success — an unsuccessful request must never leave
        // the user believing their account is gone while it still exists server-side.
        dispatch(logout());
      },
      'Delete Account',
    );
  };

  // Called by DeleteMyDataModal once the backend has confirmed erasure — the modal owns
  // the identity-verification + mutation call itself, this just finishes the flow the same
  // way handleDeleteAccount does (sign out only after confirmed success).
  const handleDataErased = () => {
    setDeleteMyDataModalVisible(false);
    showAlert('Your data has been deleted', 'Your personal data has been erased. You have been signed out.');
    dispatch(logout());
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScreenHeader title="Settings" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.groupTitle}>Account</Text>
        <View style={styles.groupGlass}>
          <View style={styles.group}>
            {/* Only this row waits on getMe — everything else on this screen (theme, legal,
                help, logout) is independent of it, and hiding all of it behind a skeleton
                would make the screen slower to be useful for no gain. The row is skeletoned
                specifically because both of its branches assert something about the user:
                rendering the unverified branch first tells an already-verified user to go
                and do something they do not need to do. */}
            {isLoadingMe ? (
              <View style={styles.row}>
                <View style={styles.rowText}>
                  <Skeleton width={110} height={15} />
                  <Skeleton width={170} height={12} style={{ marginTop: 6 }} />
                </View>
              </View>
            ) : me?.isEmailVerified ? (
              <View style={styles.row}>
                <View style={styles.rowText}>
                  <Text style={styles.label}>Email address</Text>
                  <Text style={styles.subtitle}>{me.email}</Text>
                </View>
                <View style={styles.verifiedBadge}>
                  <Text style={styles.verifiedBadgeText}>Verified</Text>
                </View>
              </View>
            ) : (
              <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('VerifyEmail')}>
                <View style={styles.rowText}>
                  <Text style={styles.label}>Verify Email</Text>
                  <Text style={styles.subtitle}>{me?.email ?? 'Confirm your email address'}</Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('ActiveSessions')}>
              <View style={styles.rowText}>
                <Text style={styles.label}>Active Sessions</Text>
                <Text style={styles.subtitle}>Manage devices signed in to your account</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('BlockedUsers')}>
              <View style={styles.rowText}>
                <Text style={styles.label}>Blocked Users</Text>
                <Text style={styles.subtitle}>Manage who can't reach you in event chat</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          </View>
        </View>

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
              <TouchableOpacity
                key={item.id}
                style={styles.row}
                onPress={() => {
                  if (item.id === 'help') navigation.navigate('HelpCenter');
                  else if (item.legalDoc) navigation.navigate('LegalDocument', { doc: item.legalDoc });
                }}
              >
                <Text style={styles.label}>{item.label}</Text>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Text style={styles.groupTitle}>Data & Privacy</Text>
        <View style={styles.groupGlass}>
          <View style={styles.group}>
            <TouchableOpacity
              style={styles.singleRow}
              onPress={handleExportData}
              disabled={isExportingData}
            >
              <View style={styles.rowText}>
                <Text style={styles.label}>{isExportingData ? 'Requesting…' : 'Download My Data'}</Text>
                <Text style={styles.subtitle}>Emails a copy of your account data to you</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.groupTitle}>Danger Zone</Text>
        <View style={styles.groupGlass}>
          <View style={styles.group}>
            <TouchableOpacity
              style={styles.singleRow}
              onPress={handleDeleteAccount}
              disabled={isDeletingAccount}
            >
              <View style={styles.rowText}>
                <Text style={styles.dangerLabel}>{isDeletingAccount ? 'Deleting…' : 'Delete Account'}</Text>
                <Text style={styles.subtitle}>Permanently deactivate your account</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.singleRow}
              onPress={() => setDeleteMyDataModalVisible(true)}
            >
              <View style={styles.rowText}>
                <Text style={styles.dangerLabel}>Delete My Data</Text>
                <Text style={styles.subtitle}>Erase your personal data, beyond what we're legally required to keep</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Scale feedback, not opacity — and that is the whole point of not using
            TouchableOpacity here. TouchableOpacity presses by fading its wrapper, and
            logoutBtn below carries an Android `elevation`. Fading a parent that contains an
            elevated child makes Android composite that child through an offscreen layer, and
            its shadow lands as a flat opaque rectangle over the button for the duration of
            the press — the white box. PrimaryButton has the same elevated shape and already
            avoids it the same way, by animating transform instead of alpha. */}
        <SpringPressable style={styles.logoutWrap} onPress={handleLogout} scaleTo={0.96}>
          <View style={styles.logoutBtn}>
            <View style={styles.logoutContent}>
              {/* numberOfLines={1}: without it, a larger device font-scale setting could
                  wrap "Log Out" onto two lines, and logoutBtn's fixed height + overflow:
                  hidden then clipped the second line — leaving only "Log" visible. Forcing
                  one line makes it shrink/ellipsize instead of silently losing "Out". */}
              <Text style={styles.logoutText} numberOfLines={1}>Log Out</Text>
            </View>
          </View>
        </SpringPressable>

        <Text style={styles.version}>Eventrix v1.0.0</Text>
      </ScrollView>

      <DeleteMyDataModal
        visible={deleteMyDataModalVisible}
        onClose={() => setDeleteMyDataModalVisible(false)}
        onErased={handleDataErased}
        hasPassword={me?.hasPassword ?? true}
        authProviders={me?.authProviders ?? []}
      />
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
  singleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  dangerLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.error,
  },
  verifiedBadge: {
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  verifiedBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.success,
  },
  logoutWrap: {
    borderRadius: 20,
    alignSelf: 'center',
    width: '70%',
    marginTop: spacing.xl,
  },
  logoutBtn: {
    height: 52,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: colors.primary,
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
    justifyContent: 'center',
    height: '100%',
  },
  logoutText: {
    color: colors.white,
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  version: {
    textAlign: 'center',
    marginTop: spacing.lg,
    fontSize: 12,
    color: colors.textSecondary,
  },
});

export default SettingsScreen;
