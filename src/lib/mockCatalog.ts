import type { Product, ProductQuery, ProductSource, Store } from './types';

/**
 * Påhittade butiker och produkter så att appen går att använda innan en riktig
 * produktkälla finns. Bilderna kommer från picsum.photos (slumpbilder).
 */
type Seed = { categoryId: string; titles: string[]; minPrice: number; maxPrice: number };

const STORES: { store: Store; seeds: Seed[] }[] = [
  {
    store: {
      id: 'leksakslada',
      name: 'Leksakslådan',
      categories: [
        { id: 'bygg', name: 'Byggleksaker' },
        { id: 'dockor', name: 'Dockor & figurer' },
        { id: 'spel', name: 'Spel & pussel' },
      ],
    },
    seeds: [
      { categoryId: 'bygg', titles: ['Byggklossar 500 st', 'Magnetbygge rymdstation', 'Kulbana deluxe', 'Träklossar i låda', 'Robotbyggsats'], minPrice: 99, maxPrice: 899 },
      { categoryId: 'dockor', titles: ['Docka med kläder', 'Dockhus i trä', 'Dinosauriefigurer 12 st', 'Gosedjur enhörning', 'Riddarborg med figurer'], minPrice: 79, maxPrice: 1299 },
      { categoryId: 'spel', titles: ['Pussel 100 bitar djur', 'Memory med husdjur', 'Familjespel skattjakt', 'Kortspel UNO-liknande', '3D-pussel jordglob'], minPrice: 59, maxPrice: 399 },
    ],
  },
  {
    store: {
      id: 'bokhornan',
      name: 'Bokhörnan',
      categories: [
        { id: 'bilderbocker', name: 'Bilderböcker' },
        { id: 'kapitel', name: 'Kapitelböcker' },
        { id: 'pyssel', name: 'Pysselböcker' },
      ],
    },
    seeds: [
      { categoryId: 'bilderbocker', titles: ['Lilla draken som var rädd', 'Godnattsagor för små', 'Bilderbok om rymden', 'Djuren på bondgården'], minPrice: 89, maxPrice: 219 },
      { categoryId: 'kapitel', titles: ['Detektivbyrån del 1', 'Hästboken', 'Monsterskolan', 'Fotbollsdrömmen'], minPrice: 99, maxPrice: 249 },
      { categoryId: 'pyssel', titles: ['Klistermärkesbok djur', 'Målarbok prinsessor', 'Labyrintboken', 'Rita steg för steg'], minPrice: 49, maxPrice: 149 },
    ],
  },
  {
    store: {
      id: 'sportkompis',
      name: 'Sportkompisen',
      categories: [
        { id: 'ute', name: 'Utelek' },
        { id: 'cykel', name: 'Cykel & sparkcykel' },
        { id: 'boll', name: 'Bollar' },
      ],
    },
    seeds: [
      { categoryId: 'ute', titles: ['Studsmatta mini', 'Hopprep med räknare', 'Vattenpistol XL', 'Sandlådeset', 'Badmintonset'], minPrice: 49, maxPrice: 1499 },
      { categoryId: 'cykel', titles: ['Balanscykel', 'Sparkcykel med lampor', 'Cykelhjälm barn', 'Barncykel 16"'], minPrice: 299, maxPrice: 2499 },
      { categoryId: 'boll', titles: ['Fotboll storlek 4', 'Basketboll junior', 'Mjukboll 3-pack', 'Volleyboll'], minPrice: 79, maxPrice: 349 },
    ],
  },
];

// Deterministiska "slump"-priser så att samma produkt alltid har samma pris.
function priceFor(seedText: string, min: number, max: number): number {
  let h = 0;
  for (const ch of seedText) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const raw = min + (h % (max - min + 1));
  return Math.max(min, Math.round(raw / 10) * 10 - 1);
}

function productsFor(store: Store, seeds: Seed[]): Product[] {
  return seeds.flatMap((seed) =>
    seed.titles.map((title, i) => {
      const sku = `${seed.categoryId}-${i + 1}`;
      const id = `${store.id}:${sku}`;
      return {
        id,
        storeId: store.id,
        storeName: store.name,
        categoryId: seed.categoryId,
        title,
        price: priceFor(id, seed.minPrice, seed.maxPrice),
        currency: 'SEK' as const,
        imageUrl: `https://picsum.photos/seed/${encodeURIComponent(id)}/600/600`,
        productUrl: `https://example.com/${store.id}/${sku}`,
      };
    }),
  );
}

export const mockSources: ProductSource[] = STORES.map(({ store, seeds }) => {
  const all = productsFor(store, seeds);
  return {
    store,
    async fetchProducts(q: ProductQuery) {
      return all.filter(
        (p) => q.categoryIds.includes(p.categoryId) && p.price >= q.minPrice && p.price <= q.maxPrice,
      );
    },
  };
});
