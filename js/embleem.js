/*
 * Het embleem van de Vossenjacht — ook het ontwerp van de penning (token)
 * die de winnaar krijgt: een afgeronde driehoek met een jachthond en een vos.
 *
 * Gebruik in de browser:  Embleem.svg({ id: 'start' }), Embleem.vos(), Embleem.icoon('jager')
 * Gebruik in Node:        require('./embleem.js').svg({ mono: true })
 */
(function (wereld) {
  'use strict';

  const KLEUR = {
    munt: '#d6e6cf', blauw: '#3f6fd8', groen: '#3d8b42', oranje: '#e2602f',
    room: '#fbf4e6', inkt: '#1c1c1a'
  };

  // driehoek (of veelhoek) met afgeronde hoeken
  function rondeHoeken(punten, r) {
    const n = punten.length;
    let d = '';
    for (let i = 0; i < n; i++) {
      const [px, py] = punten[i];
      const [ax, ay] = punten[(i - 1 + n) % n];
      const [bx, by] = punten[(i + 1) % n];
      const la = Math.hypot(ax - px, ay - py), lb = Math.hypot(bx - px, by - py);
      const s = [px + (ax - px) / la * r, py + (ay - py) / la * r];
      const e = [px + (bx - px) / lb * r, py + (by - py) / lb * r];
      d += `${i ? 'L' : 'M'}${s[0].toFixed(1)} ${s[1].toFixed(1)}Q${px} ${py} ${e[0].toFixed(1)} ${e[1].toFixed(1)}`;
    }
    return d + 'Z';
  }
  const schaal = (punten, f, cx, cy) => punten.map(([x, y]) => [cx + (x - cx) * f, cy + (y - cy) * f]);

  /* ---------- de twee koppen ---------- */
  // jachthond, kijkt naar links (ongeveer 165 x 152)
  function hond(K, lijn = 4) {
    return `<g stroke="${K.inkt}" stroke-width="${lijn}" stroke-linecap="round" stroke-linejoin="round">
      <path fill="${K.munt}" d="M-6 88C-4 78 8 70 28 66L56 60C66 42 90 26 118 24C140 22 156 36 160 56C164 80 158 106 146 124C136 138 120 148 104 150C92 140 80 128 66 120C52 114 30 112 10 110C0 106 -8 98 -6 88Z"/>
      <path fill="${K.munt}" d="M100 34C120 28 140 42 146 68C152 96 144 122 128 126C116 118 110 94 106 72C104 56 100 44 100 34Z"/>
      <path fill="none" d="M56 54C64 47 76 47 84 53M6 104C22 108 38 108 52 104M26 72L20 63M38 68L34 59M18 82L9 78M56 112L50 120M70 120L66 129M84 128L82 137M84 32L78 24M96 28L94 19M118 70L124 74M120 86L126 90"/>
      <ellipse cx="70" cy="66" rx="6" ry="3.5" fill="${K.inkt}" stroke="none"/>
      <ellipse cx="-1" cy="86" rx="7" ry="7.5" fill="${K.inkt}" stroke="none"/>
    </g>`;
  }

  // vos, kijkt naar links (ongeveer 170 x 152)
  function vos(K, lijn = 4) {
    return `<g stroke="${K.inkt}" stroke-width="${lijn}" stroke-linecap="round" stroke-linejoin="round">
      <path fill="${K.oranje}" d="M6 98C18 90 40 84 62 78C78 72 92 62 104 54L118 6C124 0 130 2 134 10L150 52C162 66 168 84 166 104C164 120 158 134 150 146L136 140L128 150L118 138L106 148L98 134L86 142C74 126 62 116 46 112C32 110 18 108 8 104C4 102 4 100 6 98Z"/>
      <path fill="${K.room}" stroke-width="${lijn * .6}" d="M48 112C64 112 80 120 88 134L98 128L106 142L116 132L127 143L136 134C130 116 116 102 96 98C78 96 60 102 48 112Z"/>
      <path fill="${K.room}" stroke="none" d="M121 16L131 44L112 50Z"/>
      <path fill="none" d="M10 104C24 110 34 110 46 111M140 70C146 80 148 92 146 104"/>
      <path fill="${K.inkt}" stroke="none" d="M76 72C82 65 92 65 97 71C90 75 82 76 76 72Z"/>
      <ellipse cx="7" cy="100" rx="6.5" ry="5.5" fill="${K.inkt}" stroke="none"/>
    </g>`;
  }

  /* ---------- de penning ---------- */
  function svg(opties) {
    const o = Object.assign({ id: 'e', tekst: 'VOSSENJACHT', mono: false }, opties || {});
    const K = o.mono
      ? { munt: '#ffffff', blauw: '#1c1c1a', groen: '#1c1c1a', oranje: '#ffffff', room: '#ffffff', inkt: '#1c1c1a' }
      : KLEUR;
    const drie = [[260, 14], [506, 326], [14, 326]];
    const cx = 260, cy = 222;
    return `<svg class="embleem" viewBox="0 0 520 340" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Penning van de Vossenjacht">
  <path d="${rondeHoeken(drie, 48)}" fill="${K.blauw}"/>
  <path d="${rondeHoeken(schaal(drie, .955, cx, cy), 44)}" fill="${K.munt}"${o.mono ? ` stroke="${K.inkt}" stroke-width="3"` : ''}/>
  <path d="${rondeHoeken(schaal(drie, .87, cx, cy), 36)}" fill="none" stroke="${K.groen}" stroke-width="3.5"/>
  <g transform="translate(116 94) scale(.94)">${hond(K)}</g>
  <g transform="translate(184 96) scale(.94)">${vos(K)}</g>
  <text x="260" y="292" text-anchor="middle" font-family="Jost, Futura, 'Century Gothic', 'Trebuchet MS', sans-serif" font-weight="500"
    font-size="44" letter-spacing="3" textLength="286" lengthAdjust="spacingAndGlyphs" fill="${K.inkt}">${o.tekst}</text>
</svg>`;
  }

  // losse mascotte: de vos
  function vosKop(extra = '') {
    return `<svg class="mascotte ${extra}" viewBox="-6 -4 180 160" aria-hidden="true">${vos(KLEUR, 5)}</svg>`;
  }

  // pictogrammen per rol: vos en jachthond
  function icoon(rol) {
    return rol === 'vos'
      ? `<svg class="icoon" viewBox="-6 -4 180 160" aria-hidden="true">${vos(KLEUR, 7)}</svg>`
      : `<svg class="icoon" viewBox="-16 14 182 142" aria-hidden="true">${hond(Object.assign({}, KLEUR, { munt: '#fbf4e6' }), 7)}</svg>`;
  }

  // pootafdruk
  function poot() {
    return `<svg class="poot" viewBox="0 0 40 40" aria-hidden="true"><ellipse cx="20" cy="27" rx="9" ry="8"/>
      <ellipse cx="8" cy="16" rx="4" ry="5"/><ellipse cx="16" cy="9" rx="4" ry="5"/><ellipse cx="24" cy="9" rx="4" ry="5"/><ellipse cx="32" cy="16" rx="4" ry="5"/></svg>`;
  }

  const api = { svg, vos: vosKop, icoon, poot, KLEUR };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else wereld.Embleem = api;
})(typeof window !== 'undefined' ? window : globalThis);
