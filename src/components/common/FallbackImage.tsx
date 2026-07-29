import React, { useState } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Image, ImageContentFit } from 'expo-image';

const SKELETON_IMG = require('../../../assets/skeleton/imageframe.png');

interface Props {
  source: unknown; // already-resolved image source — a {uri} object or a require()'d local asset
  style?: StyleProp<ViewStyle>;
  resizeMode?: ImageContentFit;
}

// Shared onLoad/onError fallback pattern — previously only implemented once, in
// EventDetailsScreen's GalleryThumb. Every other card that renders a backend-supplied
// event image (EventInterestCard, MainEventCard, FeaturedCarousel, EventHighlightCard) had
// no onError handler at all, so a 404'd/expired image URL left permanent blank space
// instead of a visible fallback. Renders the same skeleton placeholder asset while loading
// or once a real load has failed, and the real image on top once it decodes successfully.
//
// Backed by expo-image rather than RN's core Image: this is the one component every
// remote event image in the app goes through, and core Image has no persistent disk cache
// on Android — every scroll back to an already-seen card re-downloaded and re-decoded the
// same JPEG. expo-image caches to disk by default and decodes off the JS thread.
export const FallbackImage: React.FC<Props> = ({ source, style, resizeMode = 'cover' }) => {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const hasSource = !!source;

  return (
    <View style={[styles.wrap, style]}>
      {(!hasSource || failed || !loaded) && (
        <Image source={SKELETON_IMG} style={StyleSheet.absoluteFill} contentFit="cover" />
      )}
      {hasSource && !failed && (
        <Image
          source={source as any}
          style={[StyleSheet.absoluteFill, { opacity: loaded ? 1 : 0 }]}
          contentFit={resizeMode}
          // Memory + disk. The disk half is the point: it survives the component unmounting
          // as rows recycle out of a list, which is exactly when the old Image lost it.
          cachePolicy="memory-disk"
          // The crossfade is handled here by the opacity swap above against the skeleton, so
          // expo-image's own transition would double up on it.
          transition={0}
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
