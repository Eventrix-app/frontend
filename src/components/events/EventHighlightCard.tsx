import React, { useMemo } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/spacing';
import { FallbackImage } from '../common/FallbackImage';

export interface HighlightItem {
  id: string;
  thumbnail: any;
  /**
   * Never rendered — the tile shows only the reel. Kept because it is the sole
   * human-readable description of an otherwise bare image, and becomes the accessibility
   * label so the card is not silent to a screen reader.
   */
  title: string;
}

interface Props {
  item: HighlightItem;
  onPress: () => void;
}

// Memoized: these render inside lists that re-render whenever the parent screen does.
// Props are compared shallowly, so this only pays off where the parent passes stable
// values — the screens now memoize their derived arrays and callbacks for that reason.
export const EventHighlightCard: React.FC<Props> = React.memo(({ item, onPress }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    // The card is the reel frame and nothing else — no caption, no play glyph, no view
    // count. The old wrapper View existed only to stack text beneath the image, so it goes
    // with the text.
    //
    // item.title is not drawn, but it is the only human-readable description this tile has:
    // without it the card is a bare image and announces nothing to a screen reader, so it
    // becomes the accessibility label rather than being dropped.
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.9}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={item.title}
    >
      <FallbackImage source={item.thumbnail} style={styles.thumb} resizeMode="cover" />
    </TouchableOpacity>
  );
});
EventHighlightCard.displayName = 'EventHighlightCard';

// Exactly 9:16 — the shape reels are shot in — so a thumbnail fills the tile with no
// letterboxing and no crop. 180 wide puts two cards plus a peek of the third on a typical
// phone, which is what tells the user the strip scrolls.
const CARD_WIDTH = 180;
const CARD_HEIGHT = (CARD_WIDTH * 16) / 9;

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    marginRight: spacing.md,
    borderRadius: 14,
    overflow: 'hidden',
    // Shows through until the image decodes, and stays visible behind a transparent or
    // failed one instead of leaving a hole in the strip.
    backgroundColor: colors.backgroundSecondary,
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
});
