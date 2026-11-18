# I wish – specifikation

Önskelisteapp för barn, främst för mobil och surfplatta.

## Användare

- **Förälder** väljer vilka butikssidor barnet får se produkter från, och ett prisspann.
- **Barn** swipar bland produkter och bygger sin önskelista.

## Funktioner

1. **Föräldravy** (⚙️, skyddad med ett mattetal)
   - Lägg till en sida genom att klistra in en länk, t.ex. en kategori som
     "barnkläder" på hm.com eller "leksaker" på clasohlson.com. Text runt länken
     (t.ex. när man delar från webbläsaren) går bra.
   - Se status per sida: hur många produkter som hittades, om läsningen pågår eller misslyckades.
   - Läs om en sida, eller ta bort den.
   - Ange prisspann (min–max kr).
2. **Swipe-vy**
   - En produktbild i taget med namn, pris och butik.
   - Swipe höger = lägg på önskelistan. Swipe vänster = inte intresserad. Knappar ✕ / ♥ som alternativ.
   - Slumpmässig ordning, blandat från alla sidor. Bara produkter inom prisspannet.
   - Redan swipade produkter visas inte igen (kan återställas).
3. **Önskelista** (💜)
   - Bild, namn, pris och länk till sidan där produkten går att köpa. Totalsumma. Ta bort.

All data sparas lokalt på enheten.

## Hur produkterna hämtas

`src/components/ProductFetcher.tsx` öppnar varje sida i en osynlig WebView (samma
webbläsarmotor som i telefonen), en sida i taget. Skriptet i `src/lib/extractor.ts`
scrollar igenom sidan, trycker på "Visa fler"-knappar och läser av produkterna:

1. **Strukturerad data** (JSON-LD, schema.org `Product`) när sidan har det.
2. **Produktkort**: en länk till samma webbplats i ett kort som också har en bild
   och ett pris. Gamla/ordinarie priser hoppas över, så reapriset används.

Sidorna läses om automatiskt efter 12 timmar. Misslyckas en omläsning behålls de
gamla produkterna.

### Testat

| Sida | Resultat |
| --- | --- |
| clasohlson.com, kategorisidor (Leksaker, Experiment, Byggleksaker, Barnkläder) | ✅ ca 18 produkter per sida, rätt namn/pris/bild/länk |
| hm.com | ⚠️ Svarar "Access Denied" till automatiserade testwebbläsare. Måste provas i appen på en riktig telefon. |

### Begränsningar

- Varje webbutik är byggd olika. Läsaren är generell, så vissa sidor kan ge fel
  eller inga produkter. Då behövs ibland en anpassning för just den butiken.
- Bara de produkter som finns på sidan (och efter "Visa fler") läses, inte hela
  kategorin om den har många sidor. Lägg gärna till flera underkategorier.
- Butiker kan blockera automatiska besök eller ändra sina sidor.
- Hämtningen fungerar bara i mobilappen, inte i webbversionen.

## Teknik

- Expo (React Native) + TypeScript, Expo Router, react-native-webview, AsyncStorage.
- Kod: `src/app/` (skärmar), `src/components/`, `src/lib/` (logik och state).
- Tester: `npm test` (läsaren testas mot exempelsidor i `src/lib/__fixtures__/`).

## Senare

- Dela önskelistan med släkt via länk, med "reserverad"-markering som barnet inte ser.
- Flera barn per familj.
- Synk mellan föräldrens och barnets enheter.
