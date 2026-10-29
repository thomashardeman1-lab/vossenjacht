/*
 * De Vossenjacht — spellogica
 *
 * Elke iPad opent de pagina met zijn rol in de URL:
 *   index.html?rol=vos     (kijkt naar kant 3)
 *   index.html?rol=jager   (kijkt naar kant 1)
 * Zonder ?rol= kies je de rol op het scherm.
 *
 * Verloop: start → trompet → aftellen → 5 sporen → draai je om →
 * laatste spoor op de grote muur → winst of verlies.
 * De meeste sporen zitten op de muur achter je tegenspeler (links/midden/
 * rechts); minstens één spoor zit op de onderste muur, tegenover de
 * vossenjacht (links/rechts).
 * Wie een reeks juiste antwoorden op rij heeft (zie reeksVoorStreek in
 * data.js), mag een streek uithalen: de Vos stuurt mist, de Jager laat de
 * honden blaffen.
 * De winnaar krijgt de opdracht de NFC-penning te nemen. De vossenjacht
 * zelf wordt nooit op het scherm getoond.
 *
 * Synchronisatie: in dit prototype praten de twee schermen via
 * BroadcastChannel (werkt tussen tabbladen of in duo.html). Voor twee echte
 * iPads vervang je enkel de functie `verbind()` door een realtime dienst.
 */
