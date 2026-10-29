# De Digitale Vossenjacht — MSK Gent

Prototype van een spel voor twee spelers in de jachtzaal van het MSK Gent.
Twee iPads staan tegenover elkaar op een sokkel in het midden van de zaal.
Elke speler kijkt over de sokkel naar de muur achter de andere speler en zoekt
daar sporen in de schilderijen.

*De vossenjacht* van Paul de Vos hangt verborgen achter een gordijn. Enkel de
winnaar krijgt het schilderij op zijn scherm te zien en krijgt een
**penning (token) met NFC-chip**. Met die penning opent hij het gordijn in de zaal.
Het embleem op de schermen is het ontwerp van die penning.

## Opstelling

| Scherm | URL | Kijkt naar | Grote muur ligt |
| --- | --- | --- | --- |
| De Vos | `index.html?rol=vos` | kant 3 (landschap, uil, pauw) | links |
| De Jager | `index.html?rol=jager` | kant 1 (markt, everzwijn, roerdomp) | rechts |

## Spelverloop

1. Beide spelers tikken op **Ik ben klaar**. Een jachthoorn blaast de jacht in, daarna volgt een aftelling.
2. Elke speler lost 5 sporen op: op de juiste lijst tikken in een schets van de
   muur, of een meerkeuzevraag. Fout = 3 seconden straf.
3. Na elk juist antwoord: het echte schilderij met een weetje.
4. Wie de 5 sporen heeft, draait zich naar de grote muur. Het laatste spoor
   gaat over het medaillon naast het gordijn.
5. Wie dat eerst juist heeft, wint: het gordijn op het scherm gaat open, de
   hoorn blaast het hallali en de speler krijgt de opdracht de penning te
   nemen en bij het gordijn te scannen. De verliezer ziet het schilderij niet.
6. Na 60 seconden (of 2 minuten zonder aanraking) gaat alles terug naar het begin.

## Bestanden

```
index.html      het spel
duo.html        testpagina: beide schermen naast elkaar
css/style.css   vormgeving
js/data.js      ALLE inhoud: werken, vragen, weetjes, prijs, geluid
js/embleem.js   het embleem = ontwerp van de penning
js/hoorn.js     de jachthoorn
js/game.js      spellogica
penning/        het embleem als los bestand om de penning te laten maken
```

## Vormgeving

- **Opbouw:** een kanten embleem in het midden, gedraaide tekstblokken en
  MSK-badges in de marges, het woordmerk *Vossenjacht.* in de vier hoeken.
- **Typografie:** zware smalle blokletters met 3D-schaduw (Big Shoulders
  Display), een retro penseelschrift (Yellowtail) en kleine kapitalen tussen
  lijntjes (Barlow Condensed), zoals oude jacht- en visetiketten.
- **Kleuren:** warm zwart, jachtgeel, blaze-oranje en rood.

De lettertypes komen van Google Fonts en hebben dus internet nodig. Voor de
installatie is het veiliger ze lokaal in de repository te zetten (map `fonts/`
met de .woff2-bestanden en `@font-face`-regels in `style.css`).

## De penning

In `penning/` staat het embleem als vectorbestand:

- `penning-donker.svg` / `.png`: licht op donker, met borduursteek (zoals op de schermen)
- `penning-licht.svg`: donker op wit, zonder steek, om te laten graveren, drukken of borduren

Wil je het embleem aanpassen, dan doe je dat in `js/embleem.js`.

Vragen of teksten aanpassen? Enkel `js/data.js` bewerken.

## De jachthoorn

Het spel speelt een nagebootste natuurhoorn af (enkel de natuurtonen van D,
zoals een echte *trompe de chasse*). Een echte opname klinkt natuurlijk beter:
zet een mp3 in een map `audio/` en vul het pad in bij `MSK.geluid.hoorn` en
`MSK.geluid.hallali` in `js/data.js`. Vrij te gebruiken opnames vind je onder
meer op Wikimedia Commons ("trompe de chasse", "hunting horn") of Freesound.

iPads spelen pas geluid na een aanraking; het spel ontgrendelt het geluid bij
de knop *Ik ben klaar*. Zet het volume van de iPads niet op stil.

## Het gordijn en de NFC-penning

Het openen van het gordijn gebeurt buiten deze website, met eigen hardware bij
het schilderij. Een eenvoudige opbouw:

- een **NFC-lezer** (bv. PN532 of RC522) naast het gordijn;
- een **microcontroller** (bv. ESP32 of Arduino) die de nummers (UID) van
  de penningen herkent;
- een **motor** of gordijnrail die het gordijn opent en na een minuut weer sluit.

De penningen zijn gewone NFC-tags (bv. NTAG215, ook als ronde of ovale token
te koop) met het embleem erop. De medewerker of een automaat geeft de
penning aan de winnaar. De tekst die de winnaar ziet, pas je
aan bij `MSK.prijs` in `js/data.js`.

Later kan het spel de uitgifte van de penning ook rechtstreeks aansturen (bv. een
automaat in de sokkel), maar dat hangt af van de hardware die gekozen wordt.

## Online zetten met GitHub Pages

Settings → Pages → *Deploy from a branch*, branch `main`, map `/ (root)`.
Het spel staat dan op `https://<gebruikersnaam>.github.io/vossenjacht/`.
Zet de iPads in *Begeleide toegang* (Instellingen → Toegankelijkheid) zodat
bezoekers het spel niet kunnen verlaten.

## Belangrijk: synchronisatie tussen twee iPads

Dit prototype laat de twee schermen met elkaar praten via `BroadcastChannel`.
Dat werkt **enkel binnen dezelfde browser op hetzelfde toestel**: perfect om te
testen met `duo.html`, maar twee aparte iPads zien elkaar zo niet.

Voor de echte installatie is een kleine realtime dienst nodig. In `js/game.js`
hoef je daarvoor enkel de functie `verbind()` te vervangen. Opties:

- **Firebase Realtime Database** of **Supabase Realtime** (gratis, werkt vanaf GitHub Pages)
- een kleine **WebSocket-server** op een laptop/Raspberry Pi in het museum
  (werkt ook zonder internet, en kan meteen het gordijn aansturen)

## Beelden

De schilderijen komen rechtstreeks van de beeldserver van het MSK
(`imagehub.mskgent.be`, publiek domein). Voor nog ontbrekende beelden staat
`iiif: null` in `data.js`: *Boeren op weg naar de markt*, *Stier door honden
aangevallen* en het medaillon (collectie STAM Gent).

## Nog te controleren in de zaal

- Vragen over details (de vaas bij de uil, de kant van de honden, wat de
  vrouw op haar hoofd draagt) aftoetsen aan de echte schilderijen.
- Het materiaal van het medaillon (het laatste spoor gaat uit van gesneden hout).
- De afmetingen van *Boeren op weg naar de markt* in `data.js` zijn geschat.
