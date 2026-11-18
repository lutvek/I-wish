import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { needsRefresh, parseSourceUrl, siteName } from './filter';
import type { CatalogEntry, Product, Settings, WishItem } from './types';

const KEY = 'i-wish/state/v2';

type Persisted = {
  settings: Settings;
  wishlist: WishItem[];
  /** Produkter barnet redan swipat (åt båda hållen) – visas inte igen. */
  seenIds: string[];
  /** Senast hämtade produkter per källa. */
  catalog: Record<string, CatalogEntry>;
};

const initial: Persisted = {
  settings: { sources: [], minPrice: 0, maxPrice: 500 },
  wishlist: [],
  seenIds: [],
  catalog: {},
};

type AppState = Persisted & {
  loaded: boolean;
  /** Källan som hämtas just nu, om någon. */
  fetchingId: string | null;
  /** Nästa källa som behöver hämtas, om någon. */
  nextToFetch: string | null;
  /** Returnerar ett felmeddelande, eller null om länken lades till. */
  addSource: (input: string) => string | null;
  removeSource: (id: string) => void;
  refreshSource: (id: string) => void;
  setPriceRange: (min: number, max: number) => void;
  startFetch: (id: string) => void;
  finishFetch: (id: string, entry: CatalogEntry) => void;
  swipe: (product: Product, wanted: boolean) => void;
  removeWish: (id: string) => void;
  resetSeen: () => void;
};

const Ctx = createContext<AppState | null>(null);

const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Persisted>(initial);
  const [loaded, setLoaded] = useState(false);
  const [fetchingId, setFetchingId] = useState<string | null>(null);
  const [forced, setForced] = useState<string[]>([]);
  // Tickar så att gamla produktlistor hämtas om även om appen står på länge.
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 10 * 60 * 1000);
    return () => clearInterval(t);
  }, []);

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

  const addSource = useCallback(
    (input: string) => {
      const url = parseSourceUrl(input);
      if (!url) return 'Det där ser inte ut som en webbadress. Kopiera länken från webbläsaren och klistra in den.';
      if (state.settings.sources.some((s) => s.url === url)) return 'Den sidan finns redan i listan.';
      const source = { id: newId(), url, site: siteName(url), addedAt: Date.now() };
      setState((s) => ({ ...s, settings: { ...s.settings, sources: [...s.settings.sources, source] } }));
      return null;
    },
    [state.settings.sources],
  );

  const removeSource = useCallback((id: string) => {
    setState((s) => {
      const { [id]: _removed, ...catalog } = s.catalog;
      return { ...s, catalog, settings: { ...s.settings, sources: s.settings.sources.filter((x) => x.id !== id) } };
    });
    setForced((f) => f.filter((x) => x !== id));
  }, []);

  const refreshSource = useCallback((id: string) => setForced((f) => (f.includes(id) ? f : [...f, id])), []);

  const setPriceRange = useCallback(
    (minPrice: number, maxPrice: number) => setState((s) => ({ ...s, settings: { ...s.settings, minPrice, maxPrice } })),
    [],
  );

  const startFetch = useCallback((id: string) => setFetchingId(id), []);

  const finishFetch = useCallback((id: string, entry: CatalogEntry) => {
    setFetchingId((cur) => (cur === id ? null : cur));
    setForced((f) => f.filter((x) => x !== id));
    setState((s) => {
      if (!s.settings.sources.some((x) => x.id === id)) return s; // borttagen under tiden
      const prev = s.catalog[id];
      // Behåll gamla produkter om en omhämtning misslyckas.
      const merged = entry.products.length === 0 && prev?.products.length ? { ...prev, fetchedAt: entry.fetchedAt, error: entry.error } : entry;
      return { ...s, catalog: { ...s.catalog, [id]: merged } };
    });
  }, []);

  const swipe = useCallback((product: Product, wanted: boolean) => {
    setState((s) => ({
      ...s,
      seenIds: s.seenIds.includes(product.id) ? s.seenIds : [...s.seenIds, product.id],
      wishlist:
        wanted && !s.wishlist.some((w) => w.productUrl === product.productUrl)
          ? [{ ...product, addedAt: Date.now() }, ...s.wishlist]
          : s.wishlist,
    }));
  }, []);

  const removeWish = useCallback(
    (id: string) => setState((s) => ({ ...s, wishlist: s.wishlist.filter((w) => w.id !== id) })),
    [],
  );

  const resetSeen = useCallback(() => setState((s) => ({ ...s, seenIds: [] })), []);

  const nextToFetch = useMemo(() => {
    if (!loaded) return null;
    const sources = state.settings.sources;
    return (
      sources.find((s) => forced.includes(s.id))?.id ??
      sources.find((s) => needsRefresh(state.catalog[s.id], now))?.id ??
      null
    );
  }, [loaded, state.settings.sources, state.catalog, forced, now]);

  const value = useMemo(
    () => ({
      ...state,
      loaded,
      fetchingId,
      nextToFetch,
      addSource,
      removeSource,
      refreshSource,
      setPriceRange,
      startFetch,
      finishFetch,
      swipe,
      removeWish,
      resetSeen,
    }),
    [state, loaded, fetchingId, nextToFetch, addSource, removeSource, refreshSource, setPriceRange, startFetch, finishFetch, swipe, removeWish, resetSeen],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppState(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAppState måste användas inom AppStateProvider');
  return v;
}

export const formatPrice = (kr: number) => `${kr.toLocaleString('sv-SE')} kr`;
