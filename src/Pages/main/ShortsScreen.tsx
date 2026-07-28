import React, { useCallback, useState } from 'react';
import {
  FlatList,
  LayoutChangeEvent,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MOCK_SHORTS } from '../../data/mockEvents';
import { RootStackParamList } from '../../navigation/types';
import { spacing } from '../../theme/spacing';
import { Text } from '../../components/common/Text';
import { SearchIcon, PersonIcon, ChatIcon, HeartIcon, MusicNoteIcon, ShareArrowIcon } from '../../components/common/Icons';
import { CreateReelSheet } from '../../components/events/CreateReelSheet';

const ShortsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [createOpen, setCreateOpen] = useState(false);

  // Each slide is sized from the list's *measured* viewport rather than
  // Dimensions.get('window').height minus a hardcoded 94px for the tab bar. That constant
  // was wrong on most devices: this app runs edge-to-edge (android.edgeToEdgeEnabled), so
  // the window height includes the system bars, and the real tab-bar height varies with
  // gesture vs 3-button navigation. More importantly, `pagingEnabled` snaps to the
  // FlatList's own height — so whenever the slide height disagreed with it, every swipe
  // accumulated a little more offset, which is why reels drifted out of alignment and the
  // previous caption bled in at the top of the next one. Measuring makes them equal by
  // construction, on any device.
  const [slideHeight, setSlideHeight] = useState<number | null>(null);
  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    setSlideHeight((prev) => (prev === h ? prev : h));
  }, []);

  const openCreate = useCallback(() => setCreateOpen(true), []);
  const closeCreate = useCallback(() => setCreateOpen(false), []);
  const startReel = useCallback(
    (eventId: string) => {
      setCreateOpen(false);
      navigation.navigate('RecordReel', { eventId });
    },
    [navigation],
  );

  return (
    <View style={styles.root} onLayout={handleLayout}>
      <FlatList
        data={MOCK_SHORTS}
        keyExtractor={(item) => item.id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        // Nothing renders until the viewport has been measured — a first pass at the wrong
        // height would let the pager settle on a bad offset before the correction lands.
        renderItem={({ item }) => slideHeight === null ? null : (
          <View style={[styles.slide, { height: slideHeight }]}>
            <LinearGradient
              colors={item.gradient as [string, string]}
              style={StyleSheet.absoluteFill}
            />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.75)']}
              style={styles.bottomFade}
            />

            <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
              <Text style={styles.topTitle}>← Shorts</Text>
              <View style={styles.topActions}>
                <TouchableOpacity onPress={openCreate} hitSlop={8} accessibilityRole="button" accessibilityLabel="Create a reel">
                  <Text style={styles.createIcon}>＋</Text>
                </TouchableOpacity>
                <SearchIcon color="#FFFFFF" size={22} />
                <Text style={styles.topIcon}>⋮</Text>
              </View>
            </View>

            <View style={styles.bottom}>
              <View style={styles.creator}>
                <View style={styles.avatar}>
                  <PersonIcon color="#000000" size={16} />
                </View>
                <View>
                  <Text style={styles.userName}>{item.user}</Text>
                  <Text style={styles.handle}>{item.handle}</Text>
                </View>
                <Text style={styles.caption}>
                  {item.title} {item.tags.join(' ')}
                </Text>
              </View>

              <View style={styles.actions}>
                {[
                  { label: 'Like', Icon: HeartIcon },
                  { label: String(item.comments), Icon: ChatIcon },
                  { label: 'Share', Icon: ShareArrowIcon },
                ].map((action) => (
                  <TouchableOpacity key={action.label} style={styles.actionBtn}>
                    <action.Icon color="#FFFFFF" size={24} />
                    <Text style={styles.actionLabel}>{action.label}</Text>
                  </TouchableOpacity>
                ))}
                <View style={styles.musicBtn}>
                  <MusicNoteIcon color="#000000" size={16} />
                </View>
              </View>
            </View>
          </View>
        )}
      />

      <CreateReelSheet visible={createOpen} onClose={closeCreate} onSelectEvent={startReel} />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  slide: {
    width: '100%',
  },
  createIcon: { color: '#FFFFFF', fontSize: 24, fontWeight: '300' },
  bottomFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 200,
  },
  topBar: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 2,
  },
  topTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
      fontFamily: 'ZalandoSansExpanded_500Medium'
},
  topActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  topIcon: {
    fontSize: 22,
    color: '#FFFFFF',
  },
  bottom: {
    position: 'absolute',
    bottom: spacing.lg,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  creator: {
    flex: 1,
    gap: spacing.sm,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  handle: {
    color: '#F2F2EF',
    fontSize: 10,
  },
  caption: {
    color: '#FFFFFF',
    fontSize: 12,
    marginTop: spacing.xs,
  },
  actions: {
    alignItems: 'center',
    gap: spacing.md,
  },
  actionBtn: {
    alignItems: 'center',
  },
  actionIcon: {
    fontSize: 24,
    color: '#FFFFFF',
  },
  actionLabel: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  musicBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ShortsScreen;
