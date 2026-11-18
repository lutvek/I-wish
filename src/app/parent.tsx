import { useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAppState } from '../lib/store';
import type { Source } from '../lib/types';

/** Enkel föräldraspärr: ett mattetal som små barn inte klarar. */
function ParentGate({ onPass }: { onPass: () => void }) {
  const [[a, b]] = useState(() => [6 + Math.floor(Math.random() * 7), 3 + Math.floor(Math.random() * 7)]);
  const [answer, setAnswer] = useState('');
  const [wrong, setWrong] = useState(false);

  const check = () => {
    if (Number(answer) === a * b) onPass();
    else {
      setWrong(true);
      setAnswer('');
    }
  };

  return (
    <View style={styles.gate}>
      <Text style={styles.gateTitle}>Bara för vuxna</Text>
      <Text style={styles.gateText}>
        Vad är {a} × {b}?
      </Text>
      <TextInput
        style={styles.gateInput}
        value={answer}
        onChangeText={setAnswer}
        keyboardType="number-pad"
        onSubmitEditing={check}
        autoFocus
      />
      {wrong && <Text style={styles.error}>Fel svar, försök igen.</Text>}
      <Pressable style={styles.primary} onPress={check}>
        <Text style={styles.primaryText}>Fortsätt</Text>
      </Pressable>
    </View>
  );
}

