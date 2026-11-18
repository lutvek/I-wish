import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildDeck, matchesSettings, shuffle } from './filter.ts';
import type { Product, Settings } from './types.ts';

const p = (id: string, storeId: string, categoryId: string, price: number): Product => ({
  id,
  storeId,
  storeName: storeId,
  categoryId,
  title: id,
  price,
  currency: 'SEK',
  imageUrl: '',
  productUrl: '',
});

const settings: Settings = {
  storeIds: ['a', 'b'],
  categoryKeys: ['a:toys', 'b:books'],
  minPrice: 100,
  maxPrice: 300,
};

test('matchesSettings checks store, category and price range (inclusive)', () => {
  assert.equal(matchesSettings(p('1', 'a', 'toys', 100), settings), true);
  assert.equal(matchesSettings(p('2', 'a', 'toys', 300), settings), true);
  assert.equal(matchesSettings(p('3', 'a', 'toys', 301), settings), false);
  assert.equal(matchesSettings(p('4', 'a', 'books', 200), settings), false); // kategori ej vald för butik a
  assert.equal(matchesSettings(p('5', 'c', 'toys', 200), settings), false); // butik ej vald
});

test('buildDeck drops seen, non-matching and duplicate products', () => {
  const products = [p('1', 'a', 'toys', 150), p('2', 'b', 'books', 150), p('2', 'b', 'books', 150), p('3', 'a', 'toys', 999)];
  const deck = buildDeck(products, settings, new Set(['1']));
  assert.deepEqual(deck.map((x) => x.id), ['2']);
});

test('shuffle keeps all items and does not mutate input', () => {
  const input = [1, 2, 3, 4, 5];
  const out = shuffle(input, () => 0);
  assert.deepEqual(input, [1, 2, 3, 4, 5]);
  assert.deepEqual([...out].sort(), [1, 2, 3, 4, 5]);
  assert.notDeepEqual(out, input);
});
