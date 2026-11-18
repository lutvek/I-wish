import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { categoryKey } from '../lib/filter';
import { stores } from '../lib/sources';
import { useAppState } from '../lib/store';
import type { Settings } from '../lib/types';

/** Enkel föräldraspärr: ett mattetal som små barn inte klarar. */
function ParentGate({ onPass }: { onPass: () => void }) {
  const [a, b] = useMemo(() => [6 + Math.floor(Math.random() * 7), 3 + Math.floor(Math.random() * 7)], []);
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

const toggle = (list: string[], value: string, on: boolean) =>
  on ? (list.includes(value) ? list : [...list, value]) : list.filter((v) => v !== value);

export default function ParentScreen() {
  const { settings, setSettings, wishlist, resetSeen } = useAppState();
  const [unlocked, setUnlocked] = useState(false);
  const [draft, setDraft] = useState<Settings>(settings);
  const [minText, setMinText] = useState(String(settings.minPrice));
  const [maxText, setMaxText] = useState(String(settings.maxPrice));

  if (!unlocked) return <ParentGate onPass={() => setUnlocked(true)} />;

  const min = Number(minText);
  const max = Number(maxText);
  const priceError =
    !Number.isFinite(min) || !Number.isFinite(max) || minText === '' || maxText === ''
      ? 'Ange priser i hela kronor.'
      : min > max
        ? 'Lägsta pris kan inte vara högre än högsta.'
        : null;
  const selectionError =
    draft.storeIds.length === 0
      ? 'Välj minst en butik.'
      : !draft.storeIds.some((id) => draft.categoryKeys.some((k) => k.startsWith(`${id}:`)))
        ? 'Välj minst en kategori i en vald butik.'
        : null;
  const error = priceError ?? selectionError;

  const save = () => {
    if (error) return;
    setSettings({ ...draft, minPrice: min, maxPrice: max });
    router.back();
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.h2}>Butiker och kategorier</Text>
      {stores.map((store) => {
        const storeOn = draft.storeIds.includes(store.id);
        return (
          <View key={store.id} style={styles.storeBox}>
            <View style={styles.row}>
              <Text style={styles.storeName}>{store.name}</Text>
              <Switch
                value={storeOn}
                onValueChange={(on) => setDraft((d) => ({ ...d, storeIds: toggle(d.storeIds, store.id, on) }))}
              />
            </View>
            {storeOn &&
              store.categories.map((cat) => {
                const key = categoryKey(store.id, cat.id);
                return (
                  <View key={key} style={[styles.row, styles.catRow]}>
                    <Text style={styles.catName}>{cat.name}</Text>
                    <Switch
                      value={draft.categoryKeys.includes(key)}
                      onValueChange={(on) =>
                        setDraft((d) => ({ ...d, categoryKeys: toggle(d.categoryKeys, key, on) }))
                      }
                    />
                  </View>
                );
              })}
          </View>
        );
      })}

      <Text style={styles.h2}>Prisspann (kr)</Text>
      <View style={styles.priceRow}>
        <TextInput style={styles.priceInput} value={minText} onChangeText={setMinText} keyboardType="number-pad" accessibilityLabel="Lägsta pris" />
        <Text style={styles.dash}>–</Text>
        <TextInput style={styles.priceInput} value={maxText} onChangeText={setMaxText} keyboardType="number-pad" accessibilityLabel="Högsta pris" />
      </View>

      {error && <Text style={styles.error}>{error}</Text>}
      <Pressable style={[styles.primary, error && styles.disabled]} onPress={save} disabled={!!error}>
        <Text style={styles.primaryText}>Spara</Text>
      </Pressable>

      <Text style={styles.h2}>Övrigt</Text>
      <Text style={styles.note}>
        Önskelistan har {wishlist.length} saker. Produkter barnet redan swipat visas inte igen.
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
  storeBox: { backgroundColor: '#fff', borderRadius: 16, padding: 12, gap: 4 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  catRow: { paddingLeft: 16 },
  storeName: { fontSize: 18, fontWeight: '600' },
  catName: { fontSize: 16, color: '#333' },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  priceInput: { flex: 1, minWidth: 0, width: 0, backgroundColor: '#fff', borderRadius: 12, padding: 12, fontSize: 18 },
  dash: { fontSize: 20 },
  error: { color: '#c62828', fontSize: 15 },
  primary: { backgroundColor: '#6b3fd4', borderRadius: 24, paddingVertical: 14, alignItems: 'center' },
  disabled: { opacity: 0.5 },
  primaryText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  secondary: { borderColor: '#6b3fd4', borderWidth: 2, borderRadius: 24, paddingVertical: 12, alignItems: 'center' },
  secondaryText: { color: '#6b3fd4', fontSize: 16, fontWeight: '600' },
  note: { fontSize: 15, color: '#555' },
  gate: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  gateTitle: { fontSize: 24, fontWeight: '700' },
  gateText: { fontSize: 20 },
  gateInput: { backgroundColor: '#fff', borderRadius: 12, padding: 12, fontSize: 24, width: 140, textAlign: 'center' },
});
