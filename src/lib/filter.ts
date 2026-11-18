import type { CatalogEntry, Product, Settings, Source } from './types';

/** Hittar en webbadress i inklistrad text (t.ex. "Kolla här: https://…"). Lägger till https:// vid behov. */
export function parseSourceUrl(input: string): string | null {
  const text = input.trim();
  const match = text.match(/https?:\/\/[^\s<>"']+/i);
  let candidate = match ? match[0] : text;
  if (!/^https?:\/\//i.test(candidate)) {
    if (!/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(candidate)) return null;
    candidate = `https://${candidate}`;
  }
  try {
    const url = new URL(candidate);
    if (!url.hostname.includes('.')) return null;
    url.hash = '';
    return url.toString();
  } catch {
    return null;
  }
}

/** "https://www2.hm.com/sv_se/barn.html" → "hm.com" */
export function siteName(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\d*\./, '');
  } catch {
    return url;
  }
}

/** Kopplar ihop källorna med deras senast hämtade produkter. */
export function productsFromCatalog(sources: readonly Source[], catalog: Record<string, CatalogEntry>): Product[] {
  return sources.flatMap((source) =>
    (catalog[source.id]?.products ?? []).map((p) => ({
      ...p,
      id: `${source.id}|${p.productUrl}`,
      sourceId: source.id,
      storeName: source.site,
    })),
  );
}

export function matchesSettings(product: Product, settings: Settings): boolean {
  return (
    settings.sources.some((s) => s.id === product.sourceId) &&
    product.price >= settings.minPrice &&
    product.price <= settings.maxPrice
  );
}

/** Fisher–Yates. `random` kan bytas ut i tester. */
export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Kön av produkter att visa: bara de som matchar filtret och inte redan swipats,
 * i slumpmässig ordning blandat över alla källor. Samma produkt (samma länk) från
 * två källor visas bara en gång.
 */
export function buildDeck(
  products: readonly Product[],
  settings: Settings,
  seenIds: ReadonlySet<string>,
  random?: () => number,
): Product[] {
  const unique = new Map<string, Product>();
  for (const p of products) {
    if (!seenIds.has(p.id) && !unique.has(p.productUrl) && matchesSettings(p, settings)) unique.set(p.productUrl, p);
  }
  return shuffle([...unique.values()], random);
}

/** Hur länge hämtade produkter räknas som färska. */
export const CATALOG_MAX_AGE_MS = 12 * 60 * 60 * 1000;

export function needsRefresh(entry: CatalogEntry | undefined, now: number): boolean {
  return !entry || now - entry.fetchedAt > CATALOG_MAX_AGE_MS;
}
