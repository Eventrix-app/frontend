import React, { useMemo } from 'react';
import { Image, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/spacing';
import { RightArrow } from '../common/Icons';
import { Text } from '../common/Text';

// These ship as real PNGs, not SVGs — the original .svg files in this folder are actually
// a base64-embedded PNG wrapped in an <svg> shell (a Figma export artifact), which isn't a
// real vector image and isn't decodable by RN's Image on Android/iOS (only a browser's
// native <img> renders that wrapper, which is why these were invisible on-device). require()
// rather than an ES import, matching every other image asset in this app — there's no
// `declare module '*.png'` ambient type for the import form to type-check against.
const MusicIcon = require('../../../assets/home-screen-categories/music.png');
const TechIcon = require('../../../assets/home-screen-categories/tech.png');
const SportsIcon = require('../../../assets/home-screen-categories/sport.png');
const HealthIcon = require('../../../assets/home-screen-categories/health.png');

export interface CategoryItem {
  key: string;
  label: string;
  Icon: any; // now an image source object, not a component
  backgroundColor: string;
}

export const CATEGORIES: CategoryItem[] = [
  { key: 'music', label: 'Music', Icon: MusicIcon, backgroundColor: '#F3E8FF' },
  { key: 'tech', label: 'Tech', Icon: TechIcon, backgroundColor: '#E0F2FE' },
  { key: 'sports', label: 'Sports', Icon: SportsIcon, backgroundColor: '#DCFCE7' },
  { key: 'health', label: 'Health', Icon: HealthIcon, backgroundColor: '#FFE4E6' },
];

interface Props {
  item: CategoryItem;
  onPress?: (key: string) => void;
}

export const CategoryIconCard: React.FC<Props> = ({ item, onPress }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <TouchableOpacity
      style={styles.wrap}
      activeOpacity={0.8}
      onPress={() => onPress?.(item.key)}
    >
      <View style={[styles.iconBox, { backgroundColor: item.backgroundColor }]}>
          <Image source={item.Icon} style={{ width: 48, height: 48,marginBottom: -3 }} resizeMode="contain" />
      </View>
      <Text style={styles.label}>{item.label}</Text>
    </TouchableOpacity>
  );
};


type ViewAllProps = {
  onPress?: () => void;
};

export const ViewAllCategoryIconCard: React.FC<ViewAllProps> = ({ onPress }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <TouchableOpacity style={styles.wrap} activeOpacity={0.8} onPress={onPress}>
      <View style={[styles.iconBox, styles.viewAllIconBox]}>
        <View style={styles.viewAllGlass}>
          <View style={styles.viewAllContent}>
            <RightArrow color={colors.brandPink} size={18} />
          </View>
        </View>
      </View>
      <Text style={styles.label}>View All</Text>
    </TouchableOpacity>
  );
};

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
 wrap: {
    alignItems: 'center',
    width: 80,
    marginRight: spacing.md,
  },
 iconBox: {
  width: 64,
  height: 64,
  borderRadius: 18,
  alignItems: 'center',
  justifyContent: 'flex-end',   // was 'center'
  overflow: 'visible',          // lets the icon bleed slightly past the bottom edge, matching the reference
  marginBottom: spacing.xs ?? 6,
},
  viewAllIconBox: {
    backgroundColor: '#FFF1F5',
    overflow: 'hidden',
  },
  viewAllGlass: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
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
  viewAllContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
});