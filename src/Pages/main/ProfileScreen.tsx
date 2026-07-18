import React from 'react';
import { Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { borderRadius } from '../../theme/borderRadius';
import { Text } from '../../components/common/Text';
import { useGetMeQuery } from '../../store/services/userApi';
import { useGetMyEnrollmentsQuery, useGetMyEventsQuery, useGetMyFavoritesQuery } from '../../store/services/eventsApi';

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;

type MenuItem = {
  icon: string;
  label: string;
  subtitle?: string;
  onPress: (nav: Props['navigation']) => void;
};

const ProfileScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { data: me } = useGetMeQuery();
  const { data: enrollments = [] } = useGetMyEnrollmentsQuery();
  const { data: favorites = [] } = useGetMyFavoritesQuery();
  const { data: myEvents = [] } = useGetMyEventsQuery();

  // "Events" here means events this account has created/organizes, not attended — the
  // "Bookings" stat right next to it already covers the enrolled/attended side, so having
  // both measure enrollment would be redundant. findMyEvents returns [] for an account with
  // no organizer profile, so this is safe to show for plain participants too.
  const createdEventsCount = myEvents.length;
  const savedCount = favorites.length;
  const bookingsCount = enrollments.length;

  const displayName = (me?.fullName ?? '').trim() || me?.email || '';
  const initial = displayName.charAt(0).toUpperCase() || '?';
  const memberSince = me?.createdAt
    ? new Date(me.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    : '';

  const menuItems: MenuItem[] = [
    {
      icon: '✏️',
      label: 'Edit Profile',
      onPress: (nav) => nav.navigate('EditProfile'),
    },
    {
      icon: '❤️',
      label: 'Saved Events',
      subtitle: `${savedCount} event${savedCount === 1 ? '' : 's'}`,
      onPress: (nav) => nav.navigate('SavedEvents'),
    },
    {
      icon: '🎫',
      label: 'My Bookings',
      onPress: (nav) => nav.navigate('Main', { screen: 'Bookings' }),
    },
    {
      icon: '➕',
      label: 'Create Event',
      onPress: (nav) => nav.navigate('CreateEvent', {}),
    },
    {
      icon: '📅',
      label: 'My Events',
      subtitle: `${createdEventsCount} event${createdEventsCount === 1 ? '' : 's'}`,
      onPress: (nav) => nav.navigate('MyEvents'),
    },
    {
      icon: '🔔',
      label: 'Notifications',
      onPress: (nav) => nav.navigate('Notifications'),
    },
    {
      icon: '⚙️',
      label: 'Settings',
      onPress: (nav) => nav.navigate('Settings'),
    },
  ];

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[colors.brandPink, '#ff6b8a']}
        style={[styles.header, { paddingTop: insets.top + spacing.md }]}
      >
        <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View style={styles.avatarWrap}>
          {me?.profilePictureUrl ? (
            <Image source={{ uri: me.profilePictureUrl }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatar}>{initial}</Text>
          )}
        </View>
        <Text style={styles.name}>{displayName || 'Your Profile'}</Text>
        {me?.email ? <Text style={styles.username}>{me.email}</Text> : null}
        {me?.city ? <Text style={styles.location}>📍 {me.city}</Text> : null}

        <View style={styles.statsGlass}>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{createdEventsCount}</Text>
              <Text style={styles.statLabel}>Events</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{savedCount}</Text>
              <Text style={styles.statLabel}>Saved</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{bookingsCount}</Text>
              <Text style={styles.statLabel}>Bookings</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.sectionTitle}>Account</Text>
        {menuItems.map((item) => (
          <TouchableOpacity key={item.label} onPress={() => item.onPress(navigation)} activeOpacity={0.7}>
            <View style={styles.menuGlass}>
              <View style={styles.menuItem}>
                <Text style={styles.menuIcon}>{item.icon}</Text>
                <View style={styles.menuText}>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  {item.subtitle ? (
                    <Text style={styles.menuSub}>{item.subtitle}</Text>
                  ) : null}
                </View>
                <Text style={styles.chevron}>›</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}

        {memberSince ? (
          <View style={styles.memberSince}>
            <Text style={styles.memberText}>Member since {memberSince}</Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.neutralBg,
  },
  header: {
    alignItems: 'center',
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.md,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
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
  backText: {
    color: colors.white,
    fontSize: 22,
  },
  avatarWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    borderWidth: 3,
    borderColor: colors.white,
  },
  avatar: {
    fontSize: 40,
    color: colors.white,
    fontWeight: '700',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 44,
  },
  name: {
    fontSize: 18,
    fontFamily: 'ZalandoSansExpanded_700Bold',
    color: colors.white,
  },
  username: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  location: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    marginTop: spacing.xs,
  },
  statsGlass: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: colors.white,
    width: '100%',
    marginTop: spacing.lg,
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
  statsRow: {
    flexDirection: 'row',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    justifyContent: 'space-around',
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.borderLight,
  },
  scroll: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  sectionTitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
      fontFamily: 'ZalandoSansExpanded_600SemiBold'
},
  menuGlass: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: colors.white,
    marginBottom: spacing.sm,
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
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  menuIcon: {
    fontSize: 22,
    width: 32,
    textAlign: 'center',
  },
  menuText: {
    flex: 1,
  },
  menuLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text,
  },
  menuSub: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  chevron: {
    fontSize: 22,
    color: colors.textSecondary,
  },
  memberSince: {
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  memberText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
});

export default ProfileScreen;
