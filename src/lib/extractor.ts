/**
 * Läser produkter från en färdigrenderad webbsida (kategorisida i en webbutik).
 *
 * Koden är en sträng eftersom den körs inne i sidan i en WebView (injiceras som
 * JavaScript). Den får därför bara använda vanliga webbläsar-API:er, inga
 * imports, och inga backticks. Testerna kör samma sträng mot exempelsidor.
 *
 * Två strategier, resultaten slås ihop:
 *  1. Strukturerad data (JSON-LD, schema.org Product/ItemList) som många butiker
 *     lägger in för Google.
 *  2. Heuristik: länkar till samma webbplats som ligger i ett "kort" tillsammans
 *     med en bild och ett pris i kronor.
 *
 * Definierar funktionen __iwishExtract(document, pageUrl) -> { title, products }.
 */
export const EXTRACTOR_JS = String.raw`
function __iwishExtract(doc, pageUrl) {
  var MAX = 150;

  function clean(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }
  // Text med mellanslag mellan element, så att "Strl 110" och "1 299 kr" i
  // olika element inte flyter ihop till "Strl 1101 299 kr".
  function textOf(el) {
    var parts = [];
    (function walk(n) {
      if (n.nodeType === 3) parts.push(n.nodeValue);
      else if (n.nodeType === 1 && !/^(SCRIPT|STYLE|NOSCRIPT|DEL|S)$/i.test(n.nodeName)) {
        for (var c = n.firstChild; c; c = c.nextSibling) walk(c);
      }
    })(el);
    return clean(parts.join(' '));
  }
  function abs(u) {
    if (!u) return null;
    try { var r = new URL(String(u).trim(), pageUrl); return /^https?:$/.test(r.protocol) ? r.href : null; }
    catch (e) { return null; }
  }
  function siteOf(u) {
    try { var parts = new URL(u).hostname.split('.'); return parts.slice(-2).join('.'); }
    catch (e) { return ''; }
  }
  var pageSite = siteOf(pageUrl);
  var pageNoHash = String(pageUrl).split('#')[0];

  function toNumber(intPart, decPart) {
    var n = Number(String(intPart).replace(/[\s .]/g, ''));
    if (decPart && /^\d+$/.test(decPart)) n += Number('0.' + decPart);
    return n;
  }

  // Lägsta pris i kronor i en text, eller null. Kräver "kr", "kronor", "SEK" eller ":-"
  // så att t.ex. storlekar ("Strl 110") inte tolkas som pris.
  function parsePrice(text) {
    var re = /(sek|kr)?\s*(\d{1,3}(?:[  .]\d{3})+|\d+)(?:[,.](\d{1,2}|-))?\s*(kronor\b|kr\b|sek\b|:-)?/gi;
    var m, best = null;
    text = String(text || '');
    while ((m = re.exec(text))) {
      if (!m[1] && !m[4] && m[3] !== '-') continue;
      var n = toNumber(m[2], m[3]);
      if (n > 0 && n < 1000000 && (best === null || n < best)) best = n;
    }
    return best === null ? null : Math.round(best);
  }

  function priceValue(v) {
    if (v === null || v === undefined || v === '') return null;
    if (typeof v === 'number') return v > 0 ? Math.round(v) : null;
    var s = String(v).replace(/[^\d,.\s]/g, '').trim();
    var m = /^(\d{1,3}(?:[  .]\d{3})+|\d+)(?:[,.](\d{1,2}))?$/.exec(s);
    if (!m) return null;
    var n = toNumber(m[1], m[2]);
    return n > 0 ? Math.round(n) : null;
  }

  function bestFromSrcset(srcset) {
    if (!srcset) return null;
    var items = String(srcset).split(',').map(function (s) { return s.trim().split(/\s+/)[0]; }).filter(Boolean);
    return items.length ? items[items.length - 1] : null;
  }

  function imgSrc(img) {
    var picture = img.closest ? img.closest('picture') : null;
    var source = picture ? picture.querySelector('source[srcset], source[data-srcset]') : null;
    var cands = [
      bestFromSrcset(img.getAttribute('srcset')),
      bestFromSrcset(img.getAttribute('data-srcset')),
      source ? bestFromSrcset(source.getAttribute('srcset') || source.getAttribute('data-srcset')) : null,
      img.currentSrc,
      img.getAttribute('data-src'),
      img.getAttribute('data-original'),
      img.getAttribute('data-lazy-src'),
      img.getAttribute('src')
    ];
    for (var i = 0; i < cands.length; i++) {
      var c = cands[i];
      if (!c || /^data:/i.test(c) || /\.svg(\?|$)/i.test(c)) continue;
      var a = abs(c);
      if (a) return a;
    }
    return null;
  }

  var out = [];
  var seen = {};
  function add(p) {
    if (!p.title || !p.imageUrl || !p.productUrl || !(p.price > 0)) return;
    var key = p.productUrl.split('#')[0];
    if (seen[key] || out.length >= MAX) return;
    seen[key] = true;
    out.push({ title: p.title.slice(0, 140), price: p.price, imageUrl: p.imageUrl, productUrl: key });
  }

  // 1. JSON-LD
  function visit(node, depth) {
    if (!node || typeof node !== 'object' || depth > 12) return;
    if (Array.isArray(node)) { for (var i = 0; i < node.length; i++) visit(node[i], depth + 1); return; }
    var t = node['@type'];
    var types = Array.isArray(t) ? t : [t];
    if (types.indexOf('Product') >= 0 || types.indexOf('ProductGroup') >= 0) {
      var offers = node.offers;
      if (Array.isArray(offers)) offers = offers[0];
      var price = offers ? priceValue(offers.price != null ? offers.price : offers.lowPrice) : null;
      var img = node.image;
      if (Array.isArray(img)) img = img[0];
      if (img && typeof img === 'object') img = img.url || img.contentUrl;
      add({
        title: clean(node.name),
        price: price,
        imageUrl: abs(img),
        productUrl: abs(node.url || (offers && offers.url))
      });
    }
    for (var k in node) if (k !== 'offers' && Object.prototype.hasOwnProperty.call(node, k)) visit(node[k], depth + 1);
  }
  var scripts = doc.querySelectorAll('script[type="application/ld+json"]');
  for (var s = 0; s < scripts.length; s++) {
    try { visit(JSON.parse(scripts[s].textContent), 0); } catch (e) {}
  }

  // 2. Produktkort i sidan
  function productLinkWithImage(el) {
    var hrefs = {};
    var links = el.querySelectorAll('a[href]');
    for (var i = 0; i < links.length; i++) {
      if (links[i].querySelector('img')) {
        var h = abs(links[i].getAttribute('href'));
        if (h) hrefs[h.split('#')[0]] = true;
      }
    }
    return Object.keys(hrefs).length;
  }
  // Sant för text som inte bara är ett pris ("199,90", "249 kr").
  function notPrice(t) { return !!t && t.length > 1 && parsePrice(t) === null && !/^[\d\s.,:\-]+$/.test(t); }
  function sameProduct(link, url) { var h = abs(link.getAttribute('href')); return h && h.split('#')[0] === url; }

  // Produktnamnet i ett kort. Rubriker och produktlänkens text går före klasser
  // som "name", eftersom t.ex. kategorinamn ofta också har "name" i klassen.
  function titleIn(card, url, img) {
    var i, t, nodes = card.querySelectorAll('h1, h2, h3, h4, h5, h6, [role="heading"]');
    for (i = 0; i < nodes.length; i++) { t = textOf(nodes[i]); if (notPrice(t)) return t; }
    var links = card.querySelectorAll('a[href]');
    for (i = 0; i < links.length; i++) {
      if (sameProduct(links[i], url)) { t = textOf(links[i]); if (notPrice(t)) return t; }
    }
    nodes = card.querySelectorAll('[class*="title" i], [class*="name" i], [data-testid*="title" i], [data-testid*="name" i]');
    for (i = 0; i < nodes.length; i++) {
      var cls = String(nodes[i].getAttribute('class') || '') + ' ' + String(nodes[i].getAttribute('data-testid') || '');
      if (/categor|brand|vendor|tag|badge/i.test(cls)) continue;
      t = textOf(nodes[i]); if (notPrice(t)) return t;
    }
    for (i = 0; i < links.length; i++) {
      if (sameProduct(links[i], url)) {
        t = clean(links[i].getAttribute('aria-label') || links[i].getAttribute('title')); if (notPrice(t)) return t;
      }
    }
    t = clean(img.getAttribute('alt'));
    return notPrice(t) ? t : '';
  }

  // Vilken länk i kortet som leder till produkten: den runt bilden, annars den i rubriken.
  function productUrlIn(card, fallback) {
    var links = card.querySelectorAll('a[href]');
    var i, h;
    for (i = 0; i < links.length; i++) {
      if (links[i].querySelector('img')) { h = abs(links[i].getAttribute('href')); if (h && siteOf(h) === pageSite) return h.split('#')[0]; }
    }
    for (i = 0; i < links.length; i++) {
      if (links[i].closest('h1, h2, h3, h4, h5, h6, [role="heading"]') || links[i].querySelector('h1, h2, h3, h4, h5, h6')) {
        h = abs(links[i].getAttribute('href')); if (h && siteOf(h) === pageSite) return h.split('#')[0];
      }
    }
    return fallback;
  }

  // Om priset står utan valuta ("199,90"): leta i element vars klass innehåller
  // "price", men hoppa över gamla/ordinarie priser.
  function priceFromPriceElements(card) {
    var nodes = card.querySelectorAll('[class*="price" i], [data-testid*="price" i], [itemprop="price"]');
    var best = null;
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      var cls = String(n.getAttribute('class') || '') + ' ' + String(n.getAttribute('data-testid') || '');
      if (/old|original|was|before|regular|ordinarie|tidigare|compare|strike/i.test(cls)) continue;
      if (n.closest && n.closest('del, s')) continue;
      var v = priceValue(n.getAttribute('content') || textOf(n));
      if (v !== null && (best === null || v < best)) best = v;
    }
    return best;
  }

  var cards = [];
  var anchors = doc.querySelectorAll('a[href]');
  for (var i = 0; i < anchors.length && out.length < MAX; i++) {
    var a = anchors[i];
    var href = abs(a.getAttribute('href'));
    if (!href || siteOf(href) !== pageSite) continue;
    var key = href.split('#')[0];
    if (key === pageNoHash || seen[key]) continue;

    var el = a;
    for (var depth = 0; el && depth < 7; depth++) {
      if (el.querySelectorAll && productLinkWithImage(el) > 1) break; // nått rutnätet
      var img = el.querySelector ? el.querySelector('img') : null;
      if (img) {
        var price = parsePrice(textOf(el));
        if (price === null) price = priceFromPriceElements(el);
        if (price !== null) {
          if (cards.indexOf(el) < 0) {
            cards.push(el);
            var url = productUrlIn(el, key);
            add({ title: titleIn(el, url, img), price: price, imageUrl: imgSrc(img), productUrl: url });
          }
          break;
        }
      }
      el = el.parentElement;
    }
  }

  var title = clean(doc.title).split(/\s[|–—-]\s/)[0];
  return { title: title, products: out };
}
`;

