import { Link, Stack } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SwipeCard } from '../components/SwipeCard';
import { buildDeck } from '../lib/filter';
import { fetchSelectedProducts } from '../lib/sources';
import { useAppState } from '../lib/store';
import type { Product } from '../lib/types';

export default function SwipeScreen() {
  const { loaded, settings, seenIds, wishlist, swipe, resetSeen } = useAppState();
  const [deck, setDeck] = useState<Product[] | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  // seenIds läses via ref så att kön inte blandas om efter varje swipe.
  const seenRef = useRef(seenIds);
  seenRef.current = seenIds;

  useEffect(() => {
    if (!loaded) return;
    let cancelled = false;
    setDeck(null);
    fetchSelectedProducts(settings).then((products) => {
      if (!cancelled) setDeck(buildDeck(products, settings, new Set(seenRef.current)));
    });
    return () => {
      cancelled = true;
    };
  }, [loaded, settings, reloadToken]);

  const current = deck?.[0];

  const handleSwipe = (wanted: boolean) => {
    if (!current) return;
    swipe(current, wanted);
    setDeck((d) => (d ? d.slice(1) : d));
  };

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          headerLeft: () => (
            <Link href="/parent" asChild>
              <Pressable hitSlop={12} accessibilityLabel="Föräldrainställningar">
                <Text style={styles.headerBtn}>⚙️</Text>
              </Pressable>
            </Link>
          ),
          headerRight: () => (
            <Link href="/wishlist" asChild>
              <Pressable hitSlop={12} accessibilityLabel="Visa önskelistan">
                <Text style={styles.headerBtn}>💜 {wishlist.length}</Text>
              </Pressable>
            </Link>
          ),
        }}
      />

      <View style={styles.cardArea}>
        {!loaded || deck === null ? (
          <ActivityIndicator size="large" color="#6b3fd4" />
        ) : current ? (
          <SwipeCard key={current.id} product={current} onSwipe={handleSwipe} />
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Slut på saker att titta på! 🎉</Text>
            <Text style={styles.emptyText}>Be en förälder ändra inställningarna, eller börja om från början.</Text>
            <Pressable
              style={styles.resetBtn}
              onPress={() => {
                resetSeen();
                setReloadToken((t) => t + 1);
              }}
            >
              <Text style={styles.resetText}>Börja om</Text>
            </Pressable>
          </View>
        )}
      </View>

      {current && (
        <View style={styles.buttons}>
          <Pressable style={[styles.round, styles.noBtn]} onPress={() => handleSwipe(false)} accessibilityLabel="Nej tack">
            <Text style={styles.roundText}>✕</Text>
          </Pressable>
          <Pressable style={[styles.round, styles.yesBtn]} onPress={() => handleSwipe(true)} accessibilityLabel="Ja, lägg på önskelistan">
            <Text style={styles.roundText}>♥</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16 },
  headerBtn: { fontSize: 20, paddingHorizontal: 8 },
  cardArea: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  buttons: { flexDirection: 'row', justifyContent: 'center', gap: 48, paddingVertical: 16 },
  round: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center', elevation: 3 },
  noBtn: { backgroundColor: '#ffe1e1' },
  yesBtn: { backgroundColor: '#d9f7e3' },
  roundText: { fontSize: 34 },
  empty: { alignItems: 'center', gap: 12, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 24, fontWeight: '700', textAlign: 'center' },
  emptyText: { fontSize: 16, color: '#555', textAlign: 'center' },
  resetBtn: { marginTop: 8, backgroundColor: '#6b3fd4', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 },
  resetText: { color: '#fff', fontSize: 18, fontWeight: '600' },
});
