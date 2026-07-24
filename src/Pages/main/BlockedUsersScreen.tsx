import React, { useMemo } from 'react';
import { ActivityIndicator, Image, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { Text } from '../../components/common/Text';
import { RootStackParamList } from '../../navigation/types';
import { ColorPalette } from '../../theme/colors.light';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/spacing';
import { borderRadius } from '../../theme/borderRadius';
import { useListBlockedUsersQuery, useUnblockUserMutation, BlockedUserRecord } from '../../store/services/moderationApi';
import { showAlert, showConfirm } from '../../utils/crossPlatformAlert';

type Props = NativeStackScreenProps<RootStackParamList, 'BlockedUsers'>;

const BlockedUsersScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { data: blockedUsers, isLoading, isError, refetch } = useListBlockedUsersQuery();
  const [unblockUser, { isLoading: isUnblocking }] = useUnblockUserMutation();

  const handleUnblock = (user: BlockedUserRecord) => {
    showConfirm(
      `Unblock ${user.fullName}?`,
      "They'll be able to see your event chat messages again.",
      async () => {
        try {
          await unblockUser(user.id).unwrap();
        } catch {
          showAlert('Something went wrong', "Couldn't unblock this user. Please try again.");
        }
      },
      'Unblock',
    );
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScreenHeader title="Blocked Users" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.scroll}>
        {isLoading ? (
          <ActivityIndicator style={styles.loader} color={colors.brandPink} />
        ) : isError ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Couldn't load your blocked users</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={refetch}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : !blockedUsers || blockedUsers.length === 0 ? (
          <Text style={styles.helperText}>You haven't blocked anyone. Blocked users can't see your messages in event chat.</Text>
        ) : (
          <View style={styles.groupGlass}>
            <View style={styles.group}>
              {blockedUsers.map((user, index) => (
                <View key={user.id} style={[styles.row, index === blockedUsers.length - 1 && styles.rowLast]}>
                  {user.profilePictureUrl ? (
                    <Image source={{ uri: user.profilePictureUrl }} style={styles.avatar} />
                  ) : (
                    <View style={styles.avatarFallback}>
                      <Text style={styles.avatarFallbackText}>{user.fullName.charAt(0).toUpperCase()}</Text>
                    </View>
                  )}
                  <View style={styles.rowText}>
                    <Text style={styles.label}>{user.fullName}</Text>
                  </View>
                  <TouchableOpacity onPress={() => handleUnblock(user)} disabled={isUnblocking} hitSlop={8}>
                    <Text style={styles.unblockLink}>Unblock</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
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
    textAlign: 'center',
    marginTop: spacing.xl,
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    gap: spacing.sm,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  rowText: {
    flex: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text,
  },
  unblockLink: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.brandPink,
  },
});

export default BlockedUsersScreen;
