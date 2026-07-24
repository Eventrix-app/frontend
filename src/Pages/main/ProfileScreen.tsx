import React, { useMemo, useRef } from 'react';
import { ActivityIndicator, FlatList, Linking, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/spacing';
import { borderRadius } from '../../theme/borderRadius';
import { Text } from '../../components/common/Text';
import { LocationPin } from '../../components/common/Icons';
import { useDisplayAddress } from '../../hooks/useDisplayAddress';
import { useGetMeQuery } from '../../store/services/userApi';
import { useGetMyEnrollmentsQuery, useGetMyEventsQuery, useGetMyFavoritesQuery } from '../../store/services/eventsApi';
import {
  useFollowOrganizerMutation,
  useGetOrganizerEventsQuery,
  useGetOrganizerProfileQuery,
  useUnfollowOrganizerMutation,
} from '../../store/services/organizerApi';
import { EventInterestCard } from '../../components/events/EventInterestCard';
import { toCardEvent } from '../../utils/eventCardAdapter';
import { showAlert } from '../../utils/crossPlatformAlert';
import { extractErrorMessage } from '../../utils/apiError';
import ProfileHeaderSkeleton from '../../components/common/ProfileHeaderSkeleton';

const bgImage = require('../../../assets/bg.png');

type Props = NativeStackScreenProps<RootStackParamList, 'Profile' | 'OrganizerProfile'>;

type MenuItem = {
  icon: React.ComponentProps<typeof Feather>['name'];
  label: string;
  subtitle?: string;
  onPress: (nav: Props['navigation']) => void;
};

const EVENT_CARD_WIDTH = 165;
const MEMBER_SINCE_FORMATTER = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' });

function websiteHostname(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

// Soft, colored (not flat-android-gray) shadow — the one directional-shadow treatment used
// on every card surface across both branches, so they read as one system. shadow (brandPink)
// is identical in both themes, so this constant doesn't need to be theme-aware.
const cardShadow = Platform.select({
  android: { elevation: 6 },
  default: {
    shadowColor: '#FF3366',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
  },
});

const ProfileScreen: React.FC<Props> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();

  // Profile (no params) vs OrganizerProfile ({ organizerId }) — the only two routes this
  // component is registered against (see navigation/types.ts + RootNavigator.tsx).
  const routeParams = route.params as { organizerId?: string } | undefined;
  const organizerId = routeParams?.organizerId;
  const isOwnProfile = !organizerId;

  return isOwnProfile ? (
    <SelfProfile navigation={navigation} insets={insets} />
  ) : (
    <OrganizerProfile navigation={navigation} insets={insets} organizerId={organizerId} />
  );
};

// ---------------------------------------------------------------------------
// Self branch — private membership-card view of the logged-in user's own account.
// ---------------------------------------------------------------------------

const SelfProfile: React.FC<{ navigation: Props['navigation']; insets: { top: number; bottom: number } }> = ({
  navigation,
  insets,
}) => {
  const { data: me } = useGetMeQuery();
  const { data: enrollments = [] } = useGetMyEnrollmentsQuery();
  const { data: favorites = [] } = useGetMyFavoritesQuery();
  const { data: myEvents = [] } = useGetMyEventsQuery();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Reachable directly via a push-notification tap (organizer_followed, see
  // navigateForPushData in RootNavigator.tsx), which can land here as the first screen in
  // the stack — goBack() throws "GO_BACK was not handled" with nothing to pop to.
  const handleGoBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Main', { screen: 'Home' });
    }
  };

  // "Events" here means events this account has created/organizes, not attended — the
  // "Bookings" stat right next to it already covers the enrolled/attended side, so having
  // both measure enrollment would be redundant. findMyEvents returns [] for an account with
  // no organizer profile, so this is safe to show for plain participants too.
  const createdEventsCount = myEvents.length;
  const savedCount = favorites.length;
  const bookingsCount = enrollments.length;
  const followingCount = me?.followingCount ?? 0;

  const displayName = (me?.fullName ?? '').trim() || me?.email || '';
  const initial = displayName.charAt(0).toUpperCase() || '?';
  const memberSince = me?.createdAt ? MEMBER_SINCE_FORMATTER.format(new Date(me.createdAt)) : '';
  // Shared with HomeScreen (useDisplayAddress) so both show the exact same resolved
  // location instead of this one showing the raw city field while Home shows the
  // reverse-geocoded address.
  const displayAddress = useDisplayAddress(me);

  const menuItems: MenuItem[] = [
    { icon: 'edit-2', label: 'Edit Profile', onPress: (nav) => nav.navigate('EditProfile') },
    {
      icon: 'bookmark',
      label: 'Saved Events',
      subtitle: `${savedCount} event${savedCount === 1 ? '' : 's'}`,
      onPress: (nav) => nav.navigate('SavedEvents'),
    },
    { icon: 'calendar', label: 'My Bookings', onPress: (nav) => nav.navigate('Main', { screen: 'Bookings' }) },
    { icon: 'plus-circle', label: 'Create Event', onPress: (nav) => nav.navigate('CreateEvent', {}) },
    {
      icon: 'grid',
      label: 'My Events',
      subtitle: `${createdEventsCount} event${createdEventsCount === 1 ? '' : 's'}`,
      onPress: (nav) => nav.navigate('MyEvents'),
    },
    { icon: 'bell', label: 'Notifications', onPress: (nav) => nav.navigate('Notifications') },
    { icon: 'settings', label: 'Settings', onPress: (nav) => nav.navigate('Settings') },
  ];

  return (
    <View style={styles.root}>
      <LinearGradient colors={[colors.brandPink, '#F43362']} style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.headerBgWrap}>
          <Image source={bgImage} style={styles.headerBg} contentFit="cover" />
        </View>

        <TouchableOpacity style={styles.back} onPress={handleGoBack} hitSlop={8}>
          <Feather name="arrow-left" size={20} color={colors.white} />
        </TouchableOpacity>

        <View style={styles.avatarRing}>
          {me?.profilePictureUrl ? (
            <Image source={{ uri: me.profilePictureUrl }} style={styles.avatarImage} />
          ) : (
            <Text variant="h2" style={styles.avatarInitial}>{initial}</Text>
          )}
        </View>

        <Text variant="h3" color="white" style={styles.name}>{displayName || 'Your Profile'}</Text>
        {me?.email ? (
          <Text variant="caption" style={styles.headerSubtext}>{me.email}</Text>
        ) : null}
        <View style={styles.locationRow}>
          <LocationPin size={12} color="rgba(255,255,255,0.85)" />
          <Text variant="caption" style={styles.headerSubtext}>{displayAddress}</Text>
        </View>

        <View style={[styles.statsCard, cardShadow]}>
          <StatBlock value={createdEventsCount} label="Events" />
          <View style={styles.statDivider} />
          <StatBlock value={savedCount} label="Saved" />
          <View style={styles.statDivider} />
          <StatBlock value={bookingsCount} label="Bookings" />
          <View style={styles.statDivider} />
          <StatBlock value={followingCount} label="Following" />
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xxl }]}>
        <Text variant="label" style={styles.eyebrow}>Account</Text>

        <View style={[styles.menuCard, cardShadow]}>
          {menuItems.map((item, i) => (
            <TouchableOpacity
              key={item.label}
              onPress={() => item.onPress(navigation)}
              activeOpacity={0.6}
              style={[styles.menuRow, i > 0 && styles.menuRowDivider]}
            >
              <Feather name={item.icon} size={18} color={colors.textSecondary} style={styles.menuIcon} />
              <View style={styles.menuText}>
                <Text variant="label" color="text">{item.label}</Text>
                {item.subtitle ? (
                  <Text variant="caption" color="textSecondary" style={styles.menuSub}>{item.subtitle}</Text>
                ) : null}
              </View>
              <Feather name="chevron-right" size={18} color={colors.placeholder} />
            </TouchableOpacity>
          ))}
        </View>

        {memberSince ? (
          <Text variant="caption" color="textSecondary" style={styles.memberSince}>
            Member since {memberSince}
          </Text>
        ) : null}
      </ScrollView>
    </View>
  );
};

