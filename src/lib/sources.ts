import { categoriesForStore } from './filter';
import { mockSources } from './mockCatalog';
import type { Product, ProductSource, Settings } from './types';

/** Alla butiker föräldrarna kan välja mellan. Byt mot riktiga källor här. */
export const sources: ProductSource[] = mockSources;

export const stores = sources.map((s) => s.store);

/** Hämtar produkter från alla valda butiker parallellt. En butik som fallerar hoppas över. */
export async function fetchSelectedProducts(settings: Settings): Promise<Product[]> {
  const selected = sources.filter((s) => settings.storeIds.includes(s.store.id));
  const results = await Promise.allSettled(
    selected.map((s) =>
      s.fetchProducts({
        categoryIds: categoriesForStore(settings, s.store.id),
        minPrice: settings.minPrice,
        maxPrice: settings.maxPrice,
      }),
    ),
  );
  return results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
}
