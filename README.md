# De Vossenjacht

Een spel voor twee spelers in de jachtzaal. Twee iPads staan tegenover elkaar
op een sokkel in het midden van de zaal. **De Vos** is op de vlucht, **de
Jager** zit hem op de hielen. Elke speler kijkt over de sokkel naar de muur
achter de ander en volgt daar sporen in de schilderijen.

Wie als eerste het laatste spoor vindt, wint een **penning met NFC-chip**.
Met die penning gaat in de zaal het gordijn open. Het schilderij achter het
gordijn wordt nooit op het scherm getoond.

## Opstelling

| Scherm | URL | Kijkt naar | Grote muur ligt |
| --- | --- | --- | --- |
| De Vos | `index.html?rol=vos` | kant 3 | links |
| De Jager | `index.html?rol=jager` | kant 1 | rechts |

Testen op één computer: `duo.html` toont beide schermen naast elkaar.

## Spelverloop

1. **Start:** het ticket van je rol, met het FOXHUNT-logo, je gravure en een
   volgnummer. Op de achtergrond: wind, krekels, krakende takjes en een uil.
2. Tikt de Vos op **Ik ben klaar**, dan keft er een vos; bij de Jager huilt een
   jachthond. Zijn beiden klaar, dan blaast de trompet de jacht in, gevolgd
   door drie tromslagen.
3. **5 sporen:** korte opdrachtjes in de stem van je rol. Je antwoordt waar het
   hangt:
   - op de muur achter je tegenspeler: **← Links, ↑ Midden, → Rechts**;
   - op de **onderste muur** (tegenover de vossenjacht): **← Links** (Het doden
     van het hert) of **→ Rechts** (Samenkomst voor de jacht). Een gele balk
     zegt naar welke kant je je moet draaien. Elk spel bevat minstens één
     spoor op deze muur.
   Elke speler krijgt willekeurig sporen uit een ruime lijst, dus elk spel is anders.
4. **Voortgang:** de Vos laat pootafdrukken achter, de Jager bolletjes.
5. **Juist:** een belletje, met ritselende pootjes (Vos) of paardenhoeven (Jager).
   **Fout:** een kraai krast, je reeks valt terug op nul en je wacht 3 tellen.
6. **Streken:** wie **3 keer juist op rij** antwoordt (instelbaar bij
   `reeksVoorStreek`), mag een streek uithalen. De Vos stuurt **mist** (het
   scherm van de Jager wordt wazig), de Jager laat de **honden** los (het
   scherm van de Vos schudt). De reeksmeter bovenaan toont hoe ver je staat.
7. Vindt je tegenspeler een spoor, dan hoor je geritsel in de verte. Is hij
   bijna klaar, dan begint een hartslag.
8. **Laatste spoor:** draai je om naar de grote muur. Hangt het medaillon boven of onder de stier?
9. **Winnaar:** hallali op de trompet, gouden vonken en de opdracht om de
   NFC-penning tegen de lezer aan de grote muur te houden. **Verliezer:** een
   droevige trompet.

## Vormgeving

Dezelfde stijl als de tickets: elke iPad heeft de kleur van zijn ticket.
De Vos olijfgroen (`#4a4d39`) met crème (`#e1debc`), de Jager omgekeerd.
Een geperforeerde rand, het FOXHUNT-logo (`img/logo.png`), de gravures
(`img/vos.png`, `img/jager.png`), de jachthoorn (`img/hoorn.png`), de letter IM
Fell English en een volgnummer N°001 dat per iPad oploopt.

De opmaak schaalt mee met elk scherm (iPad staand of liggend, telefoon,
groot scherm): alle maten hangen af van de kortste schermzijde en de beelden
vullen de vrije ruimte zonder dat er iets van het scherm valt. Liggend staat
het startscherm in twee kolommen.

De beelden staan als PNG met transparante achtergrond in `img/`. Vervang ze
gerust door nieuwe versies onder dezelfde naam.

## Bestanden

```
index.html      het spel
duo.html        testpagina: beide schermen naast elkaar
css/style.css   vormgeving
js/data.js      ALLE inhoud: rollen, sporen, laatste spoor, prijs, geluiden
js/geluid.js    alle geluidseffecten
js/game.js      spellogica
img/            logo, gravures en jachthoorn
```

Sporen toevoegen of aanpassen? Enkel `js/data.js` bewerken. Elk spoor heeft een
tekst en een antwoord (`links`, `midden` of `rechts`).

## Geluid

Alle geluiden worden in de browser nagemaakt (`js/geluid.js`):
trompet (fanfare, startsignaal, hallali, droevige toon), tromslagen, belletje,
oplopend arpeggio bij een volle reeks, pootjes, paardenhoeven, kraai, geblaf,
huilende jachthond, kevende vos, mist, zwiep bij het omdraaien, geritsel in de
verte, hartslag, wind, krekels, takjes, een uil en een tikje bij elke knop.

De trompet is een natuurtrompet in Bes: enkel de natuurtonen, met een
koperklank die helderder wordt bij elke aanzet, ademruis en vibrato.
Echte opnames klinken nog beter: zet mp3-bestanden in een map `audio/` en vul
de paden in bij `geluiden` in `js/data.js`, bv. `hoorn: 'audio/hoorn.mp3'`.

Een iPad speelt pas geluid na een eerste aanraking; de achtergrondgeluiden
beginnen dus pas wanneer iemand het scherm aanraakt.

## Na te kijken in de zaal

Sommige sporen gaan over details die uit beschrijvingen en foto's komen.
Kijk die na aan de echte schilderijen (in `data.js` staan ze met `nakijken: true`):

- De Vos: zie je bergen in de verte in het landschap (links)?
- De Vos: ligt er een bijl bij de pauw en de everkop (rechts)?
- De Jager: zijn er in het everzwijn-schilderij (midden) echt geen mensen?
- Onderste muur: springt er een ruiter over een brug in Het doden van het hert?
- Het laatste spoor: hangt het medaillon boven de stier?
- Kloppen links, midden en rechts voor elk schilderij, gezien vanaf de sokkel?

## Online zetten

Settings → Pages → *Deploy from a branch*, branch `main`, map `/ (root)`.
Zet de iPads in *Begeleide toegang* (Instellingen → Toegankelijkheid) zodat
bezoekers het spel niet kunnen verlaten, en zet het volume aan.

## Synchronisatie tussen twee iPads

Dit prototype laat de twee schermen met elkaar praten via `BroadcastChannel`.
Dat werkt **enkel binnen dezelfde browser op hetzelfde toestel** (zoals in
`duo.html`). Voor twee echte iPads is een kleine realtime dienst nodig; in
`js/game.js` vervang je daarvoor enkel de functie `verbind()`. Opties:
Firebase Realtime Database, Supabase Realtime, of een kleine WebSocket-server
op een Raspberry Pi in de zaal (die meteen ook het gordijn kan aansturen).

## Het gordijn en de NFC-penning

Het gordijn werkt los van deze website: een NFC-lezer naast het gordijn, een
microcontroller (bv. ESP32) die de penningen herkent, en een motor die het
gordijn opent en na een minuut weer sluit. De penningen zijn gewone NFC-tags
(bv. NTAG215). De tekst die de winnaar ziet, staat bij `prijs` in `js/data.js`.
