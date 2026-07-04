import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import GlassSurface from './GlassSurface';

type ScreenHeaderProps = {
  title: string;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  light?: boolean;
};

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  title,
  onBack,
  rightAction,
  light = false,
}) => (
  <View style={styles.row}>
    {onBack ? (
      <GlassSurface style={styles.backGlass} contentStyle={styles.backContent}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} hitSlop={8}>
          <Text style={[styles.back, light && styles.backLight]}>←</Text>
        </TouchableOpacity>
      </GlassSurface>
    ) : (
      <View style={styles.placeholder} />
    )}
    <GlassSurface style={styles.titleGlass} contentStyle={styles.titleContent}>
      <Text style={[styles.title, light && styles.titleLight]} numberOfLines={1}>
        {title}
      </Text>
    </GlassSurface>
    {rightAction ?? <View style={styles.placeholder} />}
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  backGlass: {
    borderRadius: 999,
    overflow: 'hidden',
  },
  backContent: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  back: {
    fontSize: 24,
    color: colors.brandPink,
    fontWeight: '600',
  },
  backLight: {
    color: colors.white,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  titleLight: {
    color: colors.white,
  },
  titleGlass: {
    flex: 1,
    borderRadius: 999,
    overflow: 'hidden',
    marginHorizontal: spacing.sm,
  },
  titleContent: {
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  placeholder: {
    width: 32,
  },
});
