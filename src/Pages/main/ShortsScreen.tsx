import React from 'react';
import {
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MOCK_SHORTS } from '../../data/mockEvents';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

const { height } = Dimensions.get('window');

const ShortsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.root}>
      <FlatList
        data={MOCK_SHORTS}
        keyExtractor={(item) => item.id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={[styles.slide, { height: height - 94 }]}>
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
                <Text style={styles.topIcon}>🔍</Text>
                <Text style={styles.topIcon}>⋮</Text>
              </View>
            </View>

            <View style={styles.bottom}>
              <View style={styles.creator}>
                <View style={styles.avatar}>
                  <Text>👤</Text>
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
                  { label: 'Like', value: '' },
                  { label: String(item.comments), value: '💬' },
                  { label: 'Share', value: '↗' },
                ].map((action) => (
                  <TouchableOpacity key={action.label} style={styles.actionBtn}>
                    <Text style={styles.actionIcon}>{action.value || '❤️'}</Text>
                    <Text style={styles.actionLabel}>{action.label}</Text>
                  </TouchableOpacity>
                ))}
                <View style={styles.musicBtn}>
                  <Text>🎵</Text>
                </View>
              </View>
            </View>
          </View>
        )}
      />
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
    color: colors.white,
    fontSize: 18,
    fontWeight: '500',
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  topActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  topIcon: {
    fontSize: 22,
    color: colors.white,
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
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '500',
  },
  handle: {
    color: '#F2F2EF',
    fontSize: 10,
  },
  caption: {
    color: colors.white,
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
    color: colors.white,
  },
  actionLabel: {
    color: colors.white,
    fontSize: 12,
  },
  musicBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ShortsScreen;
