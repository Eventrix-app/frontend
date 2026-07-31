import React, { useMemo } from 'react';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from '../common/Text';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/spacing';
import { Category } from '../../store/services/userApi';

const FALLBACK_ICON = require('../../../assets/shared/placeholders/image-frame.png');
const CARD_SIZE = 64;

interface Props {
  item: Category;
  onPress?: (id: string) => void;
}

export const CategoryIconCard: React.FC<Props> = React.memo(({ item, onPress }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <TouchableOpacity style={styles.wrap} activeOpacity={0.8} onPress={() => onPress?.(item.id)}>
      <View style={styles.iconBox}>
        <Image
          source={item.iconUrl ? { uri: item.iconUrl } : FALLBACK_ICON}
          style={styles.icon}
          resizeMode="contain"
        />
      </View>
      <Text style={styles.label} numberOfLines={1}>{item.name}</Text>
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
    <TouchableOpacity style={styles.wrap} activeOpacity={0.8} onPress={onPress}>
      <View style={[styles.iconBox, styles.viewAllBox]}>
        <Text style={styles.viewAllArrow}>{'→'}</Text>
      </View>
      <Text style={styles.label} numberOfLines={1}>View All</Text>
    </TouchableOpacity>
  );
});
ViewAllCategoryIconCard.displayName = 'ViewAllCategoryIconCard';

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  wrap: { alignItems: 'center', width: 76, marginRight: spacing.sm },
  iconBox: {
    width: CARD_SIZE,
    height: CARD_SIZE,
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs ?? 6,
  },
  icon: { width: 36, height: 36 },
  viewAllBox: { borderColor: colors.brandPink },
  viewAllArrow: { fontSize: 20, color: colors.brandPink, fontWeight: '700' },
  label: { fontSize: 11, fontWeight: '600', color: colors.text, textAlign: 'center' },
});
