import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import GlassSurface from '../../components/common/GlassSurface';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MOCK_USER } from '../../data/mockEvents';
import { RootStackParamList } from '../../navigation/types';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { borderRadius } from '../../theme/borderRadius';
import { Text } from '../../components/common/Text';

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;

type MenuItem = {
  icon: string;
  label: string;
  subtitle?: string;
  onPress: (nav: Props['navigation']) => void;
};

const MENU_ITEMS: MenuItem[] = [
  {
    icon: '✏️',
    label: 'Edit Profile',
    onPress: (nav) => nav.navigate('EditProfile'),
  },
  {
    icon: '❤️',
    label: 'Saved Events',
    subtitle: `${MOCK_USER.savedCount} events`,
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

const ProfileScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();

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
          <Text style={styles.avatar}>{MOCK_USER.avatar}</Text>
        </View>
        <Text style={styles.name}>
          {MOCK_USER.firstName} {MOCK_USER.lastName}
        </Text>
        <Text style={styles.username}>{MOCK_USER.username}</Text>
        <Text style={styles.location}>📍 {MOCK_USER.city}, India</Text>

        <GlassSurface style={styles.statsGlass} contentStyle={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{MOCK_USER.eventsAttended}</Text>
            <Text style={styles.statLabel}>Events</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{MOCK_USER.savedCount}</Text>
            <Text style={styles.statLabel}>Saved</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>4</Text>
            <Text style={styles.statLabel}>Bookings</Text>
          </View>
        </GlassSurface>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.sectionTitle}>Account</Text>
        {MENU_ITEMS.map((item) => (
          <TouchableOpacity key={item.label} onPress={() => item.onPress(navigation)} activeOpacity={0.7}>
            <GlassSurface style={styles.menuGlass} contentStyle={styles.menuItem}>
              <Text style={styles.menuIcon}>{item.icon}</Text>
              <View style={styles.menuText}>
                <Text style={styles.menuLabel}>{item.label}</Text>
                {item.subtitle ? (
                  <Text style={styles.menuSub}>{item.subtitle}</Text>
                ) : null}
              </View>
              <Text style={styles.chevron}>›</Text>
            </GlassSurface>
          </TouchableOpacity>
        ))}

        <View style={styles.memberSince}>
          <Text style={styles.memberText}>Member since {MOCK_USER.memberSince}</Text>
        </View>
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
  },
  name: {
    fontSize: 22,
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
    width: '100%',
    marginTop: spacing.lg,
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
    fontSize: 20,
    fontWeight: '700',
    color: colors.white,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  scroll: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  sectionTitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
      fontFamily: 'ZalandoSansExpanded_600SemiBold'
},
  menuGlass: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginBottom: spacing.sm,
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
    fontSize: 16,
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