const StatBlock: React.FC<{ value: number; label: string }> = ({ value, label }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.stat}>
      <Text variant="h4" color="brandPink" style={styles.statValue}>{value}</Text>
      <Text variant="caption" color="textSecondary">{label}</Text>
    </View>
  );
};

// ---------------------------------------------------------------------------
// Organizer branch — public pass view of someone else's organizer account.
// ---------------------------------------------------------------------------

const OrganizerProfile: React.FC<{
  navigation: Props['navigation'];
  insets: { top: number; bottom: number };
  organizerId: string;
}> = ({ navigation, insets, organizerId }) => {
  const { data: profile, isLoading, isError, refetch } = useGetOrganizerProfileQuery(organizerId);
  const { data: events = [] } = useGetOrganizerEventsQuery(organizerId);
  const [followOrganizer, { isLoading: isFollowLoading }] = useFollowOrganizerMutation();
  const [unfollowOrganizer, { isLoading: isUnfollowLoading }] = useUnfollowOrganizerMutation();

  // Mutation isLoading only flips true on the next render — same double-tap gap as
  // EventDetailsScreen's isEnrollingRef, closed the same way.
  const isTogglingRef = useRef(false);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const handleToggleFollow = async () => {
    if (!profile || isTogglingRef.current) return;
    isTogglingRef.current = true;
    try {
      if (profile.isFollowing) {
        await unfollowOrganizer(organizerId).unwrap();
      } else {
        await followOrganizer(organizerId).unwrap();
      }
    } catch (e: any) {
      showAlert('Something went wrong', extractErrorMessage(e, 'Please try again.'));
    } finally {
      isTogglingRef.current = false;
    }
  };

  const cardEvents = events.map((event) => toCardEvent(event));

  if (isLoading) {
    return <ProfileHeaderSkeleton />;
  }

  if (isError || !profile) {
    return (
      <View style={[styles.root, styles.center, { paddingTop: insets.top }]}>
        <Text variant="body" color="textSecondary" style={styles.centerText}>Couldn't load this organizer.</Text>
        <View style={styles.errorActions}>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
            <Text variant="button" color="white">Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backLinkBtn} onPress={() => navigation.goBack()}>
            <Text variant="button" color="textSecondary">Go back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const isToggling = isFollowLoading || isUnfollowLoading;
  const memberSince = MEMBER_SINCE_FORMATTER.format(new Date(profile.memberSince));

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.topBarBtn} onPress={() => navigation.goBack()} hitSlop={8}>
          <Feather name="arrow-left" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text variant="label" color="text" numberOfLines={1} style={styles.topBarTitle}>{profile.companyName}</Text>
        <View style={styles.topBarBtn} />
      </View>

      <FlatList
        data={cardEvents}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={cardEvents.length > 0 ? styles.eventsRow : undefined}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xl }]}
        ListHeaderComponent={
          <View style={[styles.organizerCard, cardShadow]}>
            <View style={styles.topRow}>
              <View style={styles.orgAvatarRing}>
                <View style={styles.orgAvatar}>
                  {profile.companyLogoUrl ? (
                    <Image source={{ uri: profile.companyLogoUrl }} style={styles.avatarImage} />
                  ) : (
                    <Feather name="briefcase" size={30} color={colors.textSecondary} />
                  )}
                </View>
              </View>

              <View style={styles.statsRow}>
                <StatBlock value={profile.eventCount} label="Events" />
                <View style={styles.statDivider} />
                <StatBlock value={profile.followerCount} label="Followers" />
              </View>
            </View>

            <View style={styles.identityBlock}>
              <View style={styles.nameRow}>
                <Text variant="h4" color="text">{profile.companyName}</Text>
                {profile.verified && (
                  <View style={styles.verifiedPill}>
                    <Feather name="check-circle" size={12} color={colors.success} />
                    <Text variant="caption" style={styles.verifiedText}>Verified</Text>
                  </View>
                )}
              </View>

              {profile.companyDescription ? (
                <Text variant="body" color="text" style={styles.description}>{profile.companyDescription}</Text>
              ) : null}

              {profile.companyWebsite ? (
                <TouchableOpacity style={styles.websiteRow} onPress={() => Linking.openURL(profile.companyWebsite!)}>
                  <Feather name="external-link" size={13} color={colors.brandPink} />
                  <Text variant="caption" color="brandPink" style={styles.websiteText}>
                    {websiteHostname(profile.companyWebsite)}
                  </Text>
                </TouchableOpacity>
              ) : null}

              <Text variant="caption" color="textSecondary" style={styles.memberSinceInline}>
                Organizing events since {memberSince}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.followBtn, profile.isFollowing && styles.followingBtn]}
              onPress={handleToggleFollow}
              disabled={isToggling}
            >
              {isToggling ? (
                <ActivityIndicator color={profile.isFollowing ? colors.brandPink : colors.white} size="small" />
              ) : (
                <>
                  <Feather
                    name={profile.isFollowing ? 'user-check' : 'user-plus'}
                    size={15}
                    color={profile.isFollowing ? colors.brandPink : colors.white}
                  />
                  <Text variant="button" style={[styles.followBtnText, profile.isFollowing && styles.followingBtnText]}>
                    {profile.isFollowing ? 'Following' : 'Follow'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <EventInterestCard
            event={item as any}
            width={EVENT_CARD_WIDTH}
            onPress={() => navigation.navigate('EventDetails', { eventId: item.id })}
            onRequireAuth={() => navigation.navigate('Auth' as never)}
          />
        )}
        ListHeaderComponentStyle={styles.eventsHeader}
        ListEmptyComponent={
          <View style={styles.emptyEvents}>
            <Feather name="calendar" size={28} color={colors.placeholder} />
            <Text variant="caption" color="textSecondary" style={styles.emptyText}>
              No upcoming events from this organizer right now.
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.neutralBg },
  center: { justifyContent: 'center', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg },
  centerText: { textAlign: 'center' },
  errorActions: { flexDirection: 'row', gap: spacing.sm },
  retryBtn: { backgroundColor: colors.brandPink, borderRadius: borderRadius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  backLinkBtn: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },

  // --- Self header ---
  header: {
    alignItems: 'center',
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.md,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
  },
  headerBgWrap: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  headerBg: {
    position: 'absolute',
    top: -60,
    left: -68,
    width: '135%',
    height: '135%',
    transform: [{ scale: 0.78 }],
    opacity: 0.15,
  },
  back: {
    alignSelf: 'flex-start',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    borderWidth: 3,
    borderColor: colors.white,
    overflow: 'hidden',
  },
  avatarInitial: { fontSize: 36, lineHeight: 40, color: colors.white },
  avatarImage: { width: '100%', height: '100%' },
  name: { textAlign: 'center' },
  headerSubtext: { color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.xs },

  statsCard: {
    borderRadius: borderRadius.lg,
    backgroundColor: colors.white,
    width: '100%',
    marginTop: spacing.lg,
    flexDirection: 'row',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    justifyContent: 'space-around',
  },
  stat: { alignItems: 'center' },
  statValue: { marginBottom: 2 },
  statDivider: { width: 1, alignSelf: 'stretch', backgroundColor: colors.borderLight },

  // --- Self account list ---
  scroll: { padding: spacing.md },
  eyebrow: {
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  menuCard: {
    borderRadius: borderRadius.lg,
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  menuRowDivider: { borderTopWidth: 1, borderTopColor: colors.borderLight },
  menuIcon: { width: 18 },
  menuText: { flex: 1 },
  menuSub: { marginTop: 2 },
  memberSince: { textAlign: 'center', marginTop: spacing.xl },

  // --- Organizer branch ---
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  topBarBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  topBarTitle: { flex: 1, textAlign: 'center', marginHorizontal: spacing.sm },

  organizerCard: {
    borderRadius: borderRadius.lg,
    backgroundColor: colors.white,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  orgAvatarRing: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.lg,
  },
  orgAvatar: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  statsRow: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly' },

  identityBlock: { marginBottom: spacing.md, gap: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.xs },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16,185,129,0.1)',
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  verifiedText: { color: colors.success, fontWeight: '700' },
  description: { marginTop: 2 },
  websiteRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.xs },
  websiteText: { fontWeight: '600' },
  memberSinceInline: { marginTop: spacing.xs },

  followBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.brandPink,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm + 2,
  },
  followingBtn: { backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.borderLight },
  followBtnText: { color: colors.white },
  followingBtnText: { color: colors.text },

  eventsHeader: { marginBottom: 0 },
  eventsRow: { justifyContent: 'space-between' },
  emptyEvents: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  emptyText: { textAlign: 'center', paddingHorizontal: spacing.xl },
});

export default ProfileScreen;
