/*
 * De Vossenjacht — spellogica
 *
 * Elke iPad opent de pagina met zijn rol in de URL:
 *   index.html?rol=vos     (kijkt naar kant 3)
 *   index.html?rol=jager   (kijkt naar kant 1)
 * Zonder ?rol= kies je de rol op het scherm.
 *
 * Verloop: start → jachthoorn → aftellen → 5 sporen (links/midden/rechts)
 * → draai je om → laatste spoor op de grote muur → winst of verlies.
 * Na elk tweede spoor stuur je een streek naar de overkant:
 * de Vos stuurt mist, de Jager laat de honden blaffen.
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
  const STREEK_MS = 3000;
  const INACTIEF_MS = 120000;
  const RESET_NA_EINDE_MS = 45000;
  const PLAATSEN = [
    { waarde: 'links', label: 'Links', pijl: '←' },
    { waarde: 'midden', label: 'Midden', pijl: '↑' },
    { waarde: 'rechts', label: 'Rechts', pijl: '→' }
  ];

  const ander = rol => (rol === 'vos' ? 'jager' : 'vos');
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const trek = (lijst, n) => lijst.map(v => [Math.random(), v]).sort((a, b) => a[0] - b[0]).slice(0, n).map(v => v[1]);
  const streekIcoon = rol => (rol === 'vos' ? '🌫️' : '🐕');

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
      sporen: rol ? trek(D.sporen[rol], D.aantalSporen) : [],
      i: 0,
      voortgang: { vos: 0, jager: 0 },
      straf: false,
      streek: -1,
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
        updateSpoor();
        if (m.n === D.aantalSporen && !['einde', 'start', 'kies'].includes(S.scherm)) {
          melding(`${D.rollen[m.rol].naam} is al bij het laatste spoor!`);
          G.startHartslag();
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
    app.innerHTML = f();
    app.dataset.rol = S.rol || '';
    app.dataset.scherm = S.scherm;
    const scherm = app.firstElementChild;
    if (scherm) requestAnimationFrame(() => scherm.classList.add('in'));
  }

  const rolBadge = rol => `<span class="rolbadge" style="--k:${D.rollen[rol].kleur}">${D.rollen[rol].icoon} ${D.rollen[rol].naam}</span>`;

  const spoor = () => {
    const n = D.aantalSporen + 1;
    const rij = rol => `<div class="pootrij ${rol === S.rol ? 'eigen' : ''}" style="--k:${D.rollen[rol].kleur}">
        <span class="wie">${D.rollen[rol].icoon}</span>
        ${Array.from({ length: n }, (_, k) => `<i class="${k < S.voortgang[rol] ? 'gezet' : ''} ${k === n - 1 ? 'laatste' : ''}">${k === n - 1 ? '★' : '🐾'}</i>`).join('')}
      </div>`;
    return `<div class="spoor">${rij(S.rol)}${S.solo ? '' : rij(ander(S.rol))}</div>`;
  };

  function updateSpoor() {
    const el = app.querySelector('.spoor');
    if (el) el.outerHTML = spoor();
  }

  const kop = () => `<header class="kop">${spoor()}${rolBadge(S.rol)}</header>`;
  const streekNu = () => !S.solo && S.i % 2 === 0 && S.i < D.aantalSporen;

  /* ---------- schermen ---------- */
  function schermKies() {
    return `<section class="scherm midden kies">
      <p class="bovenschrift">Een jacht voor twee</p>
      <h1 class="titel">De <em>Vossenjacht</em></h1>
      <p class="lead">Welke kant van de sokkel is dit scherm?</p>
      <div class="rolkeuze">
        ${['vos', 'jager'].map(r => `
          <button class="rolkaart" data-act="kies" data-rol="${r}" style="--k:${D.rollen[r].kleur}">
            <span class="groot">${D.rollen[r].icoon}</span>
            <strong>${D.rollen[r].naam}</strong>
            <small>kijkt naar ${D.rollen[r].muurNaam}</small>
          </button>`).join('')}
      </div>
    </section>`;
  }

  function schermStart() {
    const r = D.rollen[S.rol], tegen = D.rollen[ander(S.rol)];
    let status;
    if (S.klaar && !S.partnerKlaar) status = `Wachten tot ${tegen.naam.toLowerCase()} klaar is…`;
    else if (!S.klaar && S.partnerKlaar) status = `${tegen.naam} staat klaar. Jij ook?`;
    else status = S.partnerAanwezig ? `${tegen.naam} staat aan de overkant.` : 'Zoek je tegenspeler aan de overkant van de sokkel.';

    return `<section class="scherm midden start">
      <div class="rolicoon" style="--k:${r.kleur}">${r.icoon}</div>
      <p class="bovenschrift">Jij bent ${r.naam.toLowerCase()}</p>
      <h1 class="titel">De <em>Vossenjacht</em></h1>
      <p class="lead">${esc(r.intro)}</p>
      <ol class="regels">
        <li><span>🐾</span>Kijk over de sokkel naar de muur achter je tegenspeler.</li>
        <li><span>🔎</span>Volg ${D.aantalSporen} sporen. Een fout spoor kost je ${STRAF_MS / 1000} tellen.</li>
        <li><span>${streekIcoon(S.rol)}</span>Elke twee sporen lever je je tegenspeler een streek.</li>
        <li><span>★</span>Wie het laatste spoor eerst vindt, wint de penning.</li>
      </ol>
      <button class="knop goud" data-act="klaar" ${S.klaar ? 'disabled' : ''}>${S.klaar ? 'Klaar ✓' : 'Ik ben klaar'}</button>
      <p class="status">${status}</p>
      <button class="link" data-act="solo">Alleen oefenen</button>
    </section>`;
  }

  function schermHoorn() {
    return `<section class="scherm midden hoorn">
      <div class="hoorn-icoon">📯</div>
      <h1 class="titel">De jacht <em>begint</em></h1>
    </section>`;
  }

  function schermAftellen() {
    return `<section class="scherm midden aftellen"><div class="teller pop" id="teller">3</div></section>`;
  }

  const huidig = () => (S.i < S.sporen.length ? S.sporen[S.i] : null);

  function schermVraag() {
    const q = huidig();
    const finale = !q;
    const tekst = finale ? D.finale.tekst : q.tekst;
    const knoppen = finale ? D.finale.opties : PLAATSEN;
    return `<section class="scherm vraag ${finale ? 'finale' : ''}">${kop()}
      <main class="blad">
        <p class="bovenschrift">${finale ? '★ Het laatste spoor' : `Spoor ${S.i + 1} van ${D.aantalSporen}`}</p>
        <h2 class="vraagtekst">${esc(tekst)}</h2>
        <div class="muurknoppen ${finale ? 'twee' : ''}">
          ${knoppen.map(k => `<button class="plaats" data-act="antwoord" data-waarde="${k.waarde}">
            <span class="pijltje">${k.pijl}</span><span>${k.label}</span></button>`).join('')}
        </div>
      </main>
      <div class="straf ${S.straf ? 'aan' : ''}" id="straf"><div><strong>Mis!</strong><p>Fout spoor… kijk nog eens goed.</p><div class="balk"><span></span></div></div></div>
    </section>`;
  }

  // Kort scherm na een juist antwoord. Na elk tweede spoor: een streek naar de overkant.
  function schermGevonden() {
    const r = D.rollen[S.rol];
    return `<section class="scherm gevonden">${kop()}
      <main class="midden">
        <div class="vinkje">🐾</div>
        <h2 class="titel">Gevonden!</h2>
        ${streekNu()
          ? `<button class="knop streek" data-act="streek">${streekIcoon(S.rol)} ${esc(r.streek.knop)}</button>`
          : `<p class="lead">${S.i < D.aantalSporen ? 'Op naar het volgende spoor…' : 'Alle sporen gevonden!'}</p>`}
      </main></section>`;
  }

  function schermDraai() {
    const r = D.rollen[S.rol];
    return `<section class="scherm midden draai">
      <div class="pijl ${r.focusKant}">${r.focusKant === 'links' ? '⟵' : '⟶'}</div>
      <h1 class="titel">Draai je <em>om!</em></h1>
      <p class="lead">Het laatste spoor zit op de grote muur, aan je ${r.focusKant === 'links' ? 'linker' : 'rechter'}kant.</p>
    </section>`;
  }

  function schermEinde() {
    const gewonnen = S.einde === S.rol;
    const winnaar = D.rollen[S.einde];
    if (gewonnen) {
      return `<section class="scherm midden einde winst">
        <div class="rolicoon groot" style="--k:${winnaar.kleur}">${winnaar.icoon}</div>
        <p class="bovenschrift">${esc(winnaar.winst)}</p>
        <h1 class="titel">Jij wint <em>de penning!</em></h1>
        <div class="opdracht"><strong>${esc(D.prijs.titel)}</strong><p>${esc(D.prijs.tekst)}</p></div>
        <button class="link" data-act="opnieuw">Nieuwe jacht</button>
      </section>`;
    }
    return `<section class="scherm midden einde verlies">
      <div class="rolicoon groot" style="--k:${winnaar.kleur}">${winnaar.icoon}</div>
      <p class="bovenschrift">${esc(winnaar.winst)}</p>
      <h1 class="titel">Net <em>niet…</em></h1>
      <p class="lead">${winnaar.naam} was je te snel af en gaat met de penning lopen.</p>
      <button class="knop goud" data-act="opnieuw">Nog een jacht</button>
    </section>`;
  }

  /* ---------- spelverloop ---------- */
  function begin() {
    G.stopSfeer();
    S.scherm = 'hoorn';
    toon();
    G.roep(() => {
      if (S.scherm !== 'hoorn') return;
      S.scherm = 'aftellen';
      toon();
      G.tik(false);
      let n = 3;
      const tel = () => {
        n -= 1;
        const el = document.getElementById('teller');
        if (n > 0) {
          if (el) { el.textContent = n; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
          G.tik(false);
          wacht(tel, 800);
        } else {
          G.tik(true);
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
    G.ting();
    G.stappen();
    S.scherm = 'gevonden';
    toon();
    const streek = streekNu();
    wacht(() => { if (streek) stuurStreek(); verder(); }, streek ? 2600 : 1300);
  }

  function fout(knop) {
    knop.classList.add('fout');
    G.kraai();
    S.straf = true;
    const el = document.getElementById('straf');
    if (el) el.classList.add('aan');
    wacht(() => {
      S.straf = false;
      const e = document.getElementById('straf');
      if (e) e.classList.remove('aan');
      knop.classList.remove('fout');
    }, STRAF_MS);
  }

  // Streek naar de overkant (één keer per moment, ook als niemand op de knop tikt)
  function stuurStreek() {
    if (S.streek === S.i) return;
    S.streek = S.i;
    zend({ type: 'streek', rol: S.rol });
    S.rol === 'vos' ? G.mist() : G.blaf();
  }

  // De streek van de tegenspeler: mist (van de vos) of geblaf (van de jager)
  function ondergaStreek(vanRol) {
    const r = D.rollen[vanRol];
    const laag = document.createElement('div');
    laag.className = `streeklaag ${vanRol === 'vos' ? 'mistlaag' : 'geblaf'}`;
    laag.innerHTML = `<div class="streektekst"><span>${streekIcoon(vanRol)}</span>${esc(r.streek.melding)}</div>`;
    document.body.appendChild(laag);
    if (vanRol === 'vos') G.mist();
    else { G.blaf(); document.body.classList.add('schud'); }
    setTimeout(() => { laag.remove(); document.body.classList.remove('schud'); }, STREEK_MS);
  }

  function verder() {
    if (S.i >= S.sporen.length) {
      S.scherm = 'draai';
      toon();
      G.kort();
      wacht(() => { S.scherm = 'vraag'; toon(); }, 3200);
    } else {
      S.scherm = 'vraag';
      toon();
    }
  }

  function einde(winnaar) {
    stopTimers();
    G.stopHartslag();
    S.einde = winnaar;
    S.scherm = 'einde';
    toon();
    if (winnaar === S.rol) { G.hallali(); vonken(); } else G.droevig();
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
    if (act === 'kies') {
      history.replaceState(null, '', `?rol=${b.dataset.rol}`);
      reset(b.dataset.rol);
    } else if (act === 'klaar') {
      S.klaar = true;
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
