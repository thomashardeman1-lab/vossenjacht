/*
 * De Digitale Vossenjacht — spellogica
 *
 * Elke iPad opent de pagina met zijn rol in de URL:
 *   index.html?rol=vos     (kijkt naar kant 3)
 *   index.html?rol=jager   (kijkt naar kant 1)
 * Zonder ?rol= kies je de rol op het scherm.
 *
 * De winnaar krijgt een penning (token) met NFC-chip. Wat die penning in de
 * zaal doet, blijft fysiek: het spel toont het niet en zegt er niets over.
 * De penning op de schermen (js/embleem.js) is het ontwerp van die token.
 * Via een QR-code bewaart de winnaar zijn penning ook digitaal op zijn gsm
 * (jachtkamer.html).
 *
 * Synchronisatie: in dit prototype praten de twee schermen via
 * BroadcastChannel. Dat werkt tussen tabbladen/iframes in dezelfde browser
 * (zie duo.html om op één computer te testen). Voor twee echte iPads
 * vervang je enkel de functie `verbind()` door een realtime dienst
 * (bv. Firebase, Supabase Realtime of een kleine WebSocket-server).
 */
(() => {
  'use strict';

  const D = window.MSK;
  const E = window.Embleem;
  const app = document.getElementById('app');
  const params = new URLSearchParams(location.search);

  const STRAF_MS = 3000;
  const INACTIEF_MS = 120000;
  const RESET_NA_EINDE_MS = 60000;

  const beeld = (id, w = 900) =>
    id ? `https://imagehub.mskgent.be/iiif/2/public%2F${id}.tif/full/${w},/0/default.jpg` : '';
  const ander = rol => (rol === 'vos' ? 'jager' : 'vos');
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const schud = a => a.map(v => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map(v => v[1]);

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
      vragen: rol ? D.vragen[rol] : [],
      i: 0,
      voortgang: { vos: 0, jager: 0 },
      startTijd: 0,
      fouten: 0,
      straf: false,
      opties: null,
      einde: null
    };
  }

  function reset(rol = S && S.rol, meld = false) {
    stopTimers();
    S = nieuweToestand(rol);
    if (meld) zend({ type: 'reset' });
    if (rol) zend({ type: 'hallo', rol });
    toon();
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
        if (m.n === S.vragen.length && !['einde', 'start'].includes(S.scherm)) {
          melding(`${D.rollen[m.rol].naam} is al bij het laatste spoor!`);
        }
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
    app.innerHTML = `<div class="kader"><div class="binnenlijn"></div>${f()}</div>`;
    app.dataset.rol = S.rol || '';
    const scherm = app.querySelector('.scherm');
    if (scherm) requestAnimationFrame(() => scherm.classList.add('in'));
  }

  const penning = id => E.svg({ id });

  // bovenbalk tijdens het spel: mini-penning, pootjes-voortgang, rol
  const balk = () => `<header class="balk">
      <div class="logo">${penning('logo')}</div>
      ${spoor()}
      <div class="rolpil ${S.rol}">${E.icoon(S.rol)}<span>${D.rollen[S.rol].naam}</span></div>
    </header>`;

  /* ---------- schermen ---------- */
  function schermKies() {
    return `<section class="scherm kies midden">
      <div class="penning-midden wiebel">${penning('kies')}</div>
      <h1 class="titel">Wie ben jij?</h1>
      <p class="lead">Kies de kant van de sokkel waar dit scherm staat.</p>
      <div class="rolkeuze">
        ${['vos', 'jager'].map(r => `
          <button class="rolkaart ${r}" data-act="kies" data-rol="${r}">
            ${E.icoon(r)}
            <strong>${D.rollen[r].naam}</strong>
            <small>kijkt naar ${D.rollen[r].muurNaam}</small>
          </button>`).join('')}
      </div>
    </section>`;
  }

  function schermStart() {
    const r = D.rollen[S.rol], tegen = D.rollen[ander(S.rol)];
    let status;
    if (S.klaar && !S.partnerKlaar) status = `Even wachten op ${tegen.naam.toLowerCase()}…`;
    else if (!S.klaar && S.partnerKlaar) status = `${tegen.naam} staat klaar. Jij ook?`;
    else status = S.partnerAanwezig ? `${tegen.naam} is er ook!` : 'Zoek je tegenspeler aan de overkant.';

    return `<section class="scherm start twee">
      <div class="penning-groot wiebel">${penning('start')}<p class="onder">Win de penning!</p></div>
      <div class="tekst">
        <div class="chip ${S.rol}">${E.icoon(S.rol)} Jij bent ${r.naam.toLowerCase()}</div>
        <h1 class="titel groot">Vossen&shy;jacht</h1>
        <ol class="stappen">
          <li><span>1</span>Kijk over de sokkel naar de muur achter je tegenspeler.</li>
          <li><span>2</span>Vind ${S.vragen.length} sporen. Fout? Dan wacht je ${STRAF_MS / 1000} tellen.</li>
          <li><span>3</span>Eerst bij het laatste spoor? Dan win jij de penning!</li>
        </ol>
        <button class="knop" data-act="klaar" ${S.klaar ? 'disabled' : ''}>${S.klaar ? 'Klaar!' : 'Ik ben klaar!'}</button>
        <p class="status">${status}</p>
        <button class="link" data-act="solo">Alleen oefenen</button>
      </div>
    </section>`;
  }

  function schermHoorn() {
    return `<section class="scherm hoorn midden">
      <div class="hoorn-icoon" aria-hidden="true"><svg viewBox="0 0 120 120"><g fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round">
        <circle cx="55" cy="62" r="30"/><circle cx="55" cy="62" r="17"/><path d="M83 52C96 44 104 34 110 20M102 12L116 30M27 72C16 80 10 90 6 100"/></g></svg></div>
      <h1 class="titel">Tatataa!</h1>
      <p class="lead">De jacht wordt geblazen…</p>
    </section>`;
  }

  function schermAftellen() {
    return `<section class="scherm aftellen midden">
      <div class="teller pop" id="teller">3</div><p class="lead">Klaar voor de jacht?</p></section>`;
  }

  const spoor = () => {
    const n = S.vragen.length + 1;
    const rij = rol => `<div class="pootjes ${rol} ${rol === S.rol ? 'eigen' : ''}">
        ${Array.from({ length: n }, (_, k) => `<span class="${k < S.voortgang[rol] ? 'gezet' : ''} ${k === n - 1 ? 'laatste' : ''}">${E.poot()}</span>`).join('')}
        <em>${rol === S.rol ? 'Jij' : D.rollen[rol].naam}</em>
      </div>`;
    return `<div class="spoor">${rij(S.rol)}${S.solo ? '' : rij(ander(S.rol))}</div>`;
  };

  function updateSpoor() {
    const el = app.querySelector('.spoor');
    if (el) el.outerHTML = spoor();
  }

  const huidigeVraag = () => (S.i < S.vragen.length ? S.vragen[S.i] : D.finale);

  function muurSchets() {
    const r = D.rollen[S.rol];
    const som = r.muur.reduce((t, k) => t + (D.werken[k].b || 100), 0);
    const lijsten = r.muur.map((k, n) => {
      const w = D.werken[k];
      const breedte = ((w.b || 100) / som) * 76;
      return `<button class="lijst" data-act="muur" data-werk="${k}" style="--w:${breedte}%;--r:${w.b || 100}/${w.h || 100}">
        <span class="nr">${n + 1}</span></button>`;
    }).join('');
    return `<div class="muur">
      <div class="wand">${lijsten}</div>
      <p class="hint">${r.focusKant === 'links' ? '← ' : ''}de muur achter je tegenspeler · tik op het juiste schilderij${r.focusKant === 'rechts' ? ' →' : ''}</p></div>`;
  }

  function schermVraag() {
    const q = huidigeVraag();
    const finale = S.i >= S.vragen.length;
    if (q.type === 'keuze' && !S.opties) S.opties = schud(q.opties);
    return `<section class="scherm vraag ${finale ? 'finale' : ''}">${balk()}
      <main class="vraagvlak">
        <div class="vraagkop">
          <div class="vos-hulp">${E.vos()}</div>
          <div class="ballon">
            <span class="chip klein">${finale ? 'Laatste spoor!' : `Spoor ${S.i + 1} van ${S.vragen.length}`}</span>
            <h2 class="vraagtekst">${esc(q.tekst)}</h2>
          </div>
        </div>
        ${q.type === 'muur' ? muurSchets() : `<div class="opties">${S.opties.map((o, k) =>
          `<button class="optie" data-act="keuze" data-waarde="${esc(o)}"><span>${'ABCD'[k]}</span>${esc(o)}</button>`).join('')}</div>`}
      </main>
      <div class="straf ${S.straf ? 'aan' : ''}" id="straf">
        <div class="straf-vos">${E.vos()}</div>
        <div class="oeps">Oeps!</div><p>Kijk nog eens goed…</p>
        <div class="ring"><svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="17"/></svg></div>
      </div>
    </section>`;
  }

  function schermGevonden() {
    const q = S.vragen[S.i - 1];
    const w = D.werken[q.werk];
    return `<section class="scherm gevonden">${balk()}
      <main class="twee">
        <figure class="werk">${w.iiif ? `<img src="${beeld(w.iiif, 1000)}" alt="${esc(w.titel)}">` : '<div class="leeg">beeld volgt</div>'}</figure>
        <div class="tekst">
          <div class="chip groen">Gevonden!</div>
          <h2 class="werktitel">${esc(w.titel)}</h2>
          <p class="maker">${esc(w.kunstenaar)}</p>
          <p class="weetje"><b>Wist je dat?</b> ${esc(q.weetje)}</p>
          <button class="knop" data-act="verder">${S.i < S.vragen.length ? 'Volgend spoor' : 'Naar het laatste spoor!'}</button>
        </div>
      </main></section>`;
  }

  function schermDraai() {
    const r = D.rollen[S.rol];
    return `<section class="scherm draai midden">
      <div class="pijl ${r.focusKant}">${r.focusKant === 'links' ? '⬅' : '➡'}</div>
      <h1 class="titel">Draai je naar ${r.focusKant}!</h1>
      <p class="lead">Het laatste spoor zit op de grote muur.</p>
    </section>`;
  }

  function schermEinde() {
    const gewonnen = S.einde === S.rol;
    if (gewonnen) {
      return `<section class="scherm einde winst twee">
        <div class="penning-groot munt">${penning('winst')}</div>
        <div class="tekst">
          <div class="chip ${S.rol}">${S.rol === 'vos' ? 'De vos ontsnapt!' : 'De vos is gevangen!'}</div>
          <h1 class="titel">Jij wint de penning!</h1>
          <div class="opdracht">
            <div class="nfc" aria-hidden="true"><span></span><span></span><span></span></div>
            <div><strong>${esc(D.prijs.titel)}</strong><p>${esc(D.prijs.tekst)}</p></div>
          </div>
          <div class="bewaar">
            <div class="qr" id="qr"></div>
            <p><b>Neem hem mee!</b><br>${esc(D.prijs.bewaar)}</p>
          </div>
          <button class="link" data-act="opnieuw">Nieuwe jacht</button>
        </div>
      </section>`;
    }
    return `<section class="scherm einde verlies midden">
      <div class="vos-groot">${E.icoon(S.einde)}</div>
      <h1 class="titel">Net niet!</h1>
      <p class="lead">${D.rollen[S.einde].naam} was je net te snel af en wint de penning. Nog een keer?</p>
      <button class="knop" data-act="opnieuw">Nog een jacht</button>
    </section>`;
  }

  /* ---------- speelse effecten ---------- */
  function confetti(aantal = 70) {
    const kleuren = ['#e2602f', '#3f6fd8', '#3d8b42', '#f2c94c', '#fbf4e6'];
    const laag = document.createElement('div');
    laag.className = 'confetti';
    for (let i = 0; i < aantal; i++) {
      const s = document.createElement('i');
      s.style.left = Math.random() * 100 + '%';
      s.style.background = kleuren[i % kleuren.length];
      s.style.setProperty('--x', (Math.random() * 200 - 100) + 'px');
      s.style.setProperty('--r', (Math.random() * 720 - 360) + 'deg');
      s.style.animationDelay = Math.random() * .4 + 's';
      s.style.animationDuration = 1.6 + Math.random() * 1.4 + 's';
      if (i % 3 === 0) s.style.borderRadius = '50%';
      laag.appendChild(s);
    }
    document.body.appendChild(laag);
    setTimeout(() => laag.remove(), 3600);
  }

  /* ---------- spelverloop ---------- */
  function begin() {
    S.scherm = 'hoorn';
    toon();
    window.Hoorn.roep(() => {
      if (S.scherm !== 'hoorn') return;
      S.scherm = 'aftellen';
      toon();
      let n = 3;
      const tik = () => {
        n -= 1;
        const el = document.getElementById('teller');
        if (n > 0) {
          if (el) { el.textContent = n; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
          wacht(tik, 900);
        } else { S.startTijd = Date.now(); S.scherm = 'vraag'; toon(); }
      };
      wacht(tik, 900);
    });
  }

  function goed() {
    if (S.i >= S.vragen.length) {
      zend({ type: 'winst', rol: S.rol });
      einde(S.rol);
      return;
    }
    S.i += 1;
    S.voortgang[S.rol] = S.i;
    S.opties = null;
    zend({ type: 'voortgang', rol: S.rol, n: S.i });
    S.scherm = 'gevonden';
    toon();
    confetti(45);
  }

  function fout(knop) {
    if (knop) knop.classList.add('fout');
    S.straf = true;
    S.fouten += 1;
    const el = document.getElementById('straf');
    if (el) el.classList.add('aan');
    wacht(() => {
      S.straf = false;
      const e = document.getElementById('straf');
      if (e) e.classList.remove('aan');
      if (knop) knop.classList.remove('fout');
    }, STRAF_MS);
  }

  function verder() {
    if (S.i >= S.vragen.length) {
      S.scherm = 'draai';
      toon();
      wacht(() => { S.scherm = 'vraag'; toon(); }, 3500);
    } else {
      S.scherm = 'vraag';
      toon();
    }
  }

  function einde(winnaar) {
    stopTimers();
    S.einde = winnaar;
    S.scherm = 'einde';
    toon();
    if (winnaar === S.rol) {
      window.Hoorn.hallali();
      toonQR();
      confetti(140);
    }
    wacht(() => reset(S.rol), RESET_NA_EINDE_MS);
  }

  /*
   * QR-code naar de digitale jachtkamer. De gegevens van de penning zitten in
   * de link zelf (geen server nodig): rol, tijdstip, speelduur, fouten en
   * een volgnummer.
   */
  function penningLink() {
    const p = {
      r: S.rol,
      t: Date.now(),
      d: S.startTijd ? Math.round((Date.now() - S.startTijd) / 1000) : 0,
      f: S.fouten,
      n: Math.floor(Date.now() / 1000) % 10000
    };
    const code = btoa(JSON.stringify(p)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    return new URL(`jachtkamer.html?p=${code}`, location.href).href;
  }

  function toonQR() {
    const el = document.getElementById('qr');
    if (!el) return;
    const link = penningLink();
    if (typeof window.qrcode === 'function') {
      const qr = window.qrcode(0, 'M');
      qr.addData(link);
      qr.make();
      el.innerHTML = qr.createSvgTag({ cellSize: 4, margin: 1, scalable: true });
    } else {
      el.innerHTML = `<a class="qr-link" href="${link}" target="_blank">open je jachtkamer</a>`;
    }
  }

  function melding(tekst) {
    const m = document.createElement('div');
    m.className = 'melding';
    m.innerHTML = `${E.icoon(ander(S.rol))}<span>${esc(tekst)}</span>`;
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
      window.Hoorn.ontgrendel(); // geluid toestaan (iPad) bij deze aanraking
      S.klaar = true;
      zend({ type: 'klaar', rol: S.rol });
      S.partnerKlaar ? begin() : toon();
    } else if (act === 'solo') {
      window.Hoorn.ontgrendel();
      S.solo = true;
      begin();
    } else if (act === 'muur') {
      b.dataset.werk === huidigeVraag().antwoord ? goed() : fout(b);
    } else if (act === 'keuze') {
      b.dataset.waarde === huidigeVraag().juist ? goed() : fout(b);
    } else if (act === 'verder') {
      verder();
    } else if (act === 'opnieuw') {
      reset(S.rol, true);
    }
  });

  let inactief;
  const port = () => {
    clearTimeout(inactief);
    inactief = setTimeout(() => {
      if (S && !['start', 'kies'].includes(S.scherm)) reset(S.rol, true);
    }, INACTIEF_MS);
  };
  ['pointerdown', 'keydown'].forEach(ev => document.addEventListener(ev, port, { passive: true }));
  port();

  document.addEventListener('error', e => {
    if (e.target.tagName === 'IMG') e.target.classList.add('kapot');
  }, true);

  const startRol = ['vos', 'jager'].includes(params.get('rol')) ? params.get('rol') : null;
  reset(startRol);
})();
