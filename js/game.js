/*
 * De Digitale Vossenjacht — spellogica
 *
 * Elke iPad opent de pagina met zijn rol in de URL:
 *   index.html?rol=vos     (kijkt naar kant 3)
 *   index.html?rol=jager   (kijkt naar kant 1)
 * Zonder ?rol= kies je de rol op het scherm.
 *
 * De vossenjacht van Paul de Vos hangt achter een gordijn. Enkel de winnaar
 * krijgt het schilderij op zijn scherm te zien, en krijgt een penning (token)
 * met NFC-chip om het gordijn in de zaal te openen. Het embleem op de
 * schermen (js/embleem.js) is het ontwerp van die penning.
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
  const ACHTERGROND = '#1b1a17'; // moet gelijk zijn aan --zwart in style.css

  const beeld = (id, w = 900) =>
    id ? `https://imagehub.mskgent.be/iiif/2/public%2F${id}.tif/full/${w},/0/default.jpg` : '';
  const ander = rol => (rol === 'vos' ? 'jager' : 'vos');
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const schud = a => a.map(v => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map(v => v[1]);
  const twee = n => String(n).padStart(2, '0');
  const embleem = id => E.svg({ id, voor: '#f1e6cc', achter: ACHTERGROND });

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
          melding(`${D.rollen[m.rol].naam} draait zich al naar de grote muur!`);
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
    app.innerHTML = f();
    app.dataset.rol = S.rol || '';
    const scherm = app.firstElementChild;
    if (scherm) requestAnimationFrame(() => scherm.classList.add('in'));
  }

  // De marges: woordmerk in de hoeken, gedraaide tekstblokken, MSK-badges.
  const tekstblok = (k) => `<div class="tblok ${k}">
      <span>De digitale</span><span>vossenjacht:</span>
      <span class="spreid"><i>zie</i><i>zoek</i><i>vind</i></span></div>`;
  const rand = (vol = true) => `
    <div class="rand" aria-hidden="true">
      <span class="woordmerk tl">Vossenjacht.</span><span class="woordmerk tr">Vossenjacht.</span>
      <span class="woordmerk bl">Vossenjacht.</span><span class="woordmerk br">Vossenjacht.</span>
      <span class="badge l">MSK</span><span class="badge r">MSK</span>
      ${tekstblok('l1')}${tekstblok('l2')}${tekstblok('r1')}${tekstblok('r2')}
      ${vol ? tekstblok('boven') + tekstblok('onder') : ''}
    </div>`;

  // "HUNT — PREMIUM — FISH"-label
  const lijnlabel = (links, midden, rechts) =>
    `<p class="lijnlabel"><span>${links}</span><b>${midden}</b><span>${rechts}</span></p>`;

  const icoon = rol => `<span class="speler ${rol}">${E.icoon(rol)}</span>`;

  /* ---------- schermen ---------- */
  function schermKies() {
    return `<section class="scherm kies">${rand()}
      <main class="inhoud midden">
        <div class="embleem-klein">${embleem('kies')}</div>
        <h1 class="titel"><span class="script">De digitale</span><span class="blokletter">Vossen<br>jacht</span></h1>
        ${lijnlabel('Zie', 'Welke kant ben jij?', 'Vind')}
        <div class="rolkeuze">
          ${['vos', 'jager'].map(r => `
            <button class="rolkaart" data-act="kies" data-rol="${r}">
              ${icoon(r)}
              <strong>${D.rollen[r].naam}</strong>
              <small>kijkt naar ${D.rollen[r].muurNaam}</small>
            </button>`).join('')}
        </div>
      </main></section>`;
  }

  function schermStart() {
    const r = D.rollen[S.rol], tegen = D.rollen[ander(S.rol)];
    let status;
    if (S.klaar && !S.partnerKlaar) status = `Wachten op ${tegen.naam.toLowerCase()}…`;
    else if (!S.klaar && S.partnerKlaar) status = `${tegen.naam} staat klaar. Jij ook?`;
    else status = S.partnerAanwezig ? `${tegen.naam} is verbonden.` : 'Zoek je tegenspeler aan de overkant van de sokkel.';

    return `<section class="scherm start">${rand()}
      <main class="inhoud raster">
        <div class="embleem-groot zweef">${embleem('start')}
          <p class="onderschrift script">Win de penning, open het gordijn</p>
        </div>
        <div class="tekst">
          ${lijnlabel('Zie', 'Spel voor twee', 'Vind')}
          <h1 class="titel"><span class="script">De digitale</span><span class="blokletter">Vossen<br>jacht</span></h1>
          <p class="lead">Jij bent <b class="${S.rol}">${r.naam.toLowerCase()}</b>. ${esc(r.intro)}</p>
          <ol class="regels">
            <li><span>01</span>Kijk over de sokkel naar de muur achter je tegenspeler.</li>
            <li><span>02</span>Los ${S.vragen.length} sporen op. Een fout kost je ${STRAF_MS / 1000} seconden.</li>
            <li><span>03</span>Wie het laatste spoor eerst vindt, wint de penning en opent het gordijn.</li>
          </ol>
          <button class="knop" data-act="klaar" ${S.klaar ? 'disabled' : ''}>${S.klaar ? 'Klaar!' : 'Ik ben klaar'}</button>
          <p class="status">${status}</p>
          <button class="link" data-act="solo">Oefenen zonder tegenspeler</button>
        </div>
      </main></section>`;
  }

  function schermHoorn() {
    return `<section class="scherm hoorn">${rand()}
      <main class="inhoud midden">
        <div class="hoorn-icoon">${E.icoon('jager')}</div>
        <p class="script groot-script">Hoort!</p>
        <h1 class="titel"><span class="blokletter">De jacht wordt geblazen</span></h1>
      </main></section>`;
  }

  function schermAftellen() {
    return `<section class="scherm aftellen">${rand()}
      <main class="inhoud midden"><div class="teller blokletter" id="teller">3</div>
      ${lijnlabel('Zie', 'Klaar voor de jacht', 'Vind')}</main></section>`;
  }

  const spoor = () => {
    const n = S.vragen.length + 1;
    const lijn = rol => {
      const stap = Math.min(S.voortgang[rol], n);
      const p = stap / n * 100;
      const punten = Array.from({ length: n }, (_, k) =>
        `<i class="${k < stap ? 'gehaald' : ''} ${k === n - 1 ? 'laatste' : ''}" style="left:${(k + 1) / n * 100}%"></i>`).join('');
      return `<div class="baan ${rol} ${rol === S.rol ? 'eigen' : ''}">
        <span class="naam">${rol === S.rol ? 'Jij' : D.rollen[rol].naam}</span>
        <div class="pad"><div class="vul" style="width:${p}%"></div>${punten}<span class="loper" style="left:${p}%">${E.icoon(rol)}</span></div>
      </div>`;
    };
    return `<div class="spoor">${lijn(S.rol)}${S.solo ? '' : lijn(ander(S.rol))}</div>`;
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
      const breedte = ((w.b || 100) / som) * 78;
      return `<button class="lijst" data-act="muur" data-werk="${k}" style="--w:${breedte}%;--r:${w.b || 100}/${w.h || 100}">
        <span class="nr blokletter">${twee(n + 1)}</span></button>`;
    }).join('');
    return `<div class="muur">
      <div class="windroos ${r.focusKant}">${r.focusKant === 'links' ? '← ' : ''}grote muur${r.focusKant === 'rechts' ? ' →' : ''}</div>
      <div class="wand">${lijsten}</div><div class="plint"></div>
      <p class="hint">De muur achter je tegenspeler (${r.muurNaam}). Tik op het juiste schilderij.</p></div>`;
  }

  function schermVraag() {
    const q = huidigeVraag();
    const finale = S.i >= S.vragen.length;
    if (q.type === 'keuze' && !S.opties) S.opties = schud(q.opties);
    return `<section class="scherm vraag ${finale ? 'finale' : ''}">${rand(false)}
      <main class="inhoud kolom">
        ${spoor()}
        <div class="vraagkop">
          <span class="spoornr blokletter">${finale ? '★' : twee(S.i + 1)}</span>
          <div>
            <p class="script klein-script">${finale ? 'Het laatste spoor' : `Spoor ${S.i + 1} van ${S.vragen.length}`}</p>
            <h2 class="vraagtekst">${esc(q.tekst)}</h2>
          </div>
        </div>
        ${q.type === 'muur' ? muurSchets() : `<div class="opties">${S.opties.map((o, k) =>
          `<button class="optie" data-act="keuze" data-waarde="${esc(o)}"><span class="blokletter">${'ABCD'[k]}</span>${esc(o)}</button>`).join('')}</div>`}
      </main>
      <div class="straf ${S.straf ? 'aan' : ''}" id="straf">
        <div class="blokletter mis">Mis!</div><p class="script">kijk nog eens goed</p><div class="balk"><span></span></div>
      </div>
    </section>`;
  }

  function schermGevonden() {
    const q = S.vragen[S.i - 1];
    const w = D.werken[q.werk];
    return `<section class="scherm gevonden">${rand(false)}
      <main class="inhoud kolom">
        ${spoor()}
        <div class="raster">
          <figure class="werk">${w.iiif ? `<img src="${beeld(w.iiif, 1000)}" alt="${esc(w.titel)}">` : '<div class="leeg">beeld volgt</div>'}</figure>
          <div class="tekst">
            <p class="script groot-script">Gevonden!</p>
            <h2 class="werktitel">${esc(w.titel)}</h2>
            ${lijnlabel('MSK', esc(w.kunstenaar), w.inv ? esc(w.inv) : 'Gent')}
            <p class="weetje">${esc(q.weetje)}</p>
            <button class="knop" data-act="verder">${S.i < S.vragen.length ? 'Volgend spoor' : 'Naar het laatste spoor'}</button>
          </div>
        </div>
      </main></section>`;
  }

  function schermDraai() {
    const r = D.rollen[S.rol];
    return `<section class="scherm draai">${rand()}
      <main class="inhoud midden">
        <div class="pijl ${r.focusKant}">${r.focusKant === 'links' ? '←' : '→'}</div>
        <p class="script groot-script">het laatste spoor</p>
        <h1 class="titel"><span class="blokletter">Draai je naar ${r.focusKant}</span></h1>
        ${lijnlabel('Zie', 'Kijk naar de grote muur met het gordijn', 'Vind')}
      </main></section>`;
  }

  function schermEinde() {
    const gewonnen = S.einde === S.rol;
    if (gewonnen) {
      const v = D.werken.vossenjacht;
      return `<section class="scherm einde winst">${rand()}
        <main class="inhoud raster">
          <div class="embleem-groot penning">${embleem('winst')}</div>
          <div class="tekst">
            <p class="script groot-script">Gewonnen!</p>
            <h1 class="titel"><span class="blokletter">Jij wint de penning</span></h1>
            ${lijnlabel('Zie', S.rol === 'vos' ? 'De vos ontsnapt' : 'De vos is gevangen', 'Vind')}
            <div class="opdracht">
              <div class="nfc" aria-hidden="true"><span></span><span></span><span></span></div>
              <div><strong class="blokletter">${esc(D.prijs.titel)}</strong><p>${esc(D.prijs.tekst)}</p></div>
            </div>
            <div class="onthulling">
              <img src="${beeld(v.iiif, 1200)}" alt="${esc(v.titel)}">
              <div class="kant links"></div><div class="kant rechts"></div>
            </div>
            <p class="bijschrift"><b>${esc(v.titel)}</b> · ${esc(v.kunstenaar)} — ${esc(D.prijs.weetje)}</p>
            <button class="link" data-act="opnieuw">Nieuwe jacht starten</button>
          </div>
        </main></section>`;
    }
    return `<section class="scherm einde verlies">${rand()}
      <main class="inhoud midden">
        <div class="embleem-klein dof">${embleem('verlies')}</div>
        <p class="script groot-script">${S.rol === 'vos' ? 'de jager was sneller' : 'de vos glipte weg'}</p>
        <h1 class="titel"><span class="blokletter">Het gordijn blijft dicht</span></h1>
        <p class="lead">${D.rollen[S.einde].naam} vond het laatste spoor eerst en wint de penning.</p>
        <button class="knop" data-act="opnieuw">Nog een jacht</button>
      </main></section>`;
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
        if (n > 0) { if (el) el.textContent = n; wacht(tik, 900); }
        else { S.scherm = 'vraag'; toon(); }
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
    if (winnaar === S.rol) window.Hoorn.hallali();
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
