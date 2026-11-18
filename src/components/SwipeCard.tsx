import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Image, PanResponder, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { formatPrice } from '../lib/store';
import type { Product } from '../lib/types';

type Props = {
  product: Product;
  onSwipe: (wanted: boolean) => void;
};

/** Ett produktkort som kan dras åt höger (vill ha) eller vänster (vill inte ha). */
export function SwipeCard({ product, onSwipe }: Props) {
  const { width } = useWindowDimensions();
  const threshold = Math.min(width * 0.25, 160);
  const [pan] = useState(() => new Animated.ValueXY());

  // Senaste callback utan att bygga om PanResponder vid varje render.
  const onSwipeRef = useRef(onSwipe);
  useEffect(() => {
    onSwipeRef.current = onSwipe;
  }, [onSwipe]);

  const responder = useMemo(
    () =>
      // Refen läses bara i gesthanterarna (händelser), inte under rendering.
      // eslint-disable-next-line react-hooks/refs
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8,
        onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
        onPanResponderRelease: (_, g) => {
          if (Math.abs(g.dx) > threshold || Math.abs(g.vx) > 0.8) {
            const wanted = g.dx > 0;
            Animated.timing(pan, {
              toValue: { x: (wanted ? 1 : -1) * width * 1.5, y: g.dy },
              duration: 220,
              useNativeDriver: false,
            }).start(() => onSwipeRef.current(wanted));
          } else {
            Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
          }
        },
      }),
    [pan, threshold, width],
  );

  const rotate = pan.x.interpolate({ inputRange: [-width, 0, width], outputRange: ['-15deg', '0deg', '15deg'] });
  const yesOpacity = pan.x.interpolate({ inputRange: [0, threshold], outputRange: [0, 1], extrapolate: 'clamp' });
  const noOpacity = pan.x.interpolate({ inputRange: [-threshold, 0], outputRange: [1, 0], extrapolate: 'clamp' });

  return (
    <Animated.View
      {...responder.panHandlers}
      style={[styles.card, { transform: [{ translateX: pan.x }, { translateY: pan.y }, { rotate }] }]}
    >
      <Image source={{ uri: product.imageUrl }} style={styles.image} resizeMode="cover" />
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>
          {product.title}
        </Text>
        <Text style={styles.meta}>
          {formatPrice(product.price)} · {product.storeName}
        </Text>
      </View>
      <Animated.Text style={[styles.stamp, styles.yes, { opacity: yesOpacity }]}>JA! 💚</Animated.Text>
      <Animated.Text style={[styles.stamp, styles.no, { opacity: noOpacity }]}>NEJ</Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    maxWidth: 520,
    aspectRatio: 0.75,
    maxHeight: '100%',
    backgroundColor: '#fff',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  image: { flex: 1, backgroundColor: '#eee' },
  info: { padding: 16, gap: 4 },
  title: { fontSize: 22, fontWeight: '700', color: '#222' },
  meta: { fontSize: 16, color: '#666' },
  stamp: {
    position: 'absolute',
    top: 28,
    fontSize: 34,
    fontWeight: '900',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 4,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  yes: { left: 24, color: '#1a9e4b', borderColor: '#1a9e4b', transform: [{ rotate: '-12deg' }] },
  no: { right: 24, color: '#d63c3c', borderColor: '#d63c3c', transform: [{ rotate: '12deg' }] },
});