/**
 * Körs i WebView efter att sidan laddats: scrollar ner så att fler produkter
 * laddas in, läser av tills antalet slutar öka och skickar resultatet till appen.
 */
export const WEBVIEW_SCRIPT = `
(function () {
  if (window.__iwishStarted) return;
  window.__iwishStarted = true;
  ${EXTRACTOR_JS}
  var last = -1, stable = 0, ticks = 0, clicks = 0;
  function send(r) { window.ReactNativeWebView.postMessage(JSON.stringify(r)); }
  // Knappar som "Visa fler" laddar in nästa sida produkter. Bara <button>, så
  // att vi aldrig navigerar bort från sidan.
  function loadMoreButton() {
    var btns = document.querySelectorAll('button, [role="button"]');
    for (var i = 0; i < btns.length; i++) {
      var b = btns[i];
      var t = (b.textContent || '').trim();
      if (t.length < 40 && /visa fler|ladda fler|fler produkter|load more|show more/i.test(t) && !b.disabled && b.offsetParent !== null) return b;
    }
    return null;
  }
  function step() {
    ticks++;
    var r;
    try { r = __iwishExtract(document, location.href); }
    catch (e) { send({ title: document.title, products: [], error: String(e) }); return; }
    if (r.products.length === last && r.products.length > 0) stable++; else stable = 0;
    last = r.products.length;
    if (stable >= 2 && clicks < 4 && r.products.length < 150) {
      var more = loadMoreButton();
      if (more) { clicks++; stable = 0; more.click(); }
    }
    if (stable >= 2 || ticks >= 25 || r.products.length >= 150) { send(r); return; }
    window.scrollBy(0, window.innerHeight * 1.5);
    setTimeout(step, 1000);
  }
  setTimeout(step, 1500);
})();
true;
`;
