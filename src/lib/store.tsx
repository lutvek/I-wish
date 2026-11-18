import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { categoryKey } from './filter';
import { stores } from './sources';
import type { Product, Settings, WishItem } from './types';

const KEY = 'i-wish/state/v1';

type Persisted = {
  settings: Settings;
  wishlist: WishItem[];
  /** Produkter barnet redan swipat (åt båda hållen) – visas inte igen. */
  seenIds: string[];
};

export const defaultSettings: Settings = {
  storeIds: stores.map((s) => s.id),
  categoryKeys: stores.flatMap((s) => s.categories.map((c) => categoryKey(s.id, c.id))),
  minPrice: 0,
  maxPrice: 500,
};

const initial: Persisted = { settings: defaultSettings, wishlist: [], seenIds: [] };

type AppState = Persisted & {
  loaded: boolean;
  setSettings: (s: Settings) => void;
  swipe: (product: Product, wanted: boolean) => void;
  removeWish: (id: string) => void;
  resetSeen: () => void;
};

const Ctx = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Persisted>(initial);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (raw) setState({ ...initial, ...(JSON.parse(raw) as Partial<Persisted>) });
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (loaded) AsyncStorage.setItem(KEY, JSON.stringify(state)).catch(() => {});
  }, [state, loaded]);

  const setSettings = useCallback((settings: Settings) => setState((s) => ({ ...s, settings })), []);

  const swipe = useCallback((product: Product, wanted: boolean) => {
    setState((s) => ({
      ...s,
      seenIds: s.seenIds.includes(product.id) ? s.seenIds : [...s.seenIds, product.id],
      wishlist:
        wanted && !s.wishlist.some((w) => w.id === product.id)
          ? [{ ...product, addedAt: Date.now() }, ...s.wishlist]
          : s.wishlist,
    }));
  }, []);

  const removeWish = useCallback(
    (id: string) => setState((s) => ({ ...s, wishlist: s.wishlist.filter((w) => w.id !== id) })),
    [],
  );

  const resetSeen = useCallback(() => setState((s) => ({ ...s, seenIds: [] })), []);

  const value = useMemo(
    () => ({ ...state, loaded, setSettings, swipe, removeWish, resetSeen }),
    [state, loaded, setSettings, swipe, removeWish, resetSeen],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppState(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAppState måste användas inom AppStateProvider');
  return v;
}

export const formatPrice = (kr: number) => `${kr.toLocaleString('sv-SE')} kr`;
