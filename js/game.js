/*
 * De Digitale Vossenjacht — spellogica
 *
 * Elke iPad opent de pagina met zijn rol in de URL:
 *   index.html?rol=vos     (kijkt naar kant 3)
 *   index.html?rol=jager   (kijkt naar kant 1)
 * Zonder ?rol= kies je de rol op het scherm.
 *
 * De vossenjacht van Paul de Vos hangt achter een gordijn. Enkel de winnaar
 * krijgt het schilderij op zijn scherm te zien, en krijgt een jachtkaart met
 * NFC-chip om het gordijn in de zaal te openen.
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
  const RESET_NA_EINDE_MS = 60000;

  const beeld = (id, w = 900) =>
    id ? `https://imagehub.mskgent.be/iiif/2/public%2F${id}.tif/full/${w},/0/default.jpg` : '';
  const ander = rol => (rol === 'vos' ? 'jager' : 'vos');
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const schud = a => a.map(v => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map(v => v[1]);
  const ROMEINS = ['I', 'II', 'III', 'IV', 'V', 'VI'];

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

  const zegel = rol => `<span class="zegel" style="--k:var(--${rol})">${D.rollen[rol].icoon}</span>`;

  const kop = () => `
    <header class="kop">
      <div class="merk">MSK <i>·</i> Gent <span>Jachtzaal</span></div>
      ${S.rol ? `<div class="wie">${zegel(S.rol)}<span>${D.rollen[S.rol].naam}</span></div>` : ''}
    </header>`;

  // Een gesloten gordijn voor een schilderijlijst. Met open=true gaat het open
  // en wordt de vossenjacht zichtbaar (enkel op het winnaarsscherm).
  const gordijn = (open = false) => {
    const v = D.werken.vossenjacht;
    return `<div class="lijst-groot ${open ? 'gaat-open' : ''}">
      <div class="binnen">
        ${open ? `<img src="${beeld(v.iiif, 1600)}" alt="${esc(v.titel)}">` : ''}
        <div class="lambrekijn"></div>
        <div class="doek links"></div><div class="doek rechts"></div>
        ${open ? '' : '<div class="plaatje">Enkel voor de winnaar</div>'}
      </div>
    </div>`;
  };

  /* ---------- schermen ---------- */
  function schermKies() {
    return `<section class="scherm kies">${kop()}
      <main class="midden">
        <p class="bovenschrift">Een spel voor twee spelers</p>
        <h1 class="titel">De Digitale <em>Vossenjacht</em></h1>
        <div class="sierlijn"></div>
        <p class="lead">Welke kant van de sokkel is dit scherm?</p>
        <div class="rolkeuze">
          ${['vos', 'jager'].map(r => `
            <button class="rolkaart" data-act="kies" data-rol="${r}" style="--k:var(--${r})">
              ${zegel(r)}
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

    return `<section class="scherm start">${kop()}
      <main class="raster">
        <div class="beeldkant">${gordijn(false)}
          <p class="onderschrift">Wat hangt er achter het gordijn op de grote muur?</p>
        </div>
        <div class="tekst">
          <p class="bovenschrift">Een spel voor twee spelers</p>
          <h1 class="titel">De Digitale <em>Vossenjacht</em></h1>
          <div class="sierlijn links"></div>
          <p class="lead">Jij bent <b style="color:var(--${S.rol})">${r.naam.toLowerCase()}</b>. ${esc(r.intro)}</p>
          <ol class="regels">
            <li><span>I</span>Kijk over de sokkel naar de muur achter je tegenspeler.</li>
            <li><span>II</span>Los ${S.vragen.length} sporen op. Een fout antwoord kost je ${STRAF_MS / 1000} seconden.</li>
            <li><span>III</span>Wie als eerste het laatste spoor vindt, wint de jachtkaart en mag het gordijn openen.</li>
          </ol>
          <button class="knop" data-act="klaar" ${S.klaar ? 'disabled' : ''}>${S.klaar ? 'Klaar' : 'Ik ben klaar'}</button>
          <p class="status">${status}</p>
          <button class="link" data-act="solo">Oefenen zonder tegenspeler</button>
        </div>
      </main></section>`;
  }

  function schermHoorn() {
    return `<section class="scherm hoorn">
      <div class="hoorn-icoon" aria-hidden="true">
        <svg viewBox="0 0 120 120"><g fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round">
          <circle cx="60" cy="60" r="34"/><circle cx="60" cy="60" r="24"/>
          <path d="M26 60 C 14 60, 8 52, 6 40"/><path d="M94 60 C 104 60, 112 72, 114 92"/>
          <path d="M104 88 L 118 104 M 114 92 L 100 100"/>
        </g></svg>
      </div>
      <p class="bovenschrift">Hoort, de hoorn</p>
      <h1 class="titel">De jacht wordt <em>geblazen</em></h1>
    </section>`;
  }

  function schermAftellen() {
    return `<section class="scherm aftellen"><div class="teller" id="teller">III</div><p class="lead">Klaar voor de jacht…</p></section>`;
  }

  const spoor = () => {
    const n = S.vragen.length + 1;
    const lijn = rol => {
      const stap = Math.min(S.voortgang[rol], n);
      const p = stap / n * 100;
      const punten = Array.from({ length: n }, (_, k) =>
        `<i class="${k < stap ? 'gehaald' : ''} ${k === n - 1 ? 'laatste' : ''}" style="left:${(k + 1) / n * 100}%"></i>`).join('');
      return `<div class="baan ${rol === S.rol ? 'eigen' : ''}" style="--k:var(--${rol})">
        <span class="naam">${rol === S.rol ? 'Jij' : D.rollen[rol].naam}</span>
        <div class="pad"><div class="vul" style="width:${p}%"></div>${punten}<span class="loper" style="left:${p}%">${D.rollen[rol].icoon}</span></div>
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
        <span class="nr">${ROMEINS[n]}</span></button>`;
    }).join('');
    return `<div class="muur">
      <div class="windroos ${r.focusKant}">${r.focusKant === 'links' ? '⟵ ' : ''}grote muur${r.focusKant === 'rechts' ? ' ⟶' : ''}</div>
      <div class="wand">${lijsten}</div><div class="plint"></div>
      <p class="hint">De muur achter je tegenspeler (${r.muurNaam}). Tik op het juiste schilderij.</p></div>`;
  }

  function schermVraag() {
    const q = huidigeVraag();
    const finale = S.i >= S.vragen.length;
    if (q.type === 'keuze' && !S.opties) S.opties = schud(q.opties);
    const nr = finale ? 'Het laatste spoor' : `Spoor ${ROMEINS[S.i]} van ${ROMEINS[S.vragen.length - 1]}`;
    return `<section class="scherm vraag ${finale ? 'finale' : ''}">${kop()}
      ${spoor()}
      <main class="blad">
        <p class="bovenschrift">${nr}</p>
        <h2 class="vraagtekst">${esc(q.tekst)}</h2>
        ${q.type === 'muur' ? muurSchets() : `<div class="opties">${S.opties.map((o, k) =>
          `<button class="optie" data-act="keuze" data-waarde="${esc(o)}"><span>${'ABCD'[k]}</span>${esc(o)}</button>`).join('')}</div>`}
      </main>
      <div class="straf ${S.straf ? 'aan' : ''}" id="straf"><div class="stempel">Mis!</div><p>Kijk nog eens goed naar de muur.</p><div class="balk"><span></span></div></div>
    </section>`;
  }

  function schermGevonden() {
    const q = S.vragen[S.i - 1];
    const w = D.werken[q.werk];
    return `<section class="scherm gevonden">${kop()}${spoor()}
      <main class="raster">
        <figure class="werk">
          <div class="vergulde-lijst">${w.iiif ? `<img src="${beeld(w.iiif, 1000)}" alt="${esc(w.titel)}">` : '<div class="leeg">beeld volgt</div>'}</div>
        </figure>
        <div class="tekst">
          <p class="bovenschrift gevonden-label">Spoor gevonden</p>
          <h2 class="werktitel">${esc(w.titel)}</h2>
          <p class="maker">${esc(w.kunstenaar)}${w.inv ? ` · inv. ${esc(w.inv)}` : ''}</p>
          <div class="sierlijn links"></div>
          <p class="weetje">${esc(q.weetje)}</p>
          <button class="knop" data-act="verder">${S.i < S.vragen.length ? 'Volgend spoor' : 'Naar het laatste spoor'}</button>
        </div>
      </main></section>`;
  }

  function schermDraai() {
    const r = D.rollen[S.rol];
    return `<section class="scherm draai">
      <div class="pijl ${r.focusKant}">${r.focusKant === 'links' ? '⟵' : '⟶'}</div>
      <p class="bovenschrift">Het laatste spoor</p>
      <h1 class="titel">Draai je naar <em>${r.focusKant}</em></h1>
      <p class="lead">Kijk naar de grote muur met het gordijn. Daar ligt het laatste spoor.</p>
    </section>`;
  }

  function schermEinde() {
    const gewonnen = S.einde === S.rol;
    if (gewonnen) {
      const v = D.werken.vossenjacht;
      return `<section class="scherm einde winst">
        <main class="raster">
          <div class="beeldkant">${gordijn(true)}
            <p class="onderschrift"><em>${esc(v.titel)}</em> · ${esc(v.kunstenaar)}</p>
          </div>
          <div class="tekst">
            <p class="bovenschrift">${S.rol === 'vos' ? 'De vos ontsnapt' : 'De vos is gevangen'}</p>
            <h1 class="titel">Gewonnen!</h1>
            <div class="sierlijn links"></div>
            <div class="kaart">
              <div class="chip" aria-hidden="true"><span></span><span></span><span></span></div>
              <div><strong>${esc(D.prijs.titel)}</strong><p>${esc(D.prijs.tekst)}</p></div>
            </div>
            <p class="weetje">${esc(D.prijs.weetje)}</p>
            <button class="link" data-act="opnieuw">Nieuwe jacht starten</button>
          </div>
        </main>
      </section>`;
    }
    return `<section class="scherm einde verlies">
      <main class="midden">
        <div class="klein-gordijn">${gordijn(false)}</div>
        <p class="bovenschrift">${S.rol === 'vos' ? 'De jager was je te snel af' : 'De vos glipte weg'}</p>
        <h1 class="titel">Het gordijn blijft <em>dicht</em></h1>
        <p class="lead">${D.rollen[S.einde].naam} vond het laatste spoor eerst en krijgt de jachtkaart. Wie weet, volgende keer?</p>
        <button class="knop" data-act="opnieuw">Nog een jacht</button>
      </main>
    </section>`;
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
        if (n > 0) { if (el) el.textContent = ROMEINS[n - 1]; wacht(tik, 900); }
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

  // Terug naar het startscherm als niemand het scherm aanraakt.
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
