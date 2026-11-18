/**
 * Kör appens produktläsare (samma skript som i WebView) mot riktiga butikssidor
 * och skriver ut vad som hittades. Kräver Playwright med Chromium:
 *
 *   npm run live-check                 # alla sidor i listan nedan
 *   npm run live-check -- <url> ...    # bara angivna sidor
 *
 * Avslutas med felkod om en sida ger för få produkter eller misstänkta namn/priser.
 */
import { createRequire } from 'node:module';
import { WEBVIEW_SCRIPT } from '../src/lib/extractor.ts';
import type { ExtractResult } from '../src/lib/types.ts';

const PAGES = [
  'https://www.clasohlson.com/se/Fritid/Leksaker-&-spel/c/1908',
  'https://www.clasohlson.com/se/Fritid/Leksaker-&-spel/Byggleksaker-och-magneter/c/2462',
  'https://www.lekia.se/leksaker/byggsatser',
  'https://www.lekia.se/leksaker/dockor',
  'https://www.lekia.se/leksaker/spel',
  'https://toyspace.se/byggklossar-och-byggleksaker',
  'https://toyspace.se/dockor-och-tillbehor',
  'https://toyspace.se/spel',
  'https://www2.hm.com/sv_se/barn/shoppa-efter-produkt/visa-alla.html',
];

const MIN_PRODUCTS = 5;
// Namn som tyder på att något annat än produktnamnet lästs (knappar, etiketter).
const SUSPICIOUS_TITLE = /^(kassa|fortsätt handla|köp|lägg i|nyhet|bästsäljare|black deal|kampanj|rea)\b/i;

const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');

type Outcome = { url: string; status: number | string; result?: ExtractResult; seconds: number; problems: string[] };

async function check(browser: any, url: string): Promise<Outcome> {
  const page = await browser.newPage({ ...devices['iPhone 13'], locale: 'sv-SE' });
  const t0 = Date.now();
  const problems: string[] = [];
  try {
    const done = new Promise<ExtractResult>((resolve) =>
      page.exposeFunction('__iwishPost', (data: string) => resolve(JSON.parse(data))),
    );
    await page.addInitScript(() => {
      (window as any).ReactNativeWebView = { postMessage: (d: string) => (window as any).__iwishPost(d) };
    });
    const resp = await page.goto(url, { waitUntil: 'load', timeout: 45_000 });
    await page.evaluate(WEBVIEW_SCRIPT);
    const result = await Promise.race([
      done,
      new Promise<ExtractResult>((r) => setTimeout(() => r({ title: '(timeout)', products: [] }), 60_000)),
    ]);
    const n = result.products.length;
    if (n < MIN_PRODUCTS) problems.push(`bara ${n} produkter`);
    const bad = result.products.filter((p) => SUSPICIOUS_TITLE.test(p.title) || !(p.price > 0));
    if (bad.length) problems.push(`${bad.length} misstänkta: ${bad.slice(0, 3).map((p) => `"${p.title}" ${p.price} kr`).join(', ')}`);
    return { url, status: resp?.status() ?? '?', result, seconds: (Date.now() - t0) / 1000, problems };
  } catch (e) {
    return { url, status: 'fel', seconds: (Date.now() - t0) / 1000, problems: [String((e as Error).message).split('\n')[0]] };
  } finally {
    await page.close();
  }
}

const urls = process.argv.slice(2).length ? process.argv.slice(2) : PAGES;
const browser = await chromium.launch();
let failed = 0;
for (const url of urls) {
  const o = await check(browser, url);
  const n = o.result?.products.length ?? 0;
  console.log(`\n${o.problems.length ? '✗' : '✓'} ${url}`);
  console.log(`  HTTP ${o.status} · "${o.result?.title ?? ''}" · ${n} produkter · ${o.seconds.toFixed(1)} s`);
  for (const p of o.result?.products.slice(0, 3) ?? []) console.log(`    ${p.price} kr  ${p.title}`);
  for (const pr of o.problems) console.log(`  ! ${pr}`);
  if (o.problems.length) failed++;
}
await browser.close();
console.log(`\n${urls.length - failed}/${urls.length} sidor ok`);
process.exit(failed ? 1 : 0);
