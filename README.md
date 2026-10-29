# De Digitale Vossenjacht — MSK Gent

Prototype van een spel voor twee spelers in de jachtzaal van het MSK Gent.
Twee iPads staan tegenover elkaar op een sokkel in het midden van de zaal.
Elke speler kijkt over de sokkel naar de muur achter de andere speler en zoekt
daar sporen in de schilderijen. Wie eerst alle sporen heeft, mag als eerste
naar het laatste spoor op de grote muur met *De vossenjacht* van Paul de Vos.

## Opstelling

| Scherm | URL | Kijkt naar | Bovenmuur ligt |
| --- | --- | --- | --- |
| De Vos | `index.html?rol=vos` | kant 3 (landschap, uil, pauw) | links |
| De Jager | `index.html?rol=jager` | kant 1 (markt, everzwijn, roerdomp) | rechts |

## Spelverloop

1. Beide spelers tikken op **Ik ben klaar** → aftellen.
2. Elke speler lost 5 sporen op: op de juiste lijst tikken in een schets van de
   muur, of een meerkeuzevraag. Fout = 3 seconden straf.
3. Na elk juist antwoord: het echte schilderij met een weetje.
4. Wie de 5 sporen heeft, krijgt de opdracht zich om te draaien naar de
   bovenmuur en krijgt de finalevraag.
5. Eerste juiste finale-antwoord wint. De winnaar krijgt de opdracht de
   NFC-penning te nemen en tegen de lezer aan de grote muur te houden; daar
   gaat het gordijn voor *De vossenjacht* open. Het schilderij wordt nooit op
   het scherm getoond. Na 45 seconden (of 2 minuten zonder aanraking) gaat alles
   terug naar het begin.

## Bestanden

```
index.html      het spel
duo.html        testpagina: beide schermen naast elkaar
css/style.css   vormgeving
js/data.js      ALLE inhoud: werken, vragen, weetjes, opstelling
js/game.js      spellogica
```

Vragen aanpassen? Enkel `js/data.js` bewerken.

## Online zetten met GitHub Pages

1. Maak een nieuwe repository op GitHub en upload deze map (of `git push`).
2. Ga naar **Settings → Pages**, kies *Deploy from a branch*, branch `main`, map `/ (root)`.
3. Na een minuutje staat het spel op `https://<gebruikersnaam>.github.io/<repo>/`.
4. Open op elke iPad de juiste URL (`?rol=vos` of `?rol=jager`) en zet de iPad in
   *Begeleide toegang* (Instellingen → Toegankelijkheid) zodat bezoekers de app niet kunnen verlaten.

## Belangrijk: synchronisatie tussen twee iPads

Dit prototype laat de twee schermen met elkaar praten via `BroadcastChannel`.
Dat werkt **enkel binnen dezelfde browser op hetzelfde toestel** — perfect om te
testen met `duo.html`, maar twee aparte iPads zien elkaar zo niet.

Voor de echte installatie is een kleine realtime dienst nodig. In `js/game.js`
hoef je daarvoor enkel de functie `verbind()` te vervangen. Opties:

- **Firebase Realtime Database** of **Supabase Realtime** (gratis, werkt vanaf GitHub Pages)
- een kleine **WebSocket-server** op een laptop/Raspberry Pi in het museum (werkt ook zonder internet)
- **één groot scherm** in plaats van twee iPads, met beide spelers aan één toestel

## Beelden

De schilderijen komen rechtstreeks van de beeldserver van het MSK
(`imagehub.mskgent.be`, publiek domein). Voor nog ontbrekende beelden staat
`iiif: null` in `data.js`: *Boeren op weg naar de markt*, *Stier door honden
aangevallen* en het medaillon (collectie STAM Gent). In het museum zelf kan het
beter zijn de beelden lokaal in een map `img/` te zetten, zodat het spel niet
van wifi afhangt.

## Nog te controleren in de zaal

- Vragen over details (wat staat er op de vaas, van welke kant komen de honden,
  wat draagt de vrouw op haar hoofd) aftoetsen aan de echte schilderijen.
- De afmetingen van *Boeren op weg naar de markt* in `data.js` zijn geschat.
