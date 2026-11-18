import { useEffect, useRef } from 'react';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { WEBVIEW_SCRIPT } from '../lib/extractor';
import { useAppState } from '../lib/store';
import type { ExtractResult } from '../lib/types';

const TIMEOUT_MS = 60_000;

/**
 * Hämtar produkter från föräldrarnas sidor, en i taget, i en osynlig WebView.
 * Sidan laddas som i en vanlig webbläsare (så att sidor byggda med JavaScript
 * fungerar), och ett skript scrollar igenom den och läser av produkterna.
 */
export function ProductFetcher() {
  const { settings, nextToFetch, fetchingId, startFetch, finishFetch } = useAppState();
  const { width, height } = useWindowDimensions();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const source = settings.sources.find((s) => s.id === fetchingId);

  useEffect(() => {
    if (Platform.OS === 'web') return; // WebView finns bara i mobilappen.
    if (!fetchingId && nextToFetch) startFetch(nextToFetch);
  }, [fetchingId, nextToFetch, startFetch]);

  useEffect(() => {
    if (!fetchingId) return;
    const id = fetchingId;
    timer.current = setTimeout(
      () => finishFetch(id, { fetchedAt: Date.now(), products: [], error: 'Sidan tog för lång tid att läsa.' }),
      TIMEOUT_MS,
    );
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [fetchingId, finishFetch]);

  // Källan togs bort medan den hämtades.
  useEffect(() => {
    if (fetchingId && !source) finishFetch(fetchingId, { fetchedAt: Date.now(), products: [] });
  }, [fetchingId, source, finishFetch]);

  if (!source || Platform.OS === 'web') return null;

  const onMessage = (e: WebViewMessageEvent) => {
    let result: ExtractResult & { error?: string };
    try {
      result = JSON.parse(e.nativeEvent.data);
    } catch {
      return;
    }
    finishFetch(source.id, {
      fetchedAt: Date.now(),
      title: result.title || undefined,
      products: Array.isArray(result.products) ? result.products : [],
      error: result.products?.length ? undefined : (result.error ?? 'Hittade inga produkter på sidan.'),
    });
  };

  return (
    <View pointerEvents="none" style={[styles.hidden, { width, height }]}>
      <WebView
        key={source.id}
        source={{ uri: source.url }}
        injectedJavaScript={WEBVIEW_SCRIPT}
        onMessage={onMessage}
        onError={(e) =>
          finishFetch(source.id, {
            fetchedAt: Date.now(),
            products: [],
            error: `Kunde inte öppna sidan (${e.nativeEvent.description}).`,
          })
        }
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        setSupportMultipleWindows={false}
        mediaPlaybackRequiresUserAction
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // Ligger bakom appen och syns inte, men har skärmens storlek så att sidan
  // renderas och laddar in produkter som på en vanlig mobil.
  hidden: { position: 'absolute', top: 0, left: 0, opacity: 0, zIndex: -1 },
});
