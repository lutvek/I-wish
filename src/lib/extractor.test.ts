import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { parseHTML } from 'linkedom';
import { EXTRACTOR_JS } from './extractor.ts';
import type { ExtractResult } from './types.ts';

const extract = new Function('doc', 'url', `${EXTRACTOR_JS}; return __iwishExtract(doc, url);`) as (
  doc: Document,
  url: string,
) => ExtractResult;

function run(fixture: string, url: string): ExtractResult {
  const html = readFileSync(new URL(`./__fixtures__/${fixture}`, import.meta.url), 'utf8');
  const { document } = parseHTML(html);
  return extract(document as unknown as Document, url);
}

test('reads product cards from a plain product grid', () => {
  const r = run('grid.html', 'https://www.exempel.se/leksaker');
  assert.equal(r.title, 'Leksaker');
  assert.deepEqual(r.products, [
    { title: 'Robotbyggsats', price: 349, imageUrl: 'https://www.exempel.se/img/robot-800.jpg', productUrl: 'https://www.exempel.se/p/robot-123' },
    { title: 'Pussel 100 bitar', price: 1299, imageUrl: 'https://cdn.exempel.se/pussel.jpg', productUrl: 'https://www.exempel.se/p/pussel-9?color=red' },
    { title: 'Fotboll', price: 199, imageUrl: 'https://www.exempel.se/img/boll.jpg', productUrl: 'https://www.exempel.se/p/boll-1' },
  ]);
});

test('reads schema.org JSON-LD and skips broken blocks', () => {
  const r = run('jsonld.html', 'https://www.klader.se/barn');
  assert.equal(r.title, 'Barnkläder');
  assert.deepEqual(
    r.products.map((p) => [p.title, p.price, p.productUrl, p.imageUrl]),
    [
      ['T-shirt med tryck', 79, 'https://www.klader.se/p/tshirt', 'https://cdn.example.com/tshirt.jpg'],
      ['Jeans', 249, 'https://www.klader.se/p/jeans', 'https://cdn.example.com/jeans.jpg'],
      ['Jacka', 1199, 'https://www.klader.se/p/jacka', 'https://www.klader.se/img/jacka.jpg'],
    ],
  );
});

test('handles prices without currency, old prices and category links inside cards', () => {
  const r = run('cards-no-currency.html', 'https://www.example.com/se/Leksaker/c/2462');
  assert.deepEqual(
    r.products.map((p) => [p.title, p.price, p.productUrl]),
    [
      ['Robotbyggsats, från 8 år', 200, 'https://www.example.com/se/Robot/p/1'],
      ['Kulbana 88 delar', 349, 'https://www.example.com/se/Kulbana/p/2'],
    ],
  );
});

test('lekia-like page: ignores cart drawer, badges in links and struck-through prices', () => {
  const r = run('lekia-like.html', 'https://www.lekia.se/leksaker/spel');
  assert.deepEqual(
    r.products.map((p) => [p.title, p.price, p.productUrl]),
    [
      ['Kulbana med hiss 236 delar', 399, 'https://www.lekia.se/leksaker/spel/kulbana-med-hiss-236-st'],
      ['BRIO Labyrint', 299, 'https://www.lekia.se/leksaker/spel/brio-labyrint'],
    ],
  );
});

test('toyspace-like page: name from name element, campaign price, not old price or savings', () => {
  const r = run('toyspace-like.html', 'https://toyspace.se/spel');
  assert.deepEqual(
    r.products.map((p) => [p.title, p.price, p.imageUrl]),
    [
      ['2-i-1 bordfotboll och bordshockey', 473, 'https://toyspace.se/media/bordsfotboll.webp'],
      ['Hitster Battle of the Generations', 368, 'https://toyspace.se/media/hitster.jpg'],
    ],
  );
});
