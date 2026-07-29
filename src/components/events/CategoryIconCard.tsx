import React from 'react';
import { Image, ImageStyle, StyleSheet, TouchableOpacity } from 'react-native';
import { spacing } from '../../theme/spacing';

// Every PNG in assets/home/categories/ is a complete, pre-rendered card: the white
// rounded rect, the border, the category label, the tinted glow at the card's foot, the
// artwork and the drop shadow are all baked into the bitmap. So there is deliberately no
// card styling, no <Text> and no elevation/shadowColor here — anything added would double
// up on pixels the image already contains.
//
// These replace an earlier SvgXml approach that inlined ~400KB of stringified SVG into the
// JS bundle. Each of those SVGs was a Figma export whose artwork was a base64 PNG wrapped in
// a filter chain, so rendering them through react-native-svg meant parsing XML and decoding
// base64 on the JS thread to end up blitting a bitmap anyway — and the Android renderer
// handles those multi-primitive filters poorly enough to blank the cards outright.
//
// The catch is that the eleven files come from two different export passes, and the card
// does not sit in the same place on the 104x104 canvas in each (measured off their alpha
// channels):
//
//                        card box within canvas      label
//   music, tech, sports,  x 12, y 0,  80 x 80        single line
//   health, education,
//   business, view-all
//
//   art, food, gaming,    x  9, y 7,  86 x 90        art & food wrap to two lines
//   travel
//
// Dropped in side by side at their native size the second group would render ~7% larger and
// sit 7px lower, so the row's top edge would visibly stagger. Rather than re-cutting the
// assets, each item carries its own card box and the layout normalises from it: every tile
// is scaled so its *visible card* is TARGET_CARD_W wide, then pushed down so the card tops
// line up. Offsets are expressed as positive marginTop against the lowest card top, because
// pulling the other way needs negative margins and children overflowing their parent inside
// a horizontal ScrollView clip unreliably on Android.
const CANVAS = 104;
const TARGET_CARD_W = 80;

type CardBox = { y: number; w: number };
const BOX_STANDARD: CardBox = { y: 0, w: 80 };
const BOX_WIDE: CardBox = { y: 7, w: 86 };

// Both groups centre their card horizontally on the canvas, so only the vertical offset
// needs correcting — `alignItems: 'center'` on the wrap handles the horizontal axis.
const scaleOf = (box: CardBox) => TARGET_CARD_W / box.w;
const cardTopOf = (box: CardBox) => box.y * scaleOf(box);
const LOWEST_CARD_TOP = Math.max(cardTopOf(BOX_STANDARD), cardTopOf(BOX_WIDE));

const layoutFor = (box: CardBox): ImageStyle => ({
  width: CANVAS * scaleOf(box),
  height: CANVAS * scaleOf(box),
  marginTop: LOWEST_CARD_TOP - cardTopOf(box),
  marginBottom: spacing.xs ?? 6,
});

const STANDARD_LAYOUT = layoutFor(BOX_STANDARD);
const WIDE_LAYOUT = layoutFor(BOX_WIDE);

export interface CategoryItem {
  key: string;
  icon: number;
  layout: ImageStyle;
}

export const CATEGORIES: CategoryItem[] = [
  { key: 'music', icon: require('../../../assets/home/categories/music.png'), layout: STANDARD_LAYOUT },
  { key: 'tech', icon: require('../../../assets/home/categories/tech.png'), layout: STANDARD_LAYOUT },
  { key: 'sports', icon: require('../../../assets/home/categories/sports.png'), layout: STANDARD_LAYOUT },
  { key: 'health', icon: require('../../../assets/home/categories/health.png'), layout: STANDARD_LAYOUT },
  { key: 'education', icon: require('../../../assets/home/categories/education.png'), layout: STANDARD_LAYOUT },
  { key: 'business', icon: require('../../../assets/home/categories/business.png'), layout: STANDARD_LAYOUT },
  { key: 'art', icon: require('../../../assets/home/categories/art.png'), layout: WIDE_LAYOUT },
  { key: 'food', icon: require('../../../assets/home/categories/food.png'), layout: WIDE_LAYOUT },
  { key: 'gaming', icon: require('../../../assets/home/categories/gaming.png'), layout: WIDE_LAYOUT },
  { key: 'travel', icon: require('../../../assets/home/categories/travel.png'), layout: WIDE_LAYOUT },
];

const VIEW_ALL_ICON = require('../../../assets/home/categories/view-all.png');

interface Props {
  item: CategoryItem;
  onPress?: (key: string) => void;
}

export const CategoryIconCard: React.FC<Props> = React.memo(({ item, onPress }) => {
  return (
    <TouchableOpacity
      style={styles.wrap}
      activeOpacity={0.8}
      onPress={() => onPress?.(item.key)}
    >
      <Image source={item.icon} style={item.layout} resizeMode="contain" />
    </TouchableOpacity>
  );
});
CategoryIconCard.displayName = 'CategoryIconCard';

type ViewAllProps = {
  onPress?: () => void;
};

// view-all.png is a standard-box card in the pink treatment (pink border, pink arrow and
// "View All" wordmark), so it renders through exactly the same path as the categories.
export const ViewAllCategoryIconCard: React.FC<ViewAllProps> = React.memo(({ onPress }) => {
  return (
    <TouchableOpacity style={styles.wrap} activeOpacity={0.8} onPress={onPress}>
      <Image source={VIEW_ALL_ICON} style={STANDARD_LAYOUT} resizeMode="contain" />
    </TouchableOpacity>
  );
});
ViewAllCategoryIconCard.displayName = 'ViewAllCategoryIconCard';

// Static: the cards are bitmaps, so nothing here varies with the palette. That also means
// these two components no longer subscribe to the theme, and the StyleSheet is created once
// at module load rather than per render.
//
// `wrap` is the full canvas wide and carries no marginRight: the PNGs bring ~12px of their
// own transparent gutter on each side, which supplies the gap between cards.
const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    width: CANVAS,
  },
});
