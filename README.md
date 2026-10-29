# De Digitale Vossenjacht — MSK Gent

Prototype van een spel voor twee spelers in de jachtzaal van het MSK Gent.
Twee iPads staan tegenover elkaar op een sokkel in het midden van de zaal.
Elke speler kijkt over de sokkel naar de muur achter de andere speler en zoekt
daar sporen in de schilderijen.

*De vossenjacht* van Paul de Vos hangt verborgen achter een gordijn. Enkel de
winnaar krijgt het schilderij op zijn scherm te zien en krijgt een
**penning (token) met NFC-chip**. Met die penning opent hij het gordijn in de zaal.
Het embleem op de schermen is het ontwerp van die penning.

Het gordijn bestaat enkel fysiek: het spel toont het niet en spreekt er niet
over, en *De vossenjacht* verschijnt nergens digitaal. Wat de penning doet,
ontdekt de winnaar in de zaal.

Daarnaast krijgt de winnaar een QR-code om zijn penning ook digitaal te
bewaren in zijn **digitale jachtkamer** op de gsm (`jachtkamer.html`).

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
5. Wie dat eerst juist heeft, wint: de penning draait binnen als een munt, er valt confetti,
   de hoorn blaast het hallali, de speler krijgt de opdracht de penning te
   nemen en tegen de lezer aan de grote muur te houden, en ziet een QR-code
   naar zijn digitale jachtkamer.
6. Na 60 seconden (of 2 minuten zonder aanraking) gaat alles terug naar het begin.

## Bestanden

```
index.html      het spel
jachtkamer.html de digitale jachtkamer (gsm-pagina van de winnaar)
duo.html        testpagina: beide schermen naast elkaar
css/style.css   vormgeving
js/data.js      ALLE inhoud: werken, vragen, weetjes, prijs, geluid
js/embleem.js   het embleem = ontwerp van de penning
js/hoorn.js     de jachthoorn
js/game.js      spellogica
js/jachtkamer.js + css/jachtkamer.css  de gsm-pagina
penning/        het embleem als los bestand om de penning te laten maken
```

## Vormgeving

Speels en eenvoudig, in de stijl van een oud badge:
- **Kader:** elk scherm zit in een afgeronde blauwe rand met een groen binnenlijntje, op muntgroen.
- **Letter:** Jost, een heldere geometrische letter (zoals Futura).
- **Kleuren:** muntgroen, blauw, groen, vossenoranje en room.
- **Speels:** een vos die meekijkt bij elke vraag, pootafdrukken als voortgang,
  confetti bij elk gevonden spoor, een "Oeps!"-scherm bij een fout, en een
  penning die als een munt binnendraait voor de winnaar.

De lettertypes komen van Google Fonts en hebben dus internet nodig. Voor de
installatie is het veiliger ze lokaal in de repository te zetten (map `fonts/`
met de .woff2-bestanden en `@font-face`-regels in `style.css`).

## De penning

De penning is een afgeronde driehoek met een jachthond en een vos. In `penning/`:

- `penning-kleur.svg` / `.png`: in kleur, zoals op de schermen
- `penning-zwartwit.svg`: zwart op wit, om te laten graveren, drukken of borduren

Wil je de penning aanpassen, dan doe je dat in `js/embleem.js`.

## De digitale jachtkamer

Na het winnen toont de iPad een QR-code. Die opent `jachtkamer.html` op de
gsm van de winnaar, met de gegevens van de penning in de link zelf (rol,
datum, speeltijd, fouten, volgnummer): er is dus geen server of database nodig.
De gsm onthoudt de penning, zodat wie meerdere keren wint een verzameling
opbouwt.

Op de pagina:
- de penning, die meedraait als je je gsm kantelt;
- de knoppen *Toevoegen aan Apple Wallet* en *Bewaren in Google Wallet*;
- een wandeling door de jachtzaal, muur per muur, met de werken en hun
  weetjes. Het geheime werk staat er als *Verborgen: enkel te zien in de zaal*.

**Wallet-pas:** de knoppen tonen in dit prototype een voorbeeld van de pas.
Een echte pas vraagt:
- voor **Apple Wallet** een Apple Developer-account (± € 99 per jaar), een
  *Pass Type ID* met certificaat, en een klein serverscript dat het
  `.pkpass`-bestand ondertekent (of een dienst zoals PassKit, Passcreator of
  Passslot die dat doet);
- voor **Google Wallet** een Google Wallet API-account (gratis) en een
  ondertekende "Save to Google Wallet"-link.

Een Wallet-pas kan geen NFC gebruiken zonder speciale toestemming van Apple;
de fysieke penning blijft dus de sleutel in de zaal, de digitale is het
aandenken.

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
