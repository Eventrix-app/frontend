import React, { useMemo } from 'react';
import { Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from '../common/Text';
import { RightArrow } from '../common/Icons';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/spacing';
import { Category } from '../../store/services/userApi';
import { useNaturalImageSize } from '../../hooks/useNaturalImageSize';

const FALLBACK_ICON = require('../../../assets/shared/placeholders/image-frame.png');
const FALLBACK_SIZE = Image.resolveAssetSource(FALLBACK_ICON);

interface Props {
  item: Category;
  onPress?: (id: string) => void;
}

// Renders the category icon only, at its own uploaded pixel size — no title, no forced
// crop/stretch box. Row/grid spacing is handled by the parent container's `gap`, not by
// giving every icon a shared size here.
export const CategoryIconCard: React.FC<Props> = React.memo(({ item, onPress }) => {
  const remoteSize = useNaturalImageSize(item.iconUrl);
  const size = item.iconUrl ? remoteSize : FALLBACK_SIZE;
  if (!size) return null;
  return (
    <TouchableOpacity activeOpacity={0.8} onPress={() => onPress?.(item.id)}>
      <Image
        source={item.iconUrl ? { uri: item.iconUrl } : FALLBACK_ICON}
        style={{ width: size.width, height: size.height }}
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
