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

1. **Start:** een nachtelijk bos met maan, mist en vuurvliegjes; wind en een uil op de achtergrond.
2. Beide spelers tikken op **Ik ben klaar**: de jachthoorn klinkt, daarna 3-2-1.
3. **5 sporen:** korte opdrachtjes in de stem van je rol ("Je maag knort… Waar
   hangt een dode haas in een boom?"). Je antwoordt met **← Links, ↑ Midden,
   → Rechts**: waar hangt het op de muur? Elke speler krijgt willekeurig 5
   sporen uit een tiental, dus elk spel is anders.
4. **Fout:** een kraai krast en je wacht 3 tellen.
5. **Juist:** pootstapjes en een belletje; je pootafdrukken lopen verder bovenaan.
6. **Streken:** na het 2de en 4de spoor lever je je tegenspeler een streek:
   - de Vos stuurt **mist**: het scherm van de Jager wordt 3 seconden wazig;
   - de Jager laat de **honden blaffen**: het scherm van de Vos schudt.
7. Is je tegenspeler bijna klaar, dan hoor je een hartslag.
8. **Laatste spoor:** draai je om naar de grote muur. Hangt het medaillon boven of onder de stier?
9. **Winnaar:** hallali op de hoorn, gouden vonken, en de opdracht om de
   NFC-penning tegen de lezer aan de grote muur te houden. **Verliezer:** een
   droevige hoorn.

## Bestanden

```
index.html      het spel (met het bos als achtergrond)
duo.html        testpagina: beide schermen naast elkaar
css/style.css   vormgeving
js/data.js      ALLE inhoud: rollen, sporen, laatste spoor, prijs, geluiden
js/geluid.js    alle geluidseffecten
js/game.js      spellogica
```

Sporen toevoegen of aanpassen? Enkel `js/data.js` bewerken. Elk spoor heeft een
tekst en een antwoord (`links`, `midden` of `rechts`).

## Geluid

Alle geluiden worden in de browser nagemaakt: jachthoorn, hallali, droevige
hoorn, belletje, pootstapjes, kraai, geblaf, mist, wind, uil, hartslag en tikken
bij het aftellen. Echte opnames klinken beter: zet mp3-bestanden in een map
`audio/` en vul de paden in bij `geluiden` in `js/data.js`, bv.
`hoorn: 'audio/hoorn.mp3'`. Vrije opnames vind je op Freesound of Wikimedia
Commons.

Een iPad speelt pas geluid na een eerste aanraking; de wind en de uil beginnen
dus pas wanneer iemand het scherm aanraakt.

## Na te kijken in de zaal

Sommige sporen gaan over details die ik uit beschrijvingen en foto's haalde.
Kijk die na aan de echte schilderijen (in `data.js` staan ze met `nakijken: true`):

- De Vos: zie je bergen in de verte in het landschap (links)?
- De Vos: ligt er een bijl bij de pauw en de everkop (rechts)?
- De Jager: zijn er in het everzwijn-schilderij (midden) echt geen mensen?
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
