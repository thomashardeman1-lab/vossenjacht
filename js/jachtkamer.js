/*
 * De digitale jachtkamer — de pagina op je gsm
 *
 * De winnaar scant de QR-code op de iPad en komt hier terecht met zijn
 * penning in de link (?p=...). De penning wordt bewaard in de browser van de
 * gsm, zodat je jachtkamer er bij een volgend bezoek nog is.
 *
 * Het geheime werk (MSK.zaal.geheim) wordt hier nooit getoond: dat zie je
 * enkel in de zaal zelf.
 */
(() => {
  'use strict';

  const D = window.MSK;
  const E = window.Embleem;
  const el = document.getElementById('kamer');
  const OPSLAG = 'vossenjacht-penningen';
  const ACHTERGROND = '#1b1a17';

  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const beeld = (id, w = 500) => `https://imagehub.mskgent.be/iiif/2/public%2F${id}.tif/full/${w},/0/default.jpg`;
  const vier = n => String(n).padStart(4, '0');
  const duur = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const datum = t => new Date(t).toLocaleDateString('nl-BE', { day: 'numeric', month: 'long', year: 'numeric' });

  /* ---------- penningen lezen en bewaren ---------- */
  function leesLink() {
    const p = new URLSearchParams(location.search).get('p');
    if (!p) return null;
    try {
      const json = atob(p.replace(/-/g, '+').replace(/_/g, '/'));
      const d = JSON.parse(json);
      if (!['vos', 'jager'].includes(d.r)) return null;
      return { rol: d.r, tijd: +d.t || Date.now(), duur: +d.d || 0, fouten: +d.f || 0, nr: +d.n || 0 };
    } catch (e) { return null; }
  }

  function bewaarde() {
    try { return JSON.parse(localStorage.getItem(OPSLAG)) || []; } catch (e) { return []; }
  }

  function bewaar(p) {
    const lijst = bewaarde();
    if (!lijst.some(x => x.nr === p.nr && x.tijd === p.tijd)) lijst.unshift(p);
    try { localStorage.setItem(OPSLAG, JSON.stringify(lijst)); } catch (e) { /* privévenster: niet erg */ }
    return lijst;
  }

  const nieuw = leesLink();
  const penningen = nieuw ? bewaar(nieuw) : bewaarde();
  const penning = nieuw || penningen[0] || null;

  /* ---------- weetjes per werk ---------- */
  const weetjes = {};
  ['vos', 'jager'].forEach(r => D.vragen[r].forEach(q => { if (q.werk && !weetjes[q.werk]) weetjes[q.werk] = q.weetje; }));
  Object.assign(weetjes, D.zaal.teksten);

  /* ---------- onderdelen ---------- */
  const lijnlabel = (a, b, c) => `<p class="lijnlabel"><span>${a}</span><b>${b}</b><span>${c}</span></p>`;

  function penningKaart(p) {
    const rol = D.rollen[p.rol];
    return `<section class="penningkaart">
      <div class="munt" id="munt">${E.svg({ id: 'kamer', voor: '#f1e6cc', achter: ACHTERGROND })}<span class="glans"></span></div>
      <p class="nummer blokletter">Penning Nº ${vier(p.nr)}</p>
      ${lijnlabel('MSK', 'Vossenjacht', 'Gent')}
      <dl class="feiten">
        <div><dt>Gewonnen als</dt><dd>${E.icoon(p.rol)}${esc(rol.naam)}</dd></div>
        <div><dt>Datum</dt><dd>${datum(p.tijd)}</dd></div>
        <div><dt>Speeltijd</dt><dd>${p.duur ? duur(p.duur) : '–'}</dd></div>
        <div><dt>Fouten</dt><dd>${p.fouten}</dd></div>
      </dl>
      <button class="wallet" data-act="wallet">
        <span class="wallet-icoon" aria-hidden="true"><i></i><i></i><i></i></span>
        <span><small>Toevoegen aan</small>Apple Wallet</span>
      </button>
      <button class="wallet google" data-act="wallet"><span><small>Bewaren in</small>Google Wallet</span></button>
    </section>`;
  }

  function geenPenning() {
    return `<section class="penningkaart leeg">
      <div class="munt dof">${E.svg({ id: 'kamer', voor: '#f1e6cc', achter: ACHTERGROND })}</div>
      <p class="nummer blokletter">Nog geen penning</p>
      <p class="uitleg">Speel de Vossenjacht in de jachtzaal van het MSK Gent. Wie het laatste spoor eerst vindt, wint de penning en bewaart hem hier.</p>
    </section>`;
  }

  function verzameling() {
    if (penningen.length < 2) return '';
    return `<section class="verzameling">
      ${lijnlabel('Zie', `Jouw penningen · ${penningen.length}`, 'Vind')}
      <div class="rij">${penningen.map(p => `
        <div class="mini">${E.svg({ id: 'mini' + p.nr + p.tijd, voor: '#f1e6cc', achter: ACHTERGROND, steek: false })}
          <span class="blokletter">Nº ${vier(p.nr)}</span><small>${datum(p.tijd)}</small></div>`).join('')}
      </div></section>`;
  }

  function werkKaart(k) {
    const w = D.werken[k];
    if (k === D.zaal.geheim) {
      return `<article class="werk geheim">
        <div class="beeld"><span class="blokletter">?</span></div>
        <div class="info"><h3 class="blokletter">Verborgen</h3>
          <p class="maker">Enkel te zien in de zaal</p></div>
      </article>`;
    }
    return `<article class="werk" data-act="open">
      <div class="beeld">${w.iiif ? `<img loading="lazy" src="${beeld(w.iiif)}" alt="${esc(w.titel)}">` : '<span class="blokletter">MSK</span>'}</div>
      <div class="info">
        <h3 class="blokletter">${esc(w.titel)}</h3>
        <p class="maker">${esc(w.kunstenaar)}</p>
        ${weetjes[k] ? `<p class="weetje">${esc(weetjes[k])}</p>` : ''}
      </div>
    </article>`;
  }

  function zaal() {
    return `<section class="zaal">
      <p class="script groot">Wandel rond in</p>
      <h2 class="titel blokletter">${esc(D.zaal.naam)}</h2>
      ${D.zaal.muren.map((m, i) => `
        <div class="muur">
          <div class="muurkop"><span class="blokletter nr">${String(i + 1).padStart(2, '0')}</span><h3 class="blokletter">${esc(m.naam)}</h3></div>
          ${m.werken.map(werkKaart).join('')}
        </div>`).join('')}
    </section>`;
  }

  function walletVoorbeeld(p) {
    const rol = D.rollen[p.rol];
    let qr = '';
    if (typeof window.qrcode === 'function') {
      const q = window.qrcode(0, 'M');
      q.addData(`VOSSENJACHT-${vier(p.nr)}-${p.tijd}`);
      q.make();
      qr = q.createSvgTag({ cellSize: 3, margin: 1, scalable: true });
    }
    return `<div class="laag" data-act="sluit">
      <div class="blad" role="dialog" aria-label="Voorbeeld van je Wallet-pas">
        <div class="pas">
          <div class="pas-kop"><span class="woordmerk">Vossenjacht.</span><span class="pas-veld"><small>Penning</small>Nº ${vier(p.nr)}</span></div>
          <div class="pas-strook">${E.svg({ id: 'pas', voor: '#f1e6cc', achter: '#c44b35', steek: false })}<span class="blokletter">Gewonnen!</span></div>
          <div class="pas-velden">
            <span class="pas-veld"><small>Speler</small>${esc(rol.naam)}</span>
            <span class="pas-veld"><small>Datum</small>${new Date(p.tijd).toLocaleDateString('nl-BE')}</span>
            <span class="pas-veld"><small>Tijd</small>${p.duur ? duur(p.duur) : '–'}</span>
          </div>
          <div class="pas-code">${qr || '<span>code</span>'}</div>
        </div>
        <p class="noot">Zo ziet je penning eruit in Wallet. In dit prototype is het een voorbeeld: voor een echte pas heeft het MSK een Apple- en Google-ontwikkelaarsaccount nodig.</p>
        <button class="knop" data-act="sluit">Sluiten</button>
      </div>
    </div>`;
  }

  /* ---------- pagina ---------- */
  el.innerHTML = `
    <header class="kop">
      <span class="woordmerk">Vossenjacht.</span>
      <span class="badge">MSK</span>
    </header>
    <section class="intro">
      ${lijnlabel('Zie', 'Jouw digitale', 'Vind')}
      <h1 class="titel blokletter">Jacht<br>kamer</h1>
      ${nieuw ? '<p class="script groot">Gewonnen! Hier is je penning</p>' : ''}
    </section>
    ${penning ? penningKaart(penning) : geenPenning()}
    ${verzameling()}
    ${zaal()}
    <footer class="voet">
      <span class="woordmerk">Vossenjacht.</span>
      <p>MSK Gent · Fernand Scribedreef 1 · 9000 Gent</p>
    </footer>`;

  // Penning kantelt mee met je vinger (en met je gsm, waar toegestaan)
  const munt = document.getElementById('munt');
  if (munt) {
    const kantel = (x, y) => { munt.style.transform = `perspective(700px) rotateY(${x * 18}deg) rotateX(${-y * 18}deg)`; munt.style.setProperty('--gx', `${50 + x * 60}%`); };
    munt.addEventListener('pointermove', e => {
      const r = munt.getBoundingClientRect();
      kantel((e.clientX - r.left) / r.width - .5, (e.clientY - r.top) / r.height - .5);
    });
    munt.addEventListener('pointerleave', () => kantel(0, 0));
    window.addEventListener('deviceorientation', e => {
      if (e.gamma == null) return;
      kantel(Math.max(-1, Math.min(1, e.gamma / 45)) * .5, Math.max(-1, Math.min(1, (e.beta - 45) / 45)) * .5);
    });
  }

  document.addEventListener('click', e => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    if (b.dataset.act === 'wallet' && penning) {
      document.body.insertAdjacentHTML('beforeend', walletVoorbeeld(penning));
    } else if (b.dataset.act === 'sluit' && (e.target === b || b.tagName === 'BUTTON')) {
      const laag = document.querySelector('.laag');
      if (laag) laag.remove();
    } else if (b.dataset.act === 'open') {
      b.classList.toggle('open');
    }
  });

  document.addEventListener('error', e => {
    if (e.target.tagName === 'IMG') e.target.remove();
  }, true);
})();
