/*
 * De Digitale Vossenjacht — spellogica
 *
 * Elke iPad opent de pagina met zijn rol in de URL:
 *   index.html?rol=vos     (kijkt naar kant 3)
 *   index.html?rol=jager   (kijkt naar kant 1)
 * Zonder ?rol= kies je de rol op het scherm.
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
  const app = document.getElementById('app');
  const params = new URLSearchParams(location.search);

  const STRAF_MS = 3000;          // wachttijd na een fout antwoord
  const INACTIEF_MS = 120000;     // terug naar start bij inactiviteit
  const RESET_NA_EINDE_MS = 45000;

  const beeld = (id, w = 900) =>
    id ? `https://imagehub.mskgent.be/iiif/2/public%2F${id}.tif/full/${w},/0/default.jpg` : '';
  const ander = rol => (rol === 'vos' ? 'jager' : 'vos');
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const schud = a => a.map(v => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map(v => v[1]);

  /* ---------- verbinding tussen de twee schermen ---------- */
  let kanaal = null;
  function verbind(onBericht) {
    if (!('BroadcastChannel' in window)) return () => {};
    kanaal = new BroadcastChannel('msk-vossenjacht');
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
    if (!S || !S.rol) return;
    if (m.rol === S.rol) return; // zelfde rol: negeren
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
        updateRace();
        if (m.n === S.vragen.length && S.scherm !== 'einde') melding(`${D.rollen[m.rol].naam} draait zich al naar de bovenmuur!`);
        break;
      case 'winst':
        if (S.scherm !== 'einde') einde(m.rol);
        break;
      case 'reset':
        reset(S.rol);
        break;
    }
  }

  /* ---------- schermen ---------- */
  function toon() {
    const f = {
      kies: schermKies, start: schermStart, aftellen: schermAftellen,
      vraag: schermVraag, gevonden: schermGevonden, draai: schermDraai, einde: schermEinde
    }[S.scherm];
    app.innerHTML = f();
    app.dataset.rol = S.rol || '';
    const scherm = app.firstElementChild;
    if (scherm) scherm.classList.add('in');
  }

  const kop = () => `
    <header class="kop">
      <div class="merk"><span class="msk">MSK</span><span class="streep"></span><span class="sub">Museum voor Schone Kunsten Gent</span></div>
      ${S.rol ? `<div class="rolbadge" style="--k:${D.rollen[S.rol].kleur}">${D.rollen[S.rol].icoon} ${D.rollen[S.rol].naam}</div>` : '<div class="label">Interactieve installatie</div>'}
    </header>`;

  function schermKies() {
    return `<section class="scherm kies">${kop()}
      <main class="midden">
        <h1 class="titel">De Digitale <em>Vossenjacht</em></h1>
        <p class="lead">Welke kant van de sokkel is dit scherm?</p>
        <div class="rolkeuze">
          ${['vos', 'jager'].map(r => `
            <button class="rolkaart" data-act="kies" data-rol="${r}" style="--k:${D.rollen[r].kleur}">
              <span class="groot">${D.rollen[r].icoon}</span>
              <strong>${D.rollen[r].naam}</strong>
              <small>kijkt naar ${D.rollen[r].muurNaam}</small>
            </button>`).join('')}
        </div>
      </main></section>`;
  }

  function schermStart() {
    const r = D.rollen[S.rol], tegen = D.rollen[ander(S.rol)];
    let status;
    if (S.klaar && !S.partnerKlaar) status = `Wachten tot ${tegen.naam.toLowerCase()} klaar is…`;
    else if (!S.klaar && S.partnerKlaar) status = `${tegen.naam} staat klaar. Jij ook?`;
    else status = S.partnerAanwezig ? `${tegen.naam} is verbonden.` : `Zoek je tegenspeler aan de overkant van de sokkel.`;

    return `<section class="scherm start">${kop()}
      <main class="raster">
        <figure class="hero">
          <img src="${beeld(D.werken.vossenjacht.iiif, 1000)}" alt="${esc(D.werken.vossenjacht.titel)}">
          <figcaption><span>Het doel van de jacht</span><em>${esc(D.werken.vossenjacht.titel)}</em> — ${esc(D.werken.vossenjacht.kunstenaar)}</figcaption>
        </figure>
        <div class="tekst">
          <div class="pil">Spel voor 2 spelers</div>
          <h1 class="titel">De Digitale <em>Vossenjacht</em></h1>
          <p class="lead">Jij bent <strong style="color:${r.kleur}">${r.naam.toLowerCase()}</strong>. ${esc(r.intro)}</p>
          <ol class="regels">
            <li>Kijk over de sokkel naar de muur achter je tegenspeler.</li>
            <li>Los ${S.vragen.length} sporen op. Een fout antwoord kost je ${STRAF_MS / 1000} seconden.</li>
            <li>Wie eerst klaar is, mag als eerste naar het laatste spoor op de grote muur.</li>
          </ol>
          <button class="knop goud" data-act="klaar" ${S.klaar ? 'disabled' : ''}>${S.klaar ? 'Klaar ✓' : 'Ik ben klaar'}</button>
          <p class="status">${status}</p>
          <button class="link" data-act="solo">Oefenen zonder tegenspeler</button>
        </div>
      </main></section>`;
  }

  function schermAftellen() {
    return `<section class="scherm aftellen"><div class="teller" id="teller">3</div><p class="lead">De jacht begint…</p></section>`;
  }

  const race = () => {
    const tot = S.vragen.length + 1;
    const baan = rol => {
      const r = D.rollen[rol];
      const p = Math.min(S.voortgang[rol], tot) / tot * 100;
      return `<div class="baan ${rol === S.rol ? 'eigen' : ''}" data-baan="${rol}">
        <span class="naam">${rol === S.rol ? 'Jij' : r.naam}</span>
        <div class="spoor"><div class="vul" style="width:${p}%;background:${r.kleur}"></div><span class="loper" style="left:${p}%">${r.icoon}</span></div>
      </div>`;
    };
    return `<div class="race">${baan(S.rol)}${S.solo ? '' : baan(ander(S.rol))}</div>`;
  };

  function updateRace() {
    const el = app.querySelector('.race');
    if (el) el.outerHTML = race();
  }

  function huidigeVraag() {
    return S.i < S.vragen.length ? S.vragen[S.i] : D.finale;
  }

  function muurSchets(q) {
    const r = D.rollen[S.rol];
    // Lijsten op schaal: breedte in verhouding tot de echte breedtes, hoogte via aspect-ratio.
    const som = r.muur.reduce((t, k) => t + (D.werken[k].b || 100), 0);
    const lijsten = r.muur.map((k, n) => {
      const w = D.werken[k];
      const breedte = ((w.b || 100) / som) * 78;
      return `<button class="lijst" data-act="muur" data-werk="${k}" style="--w:${breedte}%;--r:${w.b || 100}/${w.h || 100}">
        <span class="nr">${n + 1}</span></button>`;
    }).join('');
    const pijl = `<div class="focus ${r.focusKant}">${r.focusKant === 'links' ? '←' : ''} bovenmuur ${r.focusKant === 'rechts' ? '→' : ''}</div>`;
    return `<div class="muur">${pijl}<div class="wand">${lijsten}</div><div class="plint"></div>
      <p class="hint">Dit is de muur achter je tegenspeler (${r.muurNaam}). Tik op het juiste schilderij.</p></div>`;
  }

  function schermVraag() {
    const q = huidigeVraag();
    const finale = S.i >= S.vragen.length;
    if (q.type === 'keuze' && !S.opties) S.opties = schud(q.opties);
    const nr = finale ? 'Laatste spoor' : `Spoor ${S.i + 1} van ${S.vragen.length}`;
    return `<section class="scherm vraag ${finale ? 'finale' : ''}">${kop()}
      ${race()}
      <main class="kaart">
        <div class="nummer">${nr}</div>
        <h2 class="vraagtekst">${esc(q.tekst)}</h2>
        ${q.type === 'muur' ? muurSchets(q) : `<div class="opties">${S.opties.map(o =>
          `<button class="optie" data-act="keuze" data-waarde="${esc(o)}">${esc(o)}</button>`).join('')}</div>`}
      </main>
      <div class="straf ${S.straf ? 'aan' : ''}" id="straf"><div><strong>Mis!</strong><p>Kijk nog eens goed naar de muur.</p><div class="balk"><span></span></div></div></div>
    </section>`;
  }

  function schermGevonden() {
    const q = S.vragen[S.i - 1];
    const w = D.werken[q.werk];
    return `<section class="scherm gevonden">${kop()}${race()}
      <main class="raster">
        <figure class="werk">${w.iiif ? `<img src="${beeld(w.iiif, 1000)}" alt="${esc(w.titel)}">` : '<div class="leeg">beeld volgt</div>'}</figure>
        <div class="tekst">
          <div class="pil groen">Gevonden!</div>
          <h2 class="werktitel">${esc(w.titel)}</h2>
          <p class="maker">${esc(w.kunstenaar)}${w.inv ? ` · inv. ${esc(w.inv)}` : ''}</p>
          <p class="weetje">${esc(q.weetje)}</p>
          <button class="knop goud" data-act="verder">${S.i < S.vragen.length ? 'Volgend spoor' : 'Naar het laatste spoor'}</button>
        </div>
      </main></section>`;
  }

  function schermDraai() {
    const r = D.rollen[S.rol];
    return `<section class="scherm draai">
      <div class="pijl ${r.focusKant}">${r.focusKant === 'links' ? '⟵' : '⟶'}</div>
      <h1 class="titel">Draai je naar <em>${r.focusKant}</em></h1>
      <p class="lead">Het laatste spoor ligt op de grote muur met het werk van Paul de Vos.</p>
    </section>`;
  }

  function schermEinde() {
    const gewonnen = S.einde === S.rol;
    const vosWint = S.einde === 'vos';
    const kop1 = vosWint ? 'De vos ontsnapt!' : 'De vos is gevangen!';
    const sub = gewonnen
      ? (S.rol === 'vos' ? 'Jij was de jager te slim af.' : 'Jij las de sporen het snelst.')
      : (S.rol === 'vos' ? 'De jager was je net te snel af.' : 'De vos glipte net voor je neus weg.');
    const v = D.werken.vossenjacht;
    return `<section class="scherm einde ${gewonnen ? 'winst' : 'verlies'}">
      <div class="doek"><img src="${beeld(v.iiif, 1600)}" alt="${esc(v.titel)}"></div>
      <div class="overlay">
        <div class="groot">${D.rollen[S.einde].icoon}</div>
        <h1 class="titel">${kop1}</h1>
        <p class="lead">${sub}</p>
        <p class="weetje">${esc(D.finale.weetje)}</p>
        <button class="knop goud" data-act="opnieuw">Nog een jacht</button>
      </div>
    </section>`;
  }

  /* ---------- spelverloop ---------- */
  function begin() {
    S.scherm = 'aftellen';
    toon();
    let n = 3;
    const tik = () => {
      n -= 1;
      const el = document.getElementById('teller');
      if (n > 0) { if (el) el.textContent = n; wacht(tik, 900); }
      else { S.scherm = 'vraag'; toon(); }
    };
    wacht(tik, 900);
  }

  function goed() {
    const finale = S.i >= S.vragen.length;
    if (finale) {
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
  }

  function fout(knop) {
    if (knop) knop.classList.add('fout');
    S.straf = true;
    const el = document.getElementById('straf');
    if (el) el.classList.add('aan');
    wacht(() => {
      S.straf = false;
      const e = document.getElementById('straf');
      if (e) e.classList.remove('aan');
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
    wacht(() => reset(S.rol), RESET_NA_EINDE_MS);
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

  // Terug naar het startscherm als niemand het scherm aanraakt.
  let inactief;
  const port = () => {
    clearTimeout(inactief);
    inactief = setTimeout(() => {
      if (S && S.scherm !== 'start' && S.scherm !== 'kies') reset(S.rol, true);
    }, INACTIEF_MS);
  };
  ['pointerdown', 'keydown'].forEach(ev => document.addEventListener(ev, port, { passive: true }));
  port();

  // Lege beelden netjes opvangen
  document.addEventListener('error', e => {
    if (e.target.tagName === 'IMG') e.target.classList.add('kapot');
  }, true);

  const startRol = ['vos', 'jager'].includes(params.get('rol')) ? params.get('rol') : null;
  reset(startRol);
})();
