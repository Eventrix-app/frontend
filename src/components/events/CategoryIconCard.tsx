import React, { useMemo } from 'react';
import { Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from '../common/Text';
import { RightArrow } from '../common/Icons';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/spacing';
import { Category } from '../../store/services/userApi';

const FALLBACK_ICON = require('../../../assets/shared/placeholders/image-frame.png');

// Fixed box rather than the organizer's raw uploaded pixel size (200-1000px+, whatever
// they happened to export) — rendering icons at that native size is what forced Explore's
// horizontal-wrap grid down to one icon per row (reading as a vertical stack) and blew out
// Home's category rail. `resizeMode="contain"` keeps each icon's own aspect ratio inside
// this box instead of stretching/cropping it.
const ICON_SIZE = 95;

interface Props {
  item: Category;
  onPress?: (id: string) => void;
}

export const CategoryIconCard: React.FC<Props> = React.memo(({ item, onPress }) => {
  return (
    <TouchableOpacity activeOpacity={0.8} onPress={() => onPress?.(item.id)}>
      <Image
        source={item.iconUrl ? { uri: item.iconUrl } : FALLBACK_ICON}
        style={styles.icon}
        resizeMode="contain"
        accessibilityLabel={item.name}
      />
    </TouchableOpacity>
  );
});
CategoryIconCard.displayName = 'CategoryIconCard';

type ViewAllProps = {
  onPress?: () => void;
};

export const ViewAllCategoryIconCard: React.FC<ViewAllProps> = React.memo(({ onPress }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <TouchableOpacity style={styles.viewAllButton} activeOpacity={0.8} onPress={onPress}>
      <Text style={styles.viewAllLabel}>View All</Text>
      <RightArrow color={colors.brandPink} size={16} />
    </TouchableOpacity>
  );
});
ViewAllCategoryIconCard.displayName = 'ViewAllCategoryIconCard';

const styles = StyleSheet.create({
  icon: { width: ICON_SIZE, height: ICON_SIZE },
});

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    alignSelf: 'center',
  },
  viewAllLabel: { fontSize: 13, fontWeight: '600', color: colors.brandPink },
});
