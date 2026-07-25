import React, { useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/spacing';
import { Text } from '../common/Text';
import { FallbackImage } from '../common/FallbackImage';

export interface HighlightItem {
  id: string;
  thumbnail: any;
  title: string;
  views: string; // e.g. "14k views"
  postedAgo: string; // e.g. "40m ago"
}

interface Props {
  item: HighlightItem;
  onPress: () => void;
}

export const EventHighlightCard: React.FC<Props> = ({ item, onPress }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <TouchableOpacity style={styles.wrap} activeOpacity={0.9} onPress={onPress}>
      <View style={styles.thumbWrap}>
        <FallbackImage source={item.thumbnail} style={styles.thumb} resizeMode="cover" />

        <View style={styles.playOverlay}>
          <Text style={styles.playIcon}>▶</Text>
        </View>

        <View style={styles.viewsBadge}>
          <Text style={styles.viewsText} numberOfLines={1}>
            {item.views} · {item.postedAgo}
          </Text>
        </View>
      </View>

      <Text style={styles.title} numberOfLines={1}>
        {item.title}
      </Text>
    </TouchableOpacity>
  );
};

const CARD_WIDTH = 110;

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  wrap: {
    width: CARD_WIDTH,
    marginRight: spacing.md,
  },
  thumbWrap: {
    width: CARD_WIDTH,
    height: 150,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: colors.backgroundSecondary,
    position: 'relative',
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    textAlign: 'center',
    textAlignVertical: 'center',
    backgroundColor: 'rgba(255,255,255,0.85)',
    color: colors.brandPink,
    fontSize: 14,
    overflow: 'hidden',
    lineHeight: 32,
    paddingLeft: 2,
  },
  viewsBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  viewsText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '600',
  },
  title: {
    fontSize: 12,
    color: colors.text,
    marginTop: 6,
      fontFamily: 'ZalandoSansExpanded_600SemiBold'
},
});
