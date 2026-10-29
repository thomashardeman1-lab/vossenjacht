/*
 * De Digitale Vossenjacht — inhoud
 * --------------------------------
 * Alle teksten, werken en vragen staan hier. Pas dit bestand aan om
 * vragen te wijzigen; de spellogica (game.js) hoeft dan niet te veranderen.
 *
 * iiif = beeldnummer op de MSK-beeldserver (imagehub.mskgent.be).
 *        null = nog geen beeld gevonden (er wordt dan een lege lijst getoond).
 * b / h = breedte / hoogte in cm, gebruikt om de lijstjes op de muurschets
 *         in de juiste verhouding te tekenen.
 *
 * Opstelling (zie plattegrond): de spelers staan tegenover elkaar aan de
 * sokkel (13). De Vos kijkt naar kant 3, de Jager naar kant 1.
 * De bovenmuur (Paul de Vos) is de finale.
 */
window.MSK = {
  werken: {
    vossenjacht: { titel: 'De vossenjacht', kunstenaar: 'Paul de Vos', inv: '1902-B', iiif: 327, b: 220, h: 157 },
    stier:       { titel: 'Stier door honden aangevallen', kunstenaar: 'Paul de Vos', inv: '1940-B', iiif: null },
    medaillon:   { titel: 'Medaillon met symbolische voorstelling van de jacht', kunstenaar: 'Laurent van der Meulen', iiif: null },

    landschap:   { titel: 'Landschap met jachtbuit', kunstenaar: 'Paul de Vos', inv: 'S-48', iiif: 6349, b: 177, h: 110.5 },
    uil:         { titel: 'Stilleven met uil en jachtbuit', kunstenaar: 'Peeter Boel', inv: '1907-A', iiif: 445, b: 93, h: 68 },
    pauw:        { titel: 'Jachtbuit met dode pauw en everkop', kunstenaar: 'Joannes Fijt, 1646', inv: '1907-F', iiif: 450, b: 126.5, h: 145 },

    markt:       { titel: 'Boeren op weg naar de markt', kunstenaar: 'Jan Boeckhorst en Frans Snijders', inv: '', iiif: null, b: 230, h: 185 }, // afmetingen geschat
    everzwijn:   { titel: 'Jong everzwijn gegrepen door een jachthond', kunstenaar: 'Frans Snijders, ca. 1620', inv: '1920-L', iiif: 850, b: 131.5, h: 102.5 },
    roerdomp:    { titel: 'Roerdomp en eenden door honden verrast', kunstenaar: 'Joannes Fijt', inv: '1904-E', iiif: 373, b: 172, h: 138 },

    doden:       { titel: 'Het doden van het hert', kunstenaar: 'Petrus Johannes van Reysschoot, 1743', inv: '1974-F', iiif: 3047 },
    samenkomst:  { titel: 'Samenkomst voor de jacht', kunstenaar: 'Petrus Johannes van Reysschoot, ca. 1743', inv: '1975-A', iiif: 3069 }
  },

  rollen: {
    vos: {
      naam: 'De Vos', icoon: '🦊', kleur: '#f59e0b',
      // werken die deze speler ziet, van links naar rechts
      muur: ['landschap', 'uil', 'pauw'],
      muurNaam: 'kant 3',
      // aan welke kant de bovenmuur (finale) ligt voor deze speler
      focusKant: 'links',
      intro: 'Spoor de details op in de drie schilderijen achter de Jager. Ben jij sneller, dan ontsnap je.'
    },
    jager: {
      naam: 'De Jager', icoon: '🏹', kleur: '#34d399',
      muur: ['markt', 'everzwijn', 'roerdomp'],
      muurNaam: 'kant 1',
      focusKant: 'rechts',
      intro: 'Lees de sporen in de drie schilderijen achter de Vos. Ben jij sneller, dan is de vos gevangen.'
    }
  },

  /*
   * Vraagtypes:
   *  - 'muur'  : tik op het juiste schilderij in de muurschets. antwoord = sleutel van het werk.
   *  - 'keuze' : meerkeuze. juist = de exacte tekst van het juiste antwoord.
   * werk = welk schilderij getoond wordt bij "Gevonden!".
   */
  vragen: {
    vos: [
      {
        type: 'muur', antwoord: 'landschap', werk: 'landschap',
        tekst: 'Zoek het werk waarin een dode haas in een boom hangt en een blauwe reiger op de grond ligt.',
        weetje: 'Het MSK schrijft dit werk vandaag toe aan Paul de Vos. Oudere catalogi dachten nog aan Peeter Boel.'
      },
      {
        type: 'muur', antwoord: 'uil', werk: 'uil',
        tekst: 'Zoek het werk met één levende vogel tussen de dode jachtbuit.',
        weetje: 'De uil is vastgeketend aan een vogelkooi: hij is lokaas. Kleine vogels die hem kwamen pesten, bleven plakken aan een lijmstok.'
      },
      {
        type: 'muur', antwoord: 'pauw', werk: 'pauw',
        tekst: 'Zoek het werk met een everkop en een dode pauw. Ergens staat de handtekening van de schilder, met het jaartal 1646.',
        weetje: 'Joannes Fijt signeerde links in het midden. Hij was de leermeester van Peeter Boel.'
      },
      {
        type: 'keuze', werk: 'uil',
        tekst: 'Kijk naar het stilleven met de uil. Naast de kooi staat een zware vaas. Wie staat erop afgebeeld?',
        opties: ['Een dronken Bacchus', 'Jachtgodin Diana', 'Sint-Hubertus', 'Een zeemeermin'],
        juist: 'Een dronken Bacchus',
        weetje: 'De dronken wijngod is een waarschuwing: wie zich overgeeft aan zijn lusten, verliest zijn vrijheid. Net als de vogels in de val.'
      },
      {
        type: 'keuze', werk: 'landschap',
        tekst: 'Hoeveel verschillende vogelsoorten verstopte de schilder in het landschap met jachtbuit?',
        opties: ['Ongeveer 5', 'Ongeveer 10', 'Meer dan 20'],
        juist: 'Meer dan 20',
        weetje: 'Patrijzen, houtsnippen, een eend, spechten, vinken, koolmezen en een putter: allemaal herkenbaar geschilderd.'
      }
    ],
    jager: [
      {
        type: 'muur', antwoord: 'everzwijn', werk: 'everzwijn',
        tekst: 'Zoek het werk waarin een windhond een jong everzwijn grijpt.',
        weetje: 'Frans Snijders zoomt hier uitzonderlijk dicht in op de dieren. Geen ander jachttafereel van hem doet dat zo.'
      },
      {
        type: 'muur', antwoord: 'roerdomp', werk: 'roerdomp',
        tekst: 'Zoek het werk waarin eenden en een roerdomp hun vleugels spreiden tegen aanstormende honden.',
        weetje: 'Joannes Fijt is bekend om zijn dik opgebrachte verf: je voelt de veren en de vacht bijna.'
      },
      {
        type: 'muur', antwoord: 'markt', werk: 'markt',
        tekst: 'Zoek het werk waarin boeren een hert, een zwaan en manden vol fruit meedragen.',
        weetje: 'Twee schilders werkten hier samen: Jan Boeckhorst voor de mensen, Frans Snijders voor de dieren en het fruit.'
      },
      {
        type: 'keuze', werk: 'roerdomp',
        tekst: 'Kijk naar de roerdomp en de eenden. Van welke kant stormen de honden aan?',
        opties: ['Van links', 'Van rechts', 'Van boven'],
        juist: 'Van links',
        weetje: 'Door alle honden aan één kant te zetten, krijgt het schilderij een scheve, onrustige opbouw: alles lijkt te bewegen.'
      },
      {
        type: 'keuze', werk: 'markt',
        tekst: 'Kijk naar de boeren op weg naar de markt. Wat draagt de vrouw rechts op haar hoofd?',
        opties: ['Een mand vol fruit', 'Een kruik water', 'Een dode haas'],
        juist: 'Een mand vol fruit',
        weetje: 'Zulke marktscènes toonden de overvloed van het Vlaamse platteland, en het talent van de schilders om alles levensecht te maken.'
      }
    ]
  },

  /*
   * Laatste spoor: de speler draait zich naar de bovenmuur.
   * De vossenjacht zelf hangt achter een gordijn en blijft geheim,
   * dus het laatste spoor gaat over het medaillon ernaast.
   */
  finale: {
    type: 'keuze',
    tekst: 'Naast het gordijn hangt een rond medaillon vol jachtbuit. Waaruit is het gemaakt?',
    opties: ['Gesneden hout', 'Wit marmer', 'Gegoten brons', 'Gips'],
    juist: 'Gesneden hout' // nog na te kijken aan het echte werk
  },

  // Wat de winnaar te zien krijgt.
  prijs: {
    titel: 'Neem je penning',
    tekst: 'Houd je penning tegen de lezer bij het gordijn op de grote muur. Alleen jij krijgt te zien wat erachter hangt.',
    weetje: 'Kijk goed als het gordijn opengaat: bij Paul de Vos blijven de menselijke jagers opvallend vaak buiten beeld.'
  },

  /*
   * Geluid: zet `hoorn` op een bestand (bv. 'audio/hoorn.mp3') om een echte
   * opname van een jachthoorn te gebruiken. Bij null speelt het spel een
   * nagebootste jachthoorn af.
   */
  geluid: {
    hoorn: null,
    hallali: null
  }
};
