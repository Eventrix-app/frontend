import React, { useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/spacing';
import { FallbackImage } from '../common/FallbackImage';
import { PlayIcon } from '../common/Icons';

export interface HighlightItem {
  id: string;
  // The reel's actual owner — needed to jump to it directly, since it may belong to any
  // organizer, not just the viewer (see openShort in HomeScreen.tsx).
  uploaderUserId: string;
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
  onPress: (id: string, uploaderUserId: string) => void;
}

// Memoized: these render inside lists that re-render whenever the parent screen does.
// Props are compared shallowly, so this only pays off where the parent passes stable
// values — the screens now memoize their derived arrays and callbacks for that reason.
export const EventHighlightCard: React.FC<Props> = React.memo(({ item, onPress }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    // No caption or view count — the tile is the reel frame plus the one affordance that
    // says it is a reel rather than a photo.
    //
    // item.title is not drawn, but it is the only human-readable description this tile has:
    // without it the card is a bare image and announces nothing to a screen reader, so it
    // becomes the accessibility label rather than being dropped.
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.9}
      onPress={() => onPress(item.id, item.uploaderUserId)}
      accessibilityRole="button"
      accessibilityLabel={item.title}
    >
      <FallbackImage source={item.thumbnail} style={styles.thumb} resizeMode="cover" />
      {/* pointerEvents none so the glyph never swallows the tap meant for the card.
          The scrim disc is what keeps it legible: a bare white triangle vanishes against a
          pale or busy frame, and these thumbnails are arbitrary user video. */}
      <View style={styles.playOverlay} pointerEvents="none">
        <View style={styles.playDisc}>
          {/* Nudged right by a hair — a triangle's visual centre sits left of its bounding
              box, so centring the box makes it look off-centre in the circle. */}
          <PlayIcon color="#FFFFFF" size={26} />
        </View>
      </View>
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
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playDisc: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    // Fixed rgba, not a theme token: this sits on video artwork, which is neither light nor
    // dark surface, so it must not flip with the theme.
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.65)',
    // Offsets the triangle's left-heavy visual weight inside the circle.
    paddingLeft: 3,
  },
});