(() => {
  'use strict';

  const D = window.MSK;
  const G = window.Geluid;
  const app = document.getElementById('app');
  const params = new URLSearchParams(location.search);

  const STRAF_MS = 3000;
  const STREEK_MS = 3500;
  const INACTIEF_MS = 120000;
  const RESET_NA_EINDE_MS = 45000;
  const PLAATSEN = [
    { waarde: 'links', label: 'Links', pijl: '←' },
    { waarde: 'midden', label: 'Midden', pijl: '↑' },
    { waarde: 'rechts', label: 'Rechts', pijl: '→' }
  ];
  const PLAATSEN_ONDER = [PLAATSEN[0], PLAATSEN[2]];

  const ander = rol => (rol === 'vos' ? 'jager' : 'vos');
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const schud = lijst => lijst.map(v => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map(v => v[1]);
  const streekIcoon = rol => (rol === 'vos' ? '🌫️' : '🐕');

  // Sporen voor één spel: enkele op de muur voor je, minstens één op de onderste muur.
  function kiesSporen(rol) {
    const onder = schud(D.onder[rol]).slice(0, D.onderSporen).map(s => Object.assign({ muur: 'onder' }, s));
    const voor = schud(D.sporen[rol]).slice(0, D.aantalSporen - onder.length);
    const alles = schud(voor.concat(onder));
    // niet meteen met de onderste muur beginnen: eerst warm worden
    if (alles[0].muur === 'onder' && alles.length > 1) [alles[0], alles[1]] = [alles[1], alles[0]];
    return alles;
  }

  /* ---------- verbinding tussen de twee schermen ---------- */
  function verbind(onBericht) {
    if (!('BroadcastChannel' in window)) return () => {};
    const kanaal = new BroadcastChannel('msk-vossenjacht');
    kanaal.onmessage = e => onBericht(e.data);
    return bericht => kanaal.postMessage(bericht);
  }
  const zend = verbind(ontvang);

  /* ---------- toestand ---------- */
  let S = null;
  let timers = [];
  const wacht = (fn, ms) => timers.push(setTimeout(fn, ms));
  const stopTimers = () => { timers.forEach(clearTimeout); timers = []; };

  function nieuweToestand(rol) {
    return {
      rol,
      scherm: rol ? 'start' : 'kies',
      klaar: false,
      partnerKlaar: false,
      partnerAanwezig: S ? S.partnerAanwezig : false,
      solo: false,
      sporen: rol ? kiesSporen(rol) : [],
      i: 0,
      voortgang: { vos: 0, jager: 0 },
      reeks: 0,             // juiste antwoorden op rij
      streekKlaar: false,   // een streek verdiend die nog niet verstuurd is
      straf: false,
      einde: null
    };
  }

  function reset(rol = S && S.rol, meld = false) {
    stopTimers();
    G.stopHartslag();
    S = nieuweToestand(rol);
    if (meld) zend({ type: 'reset' });
    if (rol) zend({ type: 'hallo', rol });
    toon();
    G.startSfeer();
  }

  /* ---------- berichten van het andere scherm ---------- */
  function ontvang(m) {
    if (!S || !S.rol || m.rol === S.rol) return;
    switch (m.type) {
      case 'hallo':
        S.partnerAanwezig = true;
        if (m.antwoord !== true) zend({ type: 'hallo', rol: S.rol, antwoord: true });
        if (S.klaar) zend({ type: 'klaar', rol: S.rol });
        if (S.scherm === 'start') toon();
        break;
      case 'klaar':
        S.partnerAanwezig = true;
        S.partnerKlaar = true;
        if (S.scherm === 'start') { S.klaar ? begin() : toon(); }
        break;
      case 'voortgang':
        S.voortgang[m.rol] = m.n;
        updateKop();
        if (!['einde', 'start', 'kies'].includes(S.scherm)) {
          G.ver();
          if (m.n === D.aantalSporen) {
            melding(`${D.rollen[m.rol].naam} is al bij het laatste spoor!`);
            G.startHartslag();
          }
        }
        break;
      case 'streek':
        if (['vraag', 'gevonden', 'draai'].includes(S.scherm)) ondergaStreek(m.rol);
        break;
      case 'winst':
        if (S.scherm !== 'einde') einde(m.rol);
        break;
      case 'reset':
        reset(S.rol);
        break;
    }
  }

  /* ---------- bouwstenen ---------- */
  function toon() {
    const f = {
      kies: schermKies, start: schermStart, hoorn: schermHoorn, aftellen: schermAftellen,
      vraag: schermVraag, gevonden: schermGevonden, draai: schermDraai, einde: schermEinde
    }[S.scherm];
    app.innerHTML = `<div class="ticket">${f()}</div>`;
    document.body.dataset.rol = S.rol || '';
    app.dataset.scherm = S.scherm;
    const scherm = app.querySelector('.scherm');
    if (scherm) requestAnimationFrame(() => scherm.classList.add('in'));
  }

  // Beelden en kleine tekeningen
  const LOGO = '<img class="logo" src="img/logo.png" alt="Foxhunt">';
  const gravure = rol => `<div class="vak"><img class="gravure" src="img/${rol}.png" alt=""></div>`;
  const logoVak = (klas = '') => `<div class="vak ${klas}">${LOGO}</div>`;
  const POOT = '<svg viewBox="0 0 40 40" aria-hidden="true"><ellipse cx="20" cy="27" rx="9" ry="8"/><ellipse cx="8" cy="16" rx="4" ry="5"/><ellipse cx="16" cy="9" rx="4" ry="5"/><ellipse cx="24" cy="9" rx="4" ry="5"/><ellipse cx="32" cy="16" rx="4" ry="5"/></svg>';
  const naamGroot = rol => (rol === 'vos' ? 'Vos' : 'Jager');

  // Volgnummer zoals op de tickets (per iPad bijgehouden)
  function volgnummer(verhoog) {
    let n = 1;
    try {
      n = (+localStorage.getItem('foxhunt-nummer') || 0) + (verhoog ? 1 : 0) || 1;
      if (verhoog) localStorage.setItem('foxhunt-nummer', n);
    } catch (e) { /* geen opslag: dan blijft het 001 */ }
    return n;
  }
  const nummer = n => `<div class="nummer">N°${String(n).padStart(3, '0')}<small>MSK</small></div>`;

  // Voortgang: de Vos laat pootafdrukken achter, de Jager bolletjes.
  const spoor = () => {
    const n = D.aantalSporen + 1;
    const rij = rol => `<div class="voortgang ${rol} ${rol === S.rol ? 'eigen' : ''}">
        <span class="wie">${rol === S.rol ? 'Jij' : naamGroot(rol)}</span>
        ${Array.from({ length: n }, (_, k) => {
          const klas = `${k < S.voortgang[rol] ? 'gezet' : ''} ${k === n - 1 ? 'laatste' : ''}`;
          if (k === n - 1) return `<i class="${klas}">★</i>`;
          return rol === 'vos' ? `<i class="poot ${klas}">${POOT}</i>` : `<i class="bol ${klas}"></i>`;
        }).join('')}
      </div>`;
    return `<div class="spoor">${rij(S.rol)}${S.solo ? '' : rij(ander(S.rol))}</div>`;
  };

  // Reeksmeter: hoeveel juist op rij, en hoeveel nog nodig voor een streek
  const reeksMeter = () => {
    if (S.solo) return '';
    const n = D.reeksVoorStreek;
    const vol = S.streekKlaar ? n : S.reeks;
    return `<div class="reeks ${S.streekKlaar ? 'vol' : ''}">
      ${Array.from({ length: n }, (_, k) => `<i class="${k < vol ? 'aan' : ''}"></i>`).join('')}
      <span>${S.rol === 'vos' ? 'Mist' : 'Honden'}</span></div>`;
  };

  const kop = () => `<header class="kop"><div class="badge-klein">${LOGO}</div>${spoor()}
    <div class="kop-rechts">${reeksMeter()}<span class="kop-rol">${naamGroot(S.rol)}</span></div></header>`;

  function updateKop() {
    const el = app.querySelector('.kop');
    if (el) el.outerHTML = kop();
  }

  /* ---------- schermen ---------- */
  // Twee tickets naast elkaar: kies welke kant van de sokkel dit scherm is.
  function schermKies() {
    return `<section class="scherm kies">
      ${['vos', 'jager'].map(r => `
        <button class="rolticket ${r}" data-act="kies" data-rol="${r}">
          <div class="badge-groot">${LOGO}</div>
          <span class="rolnaam">${naamGroot(r)}</span>
          ${gravure(r)}
          <small>kijkt naar ${D.rollen[r].muurNaam}</small>
        </button>`).join('')}
    </section>`;
  }

  function schermStart() {
    const r = D.rollen[S.rol], tegen = D.rollen[ander(S.rol)];
    let status;
    if (S.klaar && !S.partnerKlaar) status = `Wachten tot ${tegen.naam.toLowerCase()} klaar is…`;
    else if (!S.klaar && S.partnerKlaar) status = `${tegen.naam} staat klaar. Jij ook?`;
    else status = S.partnerAanwezig ? `${tegen.naam} staat aan de overkant.` : 'Zoek je tegenspeler aan de overkant van de sokkel.';

    return `<section class="scherm start">
      <div class="start-beeld">
        <div class="badge-groot">${LOGO}</div>
        <h1 class="rolnaam">${naamGroot(S.rol)}</h1>
        ${gravure(S.rol)}
      </div>
      <div class="start-tekst">
      <p class="lead">${esc(r.intro)}</p>
      <ol class="regels">
        <li><span>I</span>Kijk over de sokkel naar de muur achter je tegenspeler.</li>
        <li><span>II</span>Volg ${D.aantalSporen} sporen. Een fout spoor kost je ${STRAF_MS / 1000} tellen.</li>
        <li><span>III</span>${D.reeksVoorStreek} keer juist op rij? Dan ${S.rol === 'vos' ? 'hul je de Jager in mist' : 'laat je de honden los op de Vos'}.</li>
        <li><span>IV</span>Wie het laatste spoor eerst vindt, wint de penning.</li>
      </ol>
      <button class="knop" data-act="klaar" ${S.klaar ? 'disabled' : ''}>${S.klaar ? 'Klaar' : 'Ik ben klaar'}</button>
      <p class="status">${status}</p>
      <button class="link" data-act="solo">Alleen oefenen</button>
      ${nummer(volgnummer(false) + 1)}
      </div>
    </section>`;
  }

  function schermHoorn() {
    return `<section class="scherm midden hoorn">
      <div class="vak hoorn-icoon"><span class="hoornbeeld" role="img" aria-label="Jachthoorn"></span></div>
      <h1 class="titel">De jacht begint</h1>
    </section>`;
  }

  function schermAftellen() {
    return `<section class="scherm midden aftellen"><div class="teller pop" id="teller">3</div></section>`;
  }

  const huidig = () => (S.i < S.sporen.length ? S.sporen[S.i] : null);

  function schermVraag() {
    const q = huidig();
    const finale = !q;
    const onder = q && q.muur === 'onder';
    const r = D.rollen[S.rol];
    const tekst = finale ? D.finale.tekst : q.tekst;
    const knoppen = finale ? D.finale.opties : onder ? PLAATSEN_ONDER : PLAATSEN;
    const draai = onder
      ? `<div class="draaiwijzer ${r.onderKant}">${r.onderKant === 'links' ? '← ' : ''}Kijk naar de muur aan je ${r.onderKant === 'links' ? 'linker' : 'rechter'}kant${r.onderKant === 'rechts' ? ' →' : ''}</div>`
      : '';
    return `<section class="scherm vraag ${finale ? 'finale' : ''} ${onder ? 'onder' : ''}">${kop()}
      <main class="blad">
        <p class="spoornr">${finale ? '★ Het laatste spoor' : `Spoor ${S.i + 1} van ${D.aantalSporen}`}</p>
        ${draai}
        <h2 class="vraagtekst">${esc(tekst)}</h2>
        <div class="muurknoppen ${knoppen.length === 2 ? 'twee' : ''}">
          ${knoppen.map(k => `<button class="plaats" data-act="antwoord" data-waarde="${k.waarde}">
            <span class="pijltje">${k.pijl}</span><span>${k.label}</span></button>`).join('')}
        </div>
      </main>
      <div class="straf ${S.straf ? 'aan' : ''}" id="straf"><div><strong>Mis!</strong><p>Fout spoor… je reeks is weg.</p><div class="balk"><span></span></div></div></div>
    </section>`;
  }

  // Kort scherm na een juist antwoord. Met een volle reeks: een streek uithalen.
  function schermGevonden() {
    const r = D.rollen[S.rol];
    let onder;
    if (S.streekKlaar) {
      onder = `<p class="vuur">${D.reeksVoorStreek} op rij!</p>
        <button class="knop streek" data-act="streek">${esc(r.streek.knop)}</button>`;
    } else if (!S.solo && S.reeks > 0 && S.i < D.aantalSporen) {
      onder = `<p class="ondertitel">${S.reeks} op rij. Nog ${D.reeksVoorStreek - S.reeks} voor ${S.rol === 'vos' ? 'de mist' : 'de honden'}!</p>`;
    } else {
      onder = `<p class="ondertitel">${S.i < D.aantalSporen ? 'Op naar het volgende spoor…' : 'Alle sporen gevonden!'}</p>`;
    }
    return `<section class="scherm gevonden">${kop()}
      <main class="midden" style="flex:1;display:flex;flex-direction:column">
        <div class="vinkje">${S.rol === 'vos' ? POOT : '<span class="bolgroot"></span>'}</div>
        <h2 class="titel">Gevonden!</h2>
        ${onder}
      </main></section>`;
  }

  function schermDraai() {
    const r = D.rollen[S.rol];
    return `<section class="scherm midden draai">
      <div class="pijl ${r.focusKant}">${r.focusKant === 'links' ? '⟵' : '⟶'}</div>
      <h1 class="titel">Draai je om!</h1>
      <p class="ondertitel">Het laatste spoor zit op de grote muur, aan je ${r.focusKant === 'links' ? 'linker' : 'rechter'}kant.</p>
    </section>`;
  }

  function schermEinde() {
    const gewonnen = S.einde === S.rol;
    const winnaar = D.rollen[S.einde];
    if (gewonnen) {
      return `<section class="scherm midden einde winst">
        ${logoVak('penning')}
        <p class="ondertitel">${esc(winnaar.winst)}</p>
        <h1 class="titel">Jij wint de penning!</h1>
        <div class="opdracht"><strong>${esc(D.prijs.titel)}</strong><p>${esc(D.prijs.tekst)}</p></div>
        <button class="link" data-act="opnieuw">Nieuwe jacht</button>
        ${nummer(volgnummer(false))}
      </section>`;
    }
    return `<section class="scherm midden einde verlies">
      ${gravure(S.rol)}
      <p class="ondertitel">${esc(winnaar.winst)}</p>
      <h1 class="titel">Net niet…</h1>
      <p class="lead">${winnaar.naam} was je te snel af en gaat met de penning lopen.</p>
      <button class="knop" data-act="opnieuw">Nog een jacht</button>
      ${nummer(volgnummer(false))}
    </section>`;
  }

  /* ---------- spelverloop ---------- */
  function begin() {
    volgnummer(true);
    G.stopSfeer();
    S.scherm = 'hoorn';
    toon();
    G.roep(() => {
      if (S.scherm !== 'hoorn') return;
      S.scherm = 'aftellen';
      toon();
      G.trom(false);
      let n = 3;
      const tel = () => {
        n -= 1;
        const el = document.getElementById('teller');
        if (n > 0) {
          if (el) { el.textContent = n; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
          G.trom(false);
          wacht(tel, 800);
        } else {
          G.trom(true);
          G.signaal();
          S.scherm = 'vraag';
          toon();
        }
      };
      wacht(tel, 800);
    });
  }

  function antwoord(knop) {
    const q = huidig();
    const juist = q ? q.antwoord : D.finale.juist;
    if (knop.dataset.waarde !== juist) return fout(knop);

    if (!q) { // laatste spoor gevonden: gewonnen
      zend({ type: 'winst', rol: S.rol });
      einde(S.rol);
      return;
    }
    S.i += 1;
    S.voortgang[S.rol] = S.i;
    zend({ type: 'voortgang', rol: S.rol, n: S.i });

    // reeks bijhouden; een volle reeks levert een streek op
    S.reeks += 1;
    const verdiend = !S.solo && S.reeks >= D.reeksVoorStreek;
    if (verdiend) { S.streekKlaar = true; S.reeks = 0; }

    G.ting();
    S.rol === 'vos' ? G.stappen() : G.galop();
    if (verdiend) setTimeout(G.jubel, 350);

    S.scherm = 'gevonden';
    toon();
    // de streek wordt ook verstuurd als niemand op de knop tikt
    wacht(() => { if (S.streekKlaar) stuurStreek(); verder(); }, verdiend ? 2800 : 1400);
  }

  function fout(knop) {
    knop.classList.add('fout');
    G.kraai();
    S.reeks = 0;
    S.straf = true;
    updateKop();
    const el = document.getElementById('straf');
    if (el) el.classList.add('aan');
    wacht(() => {
      S.straf = false;
      const e = document.getElementById('straf');
      if (e) e.classList.remove('aan');
      knop.classList.remove('fout');
    }, STRAF_MS);
  }

  function stuurStreek() {
    if (!S.streekKlaar) return;
    S.streekKlaar = false;
    zend({ type: 'streek', rol: S.rol });
    S.rol === 'vos' ? G.mist() : G.blaf(true);
  }

  // De streek van de tegenspeler: mist (van de vos) of geblaf (van de jager)
  function ondergaStreek(vanRol) {
    const r = D.rollen[vanRol];
    const laag = document.createElement('div');
    laag.className = `streeklaag ${vanRol === 'vos' ? 'mistlaag' : 'geblaf'}`;
    laag.innerHTML = `<div class="streektekst">${esc(r.streek.melding)}</div>`;
    document.body.appendChild(laag);
    if (vanRol === 'vos') G.mist();
    else { G.blaf(); document.body.classList.add('schud'); }
    setTimeout(() => { laag.remove(); document.body.classList.remove('schud'); }, STREEK_MS);
  }

  function verder() {
    if (S.i >= S.sporen.length) {
      S.scherm = 'draai';
      toon();
      G.zwiep();
      G.kort();
      wacht(() => { S.scherm = 'vraag'; toon(); }, 3200);
    } else {
      S.scherm = 'vraag';
      toon();
      if (huidig() && huidig().muur === 'onder') G.zwiep();
    }
  }

  function einde(winnaar) {
    stopTimers();
    G.stopHartslag();
    S.einde = winnaar;
    S.scherm = 'einde';
    toon();
    if (winnaar === S.rol) {
      G.hallali();
      setTimeout(G.jubel, 1800);
      vonken();
    } else {
      G.droevig();
      setTimeout(() => (winnaar === 'vos' ? G.vosroep() : G.blaf(true)), 2200);
    }
    wacht(() => reset(S.rol), RESET_NA_EINDE_MS);
  }

  // gouden vonken voor de winnaar
  function vonken() {
    const laag = document.createElement('div');
    laag.className = 'vonken';
    for (let i = 0; i < 60; i++) {
      const v = document.createElement('i');
      v.style.left = Math.random() * 100 + '%';
      v.style.setProperty('--x', (Math.random() * 160 - 80) + 'px');
      v.style.animationDelay = Math.random() * 1.2 + 's';
      v.style.animationDuration = 2 + Math.random() * 2 + 's';
      laag.appendChild(v);
    }
    document.body.appendChild(laag);
    setTimeout(() => laag.remove(), 5000);
  }

  function melding(tekst) {
    const m = document.createElement('div');
    m.className = 'melding';
    m.textContent = tekst;
    document.body.appendChild(m);
    setTimeout(() => m.remove(), 4000);
  }

  /* ---------- invoer ---------- */
  app.addEventListener('click', e => {
    const b = e.target.closest('[data-act]');
    if (!b || S.straf) return;
    const act = b.dataset.act;
    if (act !== 'antwoord') G.klik();
    if (act === 'kies') {
      history.replaceState(null, '', `?rol=${b.dataset.rol}`);
      reset(b.dataset.rol);
    } else if (act === 'klaar') {
      S.klaar = true;
      S.rol === 'vos' ? G.vosroep() : G.jank();
      zend({ type: 'klaar', rol: S.rol });
      S.partnerKlaar ? begin() : toon();
    } else if (act === 'solo') {
      S.solo = true;
      begin();
    } else if (act === 'antwoord') {
      antwoord(b);
    } else if (act === 'streek') {
      stuurStreek();
      b.disabled = true;
      b.textContent = 'Verstuurd!';
    } else if (act === 'opnieuw') {
      reset(S.rol, true);
    }
  });

  // Geluid mag pas na een eerste aanraking (iPad); dan start ook de sfeer.
  let inactief;
  const port = () => {
    G.ontgrendel();
    if (S && ['start', 'kies'].includes(S.scherm)) G.startSfeer();
    clearTimeout(inactief);
    inactief = setTimeout(() => {
      if (S && !['start', 'kies'].includes(S.scherm)) reset(S.rol, true);
    }, INACTIEF_MS);
  };
  ['pointerdown', 'keydown'].forEach(ev => document.addEventListener(ev, port, { passive: true, capture: true }));

  const startRol = ['vos', 'jager'].includes(params.get('rol')) ? params.get('rol') : null;
  reset(startRol);
})();
