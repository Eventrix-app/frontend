import React, { useMemo } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { Text } from '../../components/common/Text';
import { RootStackParamList } from '../../navigation/types';
import { ColorPalette } from '../../theme/colors.light';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/spacing';
import { borderRadius } from '../../theme/borderRadius';
import { useListSessionsQuery, useRevokeSessionMutation, useRevokeOtherSessionsMutation, SessionRecord } from '../../store/services/authApi';
import { showAlert, showConfirm } from '../../utils/crossPlatformAlert';

type Props = NativeStackScreenProps<RootStackParamList, 'ActiveSessions'>;

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const ActiveSessionsScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { data: sessions, isLoading, isError, refetch } = useListSessionsQuery();
  const [revokeSession, { isLoading: isRevoking }] = useRevokeSessionMutation();
  const [revokeOthers, { isLoading: isRevokingOthers }] = useRevokeOtherSessionsMutation();

  const handleRevoke = (session: SessionRecord) => {
    showConfirm(
      session.isCurrent ? 'Log out this device?' : 'Log out this session?',
      session.isCurrent
        ? "This is the device you're using right now — you'll be signed out immediately."
        : `This device (${session.deviceLabel ?? 'Unknown device'}) will be signed out.`,
      async () => {
        try {
          await revokeSession(session.id).unwrap();
        } catch {
          showAlert('Something went wrong', "Couldn't log out that session. Please try again.");
        }
      },
      'Log Out',
    );
  };

  const handleRevokeOthers = () => {
    showConfirm(
      'Log out all other devices?',
      'Every other device currently signed in to your account will be logged out. This device stays signed in.',
      async () => {
        try {
          const result = await revokeOthers().unwrap();
          showAlert('Done', `Logged out ${result.revoked} other session${result.revoked === 1 ? '' : 's'}.`);
        } catch {
          showAlert('Something went wrong', "Couldn't log out other sessions. Please try again.");
        }
      },
      'Log Out Others',
    );
  };

  const otherSessionsCount = (sessions ?? []).filter((s) => !s.isCurrent).length;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScreenHeader title="Active Sessions" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.scroll}>
        {isLoading ? (
          <ActivityIndicator style={styles.loader} color={colors.brandPink} />
        ) : isError ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Couldn't load your sessions</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={refetch}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.helperText}>
              These are the devices currently signed in to your account. If you don't recognize one, log it out.
            </Text>

            <View style={styles.groupGlass}>
              <View style={styles.group}>
                {(sessions ?? []).map((session, index) => (
                  <View
                    key={session.id}
                    style={[styles.row, index === (sessions?.length ?? 0) - 1 && styles.rowLast]}
                  >
                    <View style={styles.rowText}>
                      <View style={styles.labelRow}>
                        <Text style={styles.label}>{session.deviceLabel ?? 'Unknown device'}</Text>
                        {session.isCurrent ? (
                          <View style={styles.currentBadge}>
                            <Text style={styles.currentBadgeText}>This device</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={styles.subtitle}>Last active {timeAgo(session.lastSeenAt)}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleRevoke(session)}
                      disabled={isRevoking}
                      hitSlop={8}
                    >
                      <Text style={styles.logoutLink}>Log out</Text>
                    </TouchableOpacity>
                  </View>
                ))}
                {(sessions ?? []).length === 0 ? (
                  <Text style={styles.subtitle}>No active sessions found.</Text>
                ) : null}
              </View>
            </View>

            {otherSessionsCount > 0 ? (
              <TouchableOpacity
                style={styles.revokeOthersWrap}
                onPress={handleRevokeOthers}
                disabled={isRevokingOthers}
              >
                <View style={styles.revokeOthersBtn}>
                  <Text style={styles.revokeOthersText}>
                    {isRevokingOthers ? 'Logging out…' : `Log Out ${otherSessionsCount} Other Device${otherSessionsCount === 1 ? '' : 's'}`}
                  </Text>
                </View>
              </TouchableOpacity>
            ) : null}
          </>
        )}
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
  loader: {
    marginTop: spacing.xl,
  },
  empty: {
    alignItems: 'center',
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  emptyTitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  retryBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.brandPink,
  },
  retryText: {
    color: colors.white,
    fontWeight: '600',
  },
  helperText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
    marginBottom: spacing.md,
  },
  groupGlass: {
    borderRadius: borderRadius.lg,
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
  rowLast: {
    borderBottomWidth: 0,
  },
  rowText: {
    flex: 1,
    paddingRight: spacing.md,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text,
  },
  currentBadge: {
    borderRadius: 999,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  currentBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.success,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  logoutLink: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.error,
  },
  revokeOthersWrap: {
    borderRadius: 20,
    marginTop: spacing.lg,
  },
  revokeOthersBtn: {
    height: 48,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.error,
  },
  revokeOthersText: {
    color: colors.error,
    fontSize: 14,
    fontWeight: '700',
  },
});

export default ActiveSessionsScreen;
