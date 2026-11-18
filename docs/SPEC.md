# I wish – specifikation

Önskelisteapp för barn, främst för mobil och surfplatta.

## Användare

- **Förälder** väljer vad barnet får se: butiker, kategorier inom varje butik och ett prisspann.
- **Barn** swipar bland produkter och bygger sin önskelista.

## Funktioner (MVP)

1. **Föräldrainställningar** (skyddade med ett enkelt mattetal)
   - Välj butiker (hemsidor).
   - Välj kategorier per vald butik.
   - Ange prisspann (min–max kr).
2. **Swipe-vy**
   - En produktbild i taget, med namn, pris och butik.
   - Swipe höger = lägg på önskelistan. Swipe vänster = inte intresserad.
   - Knappar (✕ / ♥) som alternativ till swipe.
   - Produkterna visas i slumpmässig ordning, blandade över alla valda butiker.
   - Bara produkter som matchar föräldrarnas filter visas.
   - Redan swipade produkter visas inte igen (kan återställas).
3. **Önskelista**
   - Lista med bild, namn, pris och länk till butiken där produkten går att köpa.
   - Totalsumma. Möjlighet att ta bort en önskan.

All data sparas lokalt på enheten (AsyncStorage).

## Teknik

- Expo (React Native) + TypeScript, Expo Router för navigering.
- Kod: `src/app/` (skärmar), `src/components/`, `src/lib/` (logik, datakällor, state).
- Produktkällor är utbytbara via gränssnittet `ProductSource` (`src/lib/types.ts`).
  Idag används påhittade butiker och produkter (`src/lib/mockCatalog.ts`).

## Öppen fråga: var kommer produkterna ifrån?

Att låta appen skrapa butikers hemsidor direkt är skört (sidorna ändras) och bryter
ofta mot butikernas villkor. Rekommenderad väg:

1. **Produktflöden via affiliate-nätverk** (t.ex. Adtraction, Awin) – många svenska
   butiker publicerar flöden med namn, pris, kategori, bild-URL och produktlänk.
   Ger dessutom provision på köp via länkarna.
2. **Liten backend** som hämtar flödena regelbundet, normaliserar kategorier och
   exponerar ett API som appen anropar (`fetchProducts(kategorier, prisspann)`).
3. Appen byter `mockSources` mot en källa som anropar backend – inget annat behöver ändras.

## Senare

- Dela önskelistan med släkt via länk, med "reserverad"-markering som barnet inte ser.
- Flera barn per familj.
- Inloggning och synk mellan föräldrens och barnets enheter.
