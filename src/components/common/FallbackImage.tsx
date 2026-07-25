import React, { useState } from 'react';
import { Image, ImageResizeMode, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

const SKELETON_IMG = require('../../../assets/skeleton/imageframe.png');

interface Props {
  source: unknown; // already-resolved <Image> source — a {uri} object or a require()'d local asset
  style?: StyleProp<ViewStyle>;
  resizeMode?: ImageResizeMode;
}

// Shared onLoad/onError fallback pattern — previously only implemented once, in
// EventDetailsScreen's GalleryThumb. Every other card that renders a backend-supplied
// event image (EventInterestCard, MainEventCard, FeaturedCarousel, EventHighlightCard) had
// no onError handler at all, so a 404'd/expired image URL left permanent blank space
// instead of a visible fallback. Renders the same skeleton placeholder asset while loading
// or once a real load has failed, and the real image on top once it decodes successfully.
export const FallbackImage: React.FC<Props> = ({ source, style, resizeMode = 'cover' }) => {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const hasSource = !!source;

  return (
    <View style={[styles.wrap, style]}>
      {(!hasSource || failed || !loaded) && (
        <Image source={SKELETON_IMG} style={StyleSheet.absoluteFill} resizeMode="cover" />
      )}
      {hasSource && !failed && (
        <Image
          source={source as any}
          style={[StyleSheet.absoluteFill, { opacity: loaded ? 1 : 0 }]}
          resizeMode={resizeMode}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
  },
});
