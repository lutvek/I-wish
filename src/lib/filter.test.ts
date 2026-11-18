import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildDeck, matchesSettings, parseSourceUrl, productsFromCatalog, shuffle, siteName } from './filter.ts';
import type { Product, Settings, Source } from './types.ts';

const src = (id: string): Source => ({ id, url: `https://${id}.se/`, site: `${id}.se`, addedAt: 0 });

const p = (sourceId: string, url: string, price: number): Product => ({
  id: `${sourceId}|${url}`,
  sourceId,
  storeName: sourceId,
  title: url,
  price,
  imageUrl: '',
  productUrl: url,
});

const settings: Settings = { sources: [src('a'), src('b')], minPrice: 100, maxPrice: 300 };

test('parseSourceUrl accepts pasted links and text around them', () => {
  assert.equal(parseSourceUrl('https://www2.hm.com/sv_se/barn.html#top'), 'https://www2.hm.com/sv_se/barn.html');
  assert.equal(parseSourceUrl('Kolla här: https://www.clasohlson.com/se/Leksaker/c/1908 !'), 'https://www.clasohlson.com/se/Leksaker/c/1908');
  assert.equal(parseSourceUrl('clasohlson.com/se/Leksaker'), 'https://clasohlson.com/se/Leksaker');
  assert.equal(parseSourceUrl('leksaker'), null);
  assert.equal(parseSourceUrl(''), null);
});

test('siteName strips www prefixes', () => {
  assert.equal(siteName('https://www2.hm.com/sv_se/barn.html'), 'hm.com');
  assert.equal(siteName('https://www.clasohlson.com/se/'), 'clasohlson.com');
});

test('matchesSettings checks source and price range (inclusive)', () => {
  assert.equal(matchesSettings(p('a', 'x', 100), settings), true);
  assert.equal(matchesSettings(p('a', 'x', 300), settings), true);
  assert.equal(matchesSettings(p('a', 'x', 301), settings), false);
  assert.equal(matchesSettings(p('c', 'x', 200), settings), false); // borttagen källa
});

test('productsFromCatalog + buildDeck drop seen, out-of-range and duplicate products', () => {
  const catalog = {
    a: { fetchedAt: 1, products: [{ title: 'A', price: 150, imageUrl: 'i', productUrl: 'u1' }, { title: 'B', price: 999, imageUrl: 'i', productUrl: 'u2' }] },
    b: { fetchedAt: 1, products: [{ title: 'A igen', price: 150, imageUrl: 'i', productUrl: 'u1' }, { title: 'C', price: 200, imageUrl: 'i', productUrl: 'u3' }] },
  };
  const products = productsFromCatalog(settings.sources, catalog);
  assert.equal(products.length, 4);
  const deck = buildDeck(products, settings, new Set(['b|u3']));
  assert.deepEqual(deck.map((x) => x.productUrl), ['u1']);
});

test('shuffle keeps all items and does not mutate input', () => {
  const input = [1, 2, 3, 4, 5];
  const out = shuffle(input, () => 0);
  assert.deepEqual(input, [1, 2, 3, 4, 5]);
  assert.deepEqual([...out].sort(), [1, 2, 3, 4, 5]);
  assert.notDeepEqual(out, input);
});