function SourceRow({ source }: { source: Source }) {
  const { catalog, fetchingId, nextToFetch, removeSource, refreshSource } = useAppState();
  const entry = catalog[source.id];
  const busy = fetchingId === source.id;
  const queued = !busy && nextToFetch === source.id;

  let status: string;
  if (busy) status = 'Läser sidan…';
  else if (Platform.OS === 'web') status = 'Produkter hämtas bara i mobilappen.';
  else if (!entry) status = queued ? 'Väntar på att läsas…' : 'Inte läst än';
  else if (entry.products.length > 0) status = `${entry.products.length} produkter${entry.error ? ' (senaste uppdateringen misslyckades)' : ''}`;
  else status = entry.error ?? 'Hittade inga produkter.';

  const failed = !busy && !!entry && entry.products.length === 0;

  const confirmRemove = () => {
    if (Platform.OS === 'web') return removeSource(source.id);
    Alert.alert('Ta bort sidan?', source.url, [
      { text: 'Avbryt', style: 'cancel' },
      { text: 'Ta bort', style: 'destructive', onPress: () => removeSource(source.id) },
    ]);
  };

  return (
    <View style={styles.sourceBox}>
      <View style={styles.sourceHead}>
        <View style={{ flex: 1 }}>
          <Text style={styles.sourceName} numberOfLines={1}>
            {source.site}
            {entry?.title ? ` · ${entry.title}` : ''}
          </Text>
          <Text style={styles.sourceUrl} numberOfLines={1}>
            {source.url}
          </Text>
        </View>
        {busy && <ActivityIndicator color="#6b3fd4" />}
      </View>
      <Text style={[styles.status, failed && styles.error]}>{status}</Text>
      <View style={styles.sourceButtons}>
        <Pressable onPress={() => refreshSource(source.id)} disabled={busy} hitSlop={8}>
          <Text style={[styles.linkBtn, busy && styles.disabled]}>Läs om</Text>
        </Pressable>
        <Pressable onPress={confirmRemove} hitSlop={8}>
          <Text style={[styles.linkBtn, styles.danger]}>Ta bort</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function ParentScreen() {
  const { settings, setPriceRange, addSource, wishlist, resetSeen } = useAppState();
  const [unlocked, setUnlocked] = useState(false);
  const [link, setLink] = useState('');
  const [linkError, setLinkError] = useState<string | null>(null);
  const [minText, setMinText] = useState(String(settings.minPrice));
  const [maxText, setMaxText] = useState(String(settings.maxPrice));
  const [priceSaved, setPriceSaved] = useState(false);

  if (!unlocked) return <ParentGate onPass={() => setUnlocked(true)} />;

  const add = () => {
    const err = addSource(link);
    setLinkError(err);
    if (!err) setLink('');
  };

  const min = Number(minText);
  const max = Number(maxText);
  const priceError =
    minText.trim() === '' || maxText.trim() === '' || !Number.isFinite(min) || !Number.isFinite(max)
      ? 'Ange priser i hela kronor.'
      : min > max
        ? 'Lägsta pris kan inte vara högre än högsta.'
        : null;
  const priceChanged = min !== settings.minPrice || max !== settings.maxPrice;

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.h2}>Butikssidor</Text>
      <Text style={styles.note}>
        Öppna en butiks hemsida i webbläsaren, gå till en kategori (t.ex. barnkläder eller leksaker), kopiera
        länken och klistra in den här. Appen visar produkterna från de sidor du lagt till.
      </Text>
      <TextInput
        style={styles.input}
        value={link}
        onChangeText={(t) => {
          setLink(t);
          setLinkError(null);
        }}
        placeholder="https://www.butik.se/barn/leksaker"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        returnKeyType="done"
        onSubmitEditing={add}
      />
      {linkError && <Text style={styles.error}>{linkError}</Text>}
      <Pressable style={[styles.primary, !link.trim() && styles.disabled]} onPress={add} disabled={!link.trim()}>
        <Text style={styles.primaryText}>Lägg till sida</Text>
      </Pressable>

      {settings.sources.map((s) => (
        <SourceRow key={s.id} source={s} />
      ))}

      <Text style={styles.h2}>Prisspann (kr)</Text>
      <View style={styles.priceRow}>
        <TextInput
          style={styles.priceInput}
          value={minText}
          onChangeText={(t) => {
            setMinText(t);
            setPriceSaved(false);
          }}
          keyboardType="number-pad"
          accessibilityLabel="Lägsta pris"
        />
        <Text style={styles.dash}>–</Text>
        <TextInput
          style={styles.priceInput}
          value={maxText}
          onChangeText={(t) => {
            setMaxText(t);
            setPriceSaved(false);
          }}
          keyboardType="number-pad"
          accessibilityLabel="Högsta pris"
        />
      </View>
      {priceError && <Text style={styles.error}>{priceError}</Text>}
      {priceSaved && !priceChanged && <Text style={styles.note}>Sparat.</Text>}
      <Pressable
        style={[styles.secondary, (!!priceError || !priceChanged) && styles.disabled]}
        disabled={!!priceError || !priceChanged}
        onPress={() => {
          setPriceRange(min, max);
          setPriceSaved(true);
        }}
      >
        <Text style={styles.secondaryText}>Spara prisspann</Text>
      </Pressable>

      <Text style={styles.h2}>Övrigt</Text>
      <Text style={styles.note}>
        Önskelistan har {wishlist.length} saker. Produkter barnet redan swipat visas inte igen. Sidorna läses om
        automatiskt två gånger per dygn.
      </Text>
      <Pressable style={styles.secondary} onPress={resetSeen}>
        <Text style={styles.secondaryText}>Visa swipade produkter igen</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12, maxWidth: 720, width: '100%', alignSelf: 'center' },
  h2: { fontSize: 20, fontWeight: '700', marginTop: 8 },
  note: { fontSize: 15, color: '#555' },
  input: { backgroundColor: '#fff', borderRadius: 12, padding: 12, fontSize: 16 },
  sourceBox: { backgroundColor: '#fff', borderRadius: 16, padding: 12, gap: 6 },
  sourceHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sourceName: { fontSize: 17, fontWeight: '600' },
  sourceUrl: { fontSize: 13, color: '#888' },
  status: { fontSize: 15, color: '#333' },
  sourceButtons: { flexDirection: 'row', gap: 24 },
  linkBtn: { fontSize: 15, color: '#6b3fd4', fontWeight: '600', paddingVertical: 4 },
  danger: { color: '#c62828' },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  priceInput: { flex: 1, minWidth: 0, width: 0, backgroundColor: '#fff', borderRadius: 12, padding: 12, fontSize: 18 },
  dash: { fontSize: 20 },
  error: { color: '#c62828', fontSize: 15 },
  primary: { backgroundColor: '#6b3fd4', borderRadius: 24, paddingVertical: 14, alignItems: 'center' },
  disabled: { opacity: 0.5 },
  primaryText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  secondary: { borderColor: '#6b3fd4', borderWidth: 2, borderRadius: 24, paddingVertical: 12, alignItems: 'center' },
  secondaryText: { color: '#6b3fd4', fontSize: 16, fontWeight: '600' },
  gate: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  gateTitle: { fontSize: 24, fontWeight: '700' },
  gateText: { fontSize: 20 },
  gateInput: { backgroundColor: '#fff', borderRadius: 12, padding: 12, fontSize: 24, width: 140, textAlign: 'center' },
});
