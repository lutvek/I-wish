import { FlatList, Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { formatPrice, useAppState } from '../lib/store';

export default function WishlistScreen() {
  const { wishlist, removeWish } = useAppState();
  const total = wishlist.reduce((sum, w) => sum + w.price, 0);

  return (
    <FlatList
      data={wishlist}
      keyExtractor={(w) => w.id}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        wishlist.length > 0 ? (
          <Text style={styles.summary}>
            {wishlist.length} önskningar · totalt {formatPrice(total)}
          </Text>
        ) : undefined
      }
      ListEmptyComponent={<Text style={styles.empty}>Önskelistan är tom. Swipa höger på saker du vill ha!</Text>}
      renderItem={({ item }) => (
        <View style={styles.row}>
          <Image source={{ uri: item.imageUrl }} style={styles.thumb} />
          <View style={styles.info}>
            <Text style={styles.title} numberOfLines={2}>
              {item.title}
            </Text>
            <Text style={styles.price}>{formatPrice(item.price)}</Text>
            <Pressable onPress={() => Linking.openURL(item.productUrl)} hitSlop={8}>
              <Text style={styles.link}>Köp hos {item.storeName} ↗</Text>
            </Pressable>
          </View>
          <Pressable onPress={() => removeWish(item.id)} hitSlop={12} accessibilityLabel={`Ta bort ${item.title}`}>
            <Text style={styles.remove}>🗑️</Text>
          </Pressable>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 12, maxWidth: 720, width: '100%', alignSelf: 'center' },
  summary: { fontSize: 16, color: '#555', marginBottom: 4 },
  empty: { fontSize: 18, color: '#555', textAlign: 'center', marginTop: 48 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 16, padding: 12 },
  thumb: { width: 80, height: 80, borderRadius: 12, backgroundColor: '#eee' },
  info: { flex: 1, gap: 2 },
  title: { fontSize: 17, fontWeight: '600', color: '#222' },
  price: { fontSize: 16, color: '#222' },
  link: { fontSize: 15, color: '#6b3fd4', fontWeight: '600', paddingVertical: 2 },
  remove: { fontSize: 22, padding: 4 },
});
