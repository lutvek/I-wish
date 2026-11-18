import type { Product, Settings } from './types';

export const categoryKey = (storeId: string, categoryId: string) => `${storeId}:${categoryId}`;

/** Vilka kategorier som är valda för en viss butik. */
export function categoriesForStore(settings: Settings, storeId: string): string[] {
  const prefix = `${storeId}:`;
  return settings.categoryKeys.filter((k) => k.startsWith(prefix)).map((k) => k.slice(prefix.length));
}

/** Sant om produkten uppfyller föräldrarnas filter. */
export function matchesSettings(product: Product, settings: Settings): boolean {
  return (
    settings.storeIds.includes(product.storeId) &&
    settings.categoryKeys.includes(categoryKey(product.storeId, product.categoryId)) &&
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
 * Bygger kön av produkter att visa: bara de som matchar filtret, inte redan
 * swipade, i slumpmässig ordning blandat över alla valda butiker.
 */
export function buildDeck(
  products: readonly Product[],
  settings: Settings,
  seenIds: ReadonlySet<string>,
  random?: () => number,
): Product[] {
  const unique = new Map<string, Product>();
  for (const p of products) {
    if (!seenIds.has(p.id) && matchesSettings(p, settings)) unique.set(p.id, p);
  }
  return shuffle([...unique.values()], random);
}
