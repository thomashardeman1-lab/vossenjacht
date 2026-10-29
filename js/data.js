/*
 * De Vossenjacht — inhoud
 * -----------------------
 * Alle teksten en sporen staan hier. Pas dit bestand aan om sporen te
 * wijzigen; de spellogica (game.js) hoeft dan niet te veranderen.
 *
 * Opstelling: de spelers staan tegenover elkaar aan de sokkel.
 *   De Vos   kijkt naar kant 3: links landschap met jachtbuit, midden stilleven
 *            met uil, rechts jachtbuit met pauw en everkop.
 *            De grote muur (vossenjacht) ligt links, de onderste muur rechts.
 *   De Jager kijkt naar kant 1: links boeren op weg naar de markt, midden jong
 *            everzwijn met jachthond, rechts roerdomp en eenden met honden.
 *            De grote muur ligt rechts, de onderste muur links.
 *   De onderste muur (tegenover de vossenjacht), van links naar rechts:
 *            Het doden van het hert · Samenkomst voor de jacht.
 * De vossenjacht zelf wordt nooit op het scherm getoond.
 *
 * Spoor op de muur voor je:   { tekst, antwoord: 'links' | 'midden' | 'rechts' }
 * Spoor op de onderste muur:  { tekst, antwoord: 'links' | 'rechts' }
 * Elk spel trekt willekeurig `aantalSporen` sporen per speler, waarvan
 * `onderSporen` op de onderste muur.
 * Sporen met `nakijken: true` gaan over details die nog in de zaal moeten
 * worden bevestigd.
 */
window.MSK = {
  aantalSporen: 5,
  onderSporen: 1,
  reeksVoorStreek: 3,   // zoveel juiste antwoorden op rij geven een streek

  rollen: {
    vos: {
      naam: 'De Vos', icoon: '🦊', kleur: '#f59e0b',
      muurNaam: 'kant 3',
      focusKant: 'links',   // kant van de grote muur
      onderKant: 'rechts',  // kant van de onderste muur
      intro: 'Je bent op de vlucht. Zoek eten en schuilplaatsen in de schilderijen achter de Jager, en wees sneller dan hij.',
      winst: 'De vos ontsnapt!',
      streek: { knop: 'Stuur mist naar de Jager', melding: 'De Vos hult je in mist!' }
    },
    jager: {
      naam: 'De Jager', icoon: '🏹', kleur: '#34d399',
      muurNaam: 'kant 1',
      focusKant: 'rechts',
      onderKant: 'links',
      intro: 'Je hond heeft iets geroken. Volg de sporen in de schilderijen achter de Vos en vang hem voor hij ontsnapt.',
      winst: 'De vos is gevangen!',
      streek: { knop: 'Laat de honden los op de Vos', melding: 'De honden van de Jager blaffen!' }
    }
  },

  sporen: {
    vos: [
      { tekst: 'Je maag knort… Waar hangt een dode haas in een boom?', antwoord: 'links' },
      { tekst: 'Psst, iemand houdt de wacht. Zoek de enige vogel die nog leeft.', antwoord: 'midden' },
      { tekst: 'Zoek een vogelkooi. Gelukkig zit jij er niet in.', antwoord: 'midden' },
      { tekst: 'Waar ligt de kop van een everzwijn? Daar wil jij níet eindigen.', antwoord: 'rechts' },
      { tekst: 'Waar zie je bergen in de verte? Daar kan je naartoe vluchten.', antwoord: 'links', nakijken: true },
      { tekst: 'Zoek de dronken wijngod op een vaas. Hij is te zat om je te verraden.', antwoord: 'midden' },
      { tekst: 'Iemand heeft een bijl laten liggen… Waar?', antwoord: 'rechts', nakijken: true },
      { tekst: 'Waar ligt een grote blauwe vogel op de grond?', antwoord: 'links' },
      { tekst: 'Een pauw met een lange staart… Waar ligt hij?', antwoord: 'rechts' },
      { tekst: 'Ergens staat een geheime handtekening met het jaartal 1646. Waar?', antwoord: 'rechts' }
    ],
    jager: [
      { tekst: 'Je hond snuift! Waar heeft een windhond al beet?', antwoord: 'midden' },
      { tekst: 'Waar vliegen eenden op van schrik?', antwoord: 'rechts' },
      { tekst: 'Waar dragen mensen een hert en een zwaan mee?', antwoord: 'links' },
      { tekst: 'Er komt onweer aan… Waar zie je donkere wolken boven het water?', antwoord: 'rechts' },
      { tekst: 'Waar draagt iemand een mand vol fruit op het hoofd?', antwoord: 'links' },
      { tekst: 'Waar heeft een jong everzwijn flinke pech?', antwoord: 'midden' },
      { tekst: 'Zoek de vogel met de lange snavel die zijn vleugels spreidt tegen de honden.', antwoord: 'rechts' },
      { tekst: 'Waar zie je de meeste mensen?', antwoord: 'links' },
      { tekst: 'Waar zit iemand op weg naar de markt?', antwoord: 'links' },
      { tekst: 'Waar zie je enkel dieren en geen enkele mens?', antwoord: 'midden', nakijken: true }
    ]
  },

  // Sporen op de onderste muur, tegenover de vossenjacht.
  // links = Het doden van het hert, rechts = Samenkomst voor de jacht
  onder: {
    vos: [
      { tekst: 'Een hert is in het water gesprongen om aan de honden te ontsnappen. Waar?', antwoord: 'links' },
      { tekst: 'Waar springt een ruiter over een brug?', antwoord: 'links', nakijken: true },
      { tekst: 'Waar rijdt een dame in een rode jurk op een wit paard?', antwoord: 'rechts' },
      { tekst: 'Waar staan dikke stenen zuilen? Daarachter kan jij je verstoppen.', antwoord: 'rechts' }
    ],
    jager: [
      { tekst: 'Waar heeft de meute het hert al te pakken?', antwoord: 'links' },
      { tekst: 'Waar verzamelt het gezelschap zich voor de jacht begint?', antwoord: 'rechts' },
      { tekst: 'Waar staat een grote stenen vaas op een sokkel?', antwoord: 'rechts' },
      { tekst: 'Waar stroomt er water?', antwoord: 'links' }
    ]
  },

  // Laatste spoor op de grote muur (verklapt de vossenjacht niet).
  finale: {
    tekst: 'Draai je om naar de grote muur. Hangt het ronde medaillon boven of onder de stier?',
    opties: [{ waarde: 'boven', label: 'Boven', pijl: '↑' }, { waarde: 'onder', label: 'Onder', pijl: '↓' }],
    juist: 'boven'
  },

  // Wat de winnaar te zien krijgt: de opdracht om de NFC-penning te nemen.
  prijs: {
    titel: 'Neem je penning',
    tekst: 'Houd je NFC-penning tegen de lezer aan de grote muur. Wat er dan gebeurt, is enkel voor jou.'
  },

  /*
   * Echte geluidsopnames (optioneel). Zet een pad om de nagemaakte versie te
   * vervangen, bv. hoorn: 'audio/hoorn.mp3'.
   * Namen: hoorn, hallali, verlies, kort, juist, fout, blaf, mist
   */
  geluiden: {}
};
