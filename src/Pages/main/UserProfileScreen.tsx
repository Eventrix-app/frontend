import React, { useCallback, useMemo } from 'react';
import { FlatList, Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/spacing';
import { borderRadius } from '../../theme/borderRadius';
import { Text } from '../../components/common/Text';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { PersonIcon } from '../../components/common/Icons';
import Skeleton from '../../components/common/Skeleton';
import { FallbackImage } from '../../components/common/FallbackImage';
import { useGetPublicProfileQuery } from '../../store/services/userApi';
import { FeedShort, useGetShortsByUploaderQuery } from '../../store/services/shortsApi';

type Props = NativeStackScreenProps<RootStackParamList, 'UserProfile'>;

const COLUMNS = 3;

/**
 * Another user's public profile, reached by tapping the author of a reel.
 *
 * Deliberately separate from ProfileScreen's OrganizerProfile branch: that one loads an
 * organizer record, which most reel uploaders — ordinary attendees — do not have, so it
 * would 404 for them. This shows only what any viewer is allowed to see.
 */
const UserProfileScreen: React.FC<Props> = ({ navigation, route }) => {
  const { userId } = route.params;
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { data: profile, isLoading: isLoadingProfile, isError } = useGetPublicProfileQuery(userId);
  const { data: reels, isLoading: isLoadingReels } = useGetShortsByUploaderQuery({ userId });

  const openReel = useCallback(
    () => navigation.navigate('Main', { screen: 'Shorts' }),
    [navigation],
  );

  const renderReel = useCallback(
    ({ item }: { item: FeedShort }) => (
      <TouchableOpacity style={styles.tile} activeOpacity={0.85} onPress={openReel}>
        {/* A reel has no generated thumbnail, so this falls back to the event's cover and
            then to FallbackImage's own placeholder. Rendering a paused video per tile would
            mean a decoder per cell for a grid the user is only scanning. */}
        <FallbackImage
          source={
            item.thumbnailUrl
              ? { uri: item.thumbnailUrl }
              : item.event?.coverImageUrl
                ? { uri: item.event.coverImageUrl }
                : undefined
          }
          style={styles.tileImage}
        />
      </TouchableOpacity>
    ),
    [openReel, styles],
  );

  const header = (
    <View style={styles.header}>
      {isLoadingProfile ? (
        <>
          <Skeleton width={88} height={88} variant="circle" />
          <Skeleton width={160} height={18} style={styles.headerLine} />
          <Skeleton width={110} height={13} />
        </>
      ) : (
        <>
          {profile?.profilePictureUrl ? (
            <Image source={{ uri: profile.profilePictureUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <PersonIcon color={colors.textSecondary} size={36} />
            </View>
          )}
          <Text style={styles.name}>{profile?.fullName ?? 'Eventrix user'}</Text>
          <Text style={styles.meta}>
            {reels ? `${reels.total} reel${reels.total === 1 ? '' : 's'}` : ' '}
          </Text>
        </>
      )}
    </View>
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScreenHeader title="Profile" onBack={() => navigation.goBack()} />

      {isError ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>This profile isn't available.</Text>
        </View>
      ) : (
        <FlatList
          data={reels?.shorts ?? []}
          keyExtractor={(item) => item.id}
          renderItem={renderReel}
          numColumns={COLUMNS}
          ListHeaderComponent={header}
          ListEmptyComponent={
            isLoadingReels ? (
              <View style={styles.gridSkeleton}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} width="31%" height={150} />
                ))}
              </View>
            ) : (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No reels yet.</Text>
              </View>
            )
          }
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
          columnWrapperStyle={styles.column}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.neutralBg },
  content: { paddingHorizontal: spacing.md },
  header: { alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.lg },
  headerLine: { marginTop: spacing.sm },
  avatar: { width: 88, height: 88, borderRadius: 44 },
  avatarFallback: { backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: spacing.sm },
  meta: { fontSize: 13, color: colors.textSecondary },
  column: { gap: spacing.xs, marginBottom: spacing.xs },
  tile: { flex: 1 / COLUMNS, aspectRatio: 9 / 16 },
  tileImage: { width: '100%', height: '100%', borderRadius: borderRadius.sm },
  gridSkeleton: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    justifyContent: 'space-between',
  },
  empty: { paddingVertical: spacing.xxl, alignItems: 'center' },
  emptyText: { fontSize: 14, color: colors.textSecondary },
});

export default UserProfileScreen;
