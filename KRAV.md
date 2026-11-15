# Krav: Önskelista-app för barn

## Översikt

En app där barn bläddrar bland varor och markerar det de önskar sig. Föräldrarna bestämmer vilka varor som visas och ser barnets önskelista med priser och var varorna kan köpas.

## Föräldrarnas inställningar

Föräldrarna styr vilka varor som visas för barnet med tre filter:

1. **Butiker:** vilka webbutiker varorna ska hämtas från.
2. **Kategorier:** vilka kategorier som gäller för varje vald butik.
3. **Prisintervall:** ett lägsta och ett högsta pris.

Bara varor som uppfyller alla tre villkoren visas för barnet.

## Varudata

- Varorna läses in från butikernas webbsidor.

## Barnens vy

- Varje vara visas bara med **en bild**, utan namn, pris eller annan text.
- Varorna visas i **slumpad ordning**, blandade från alla valda butiker.
- Det finns **två vyer att välja mellan**:
  1. **Scrollvy:** en lång lista med varor efter varandra. Varje vara har en **"Önska"-knapp**.
  2. **Swipevy:** en vara i taget i fullskärm. Barnet **swipar höger** för att önska sig varan och **vänster** för att hoppa över den.

## Föräldrarnas önskelista

- Allt barnet önskar sig hamnar på en önskelista som föräldrarna kan se.
- Där står varje varas **pris** och **var den kan köpas**.

## Öppna frågor (tas upp senare)

- Plattform: webbapp, mobilapp (iOS/Android) eller båda?
- Konton: ska en förälder kunna ha flera barn med var sin lista?
- Hur ska inläsningen från butikernas webbsidor gå till tekniskt?
- Kan barnet ångra en önskan?
