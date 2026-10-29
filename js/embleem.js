/*
 * Het embleem van de Vossenjacht — ook het ontwerp van de penning (token)
 * die de winnaar krijgt.
 *
 * Een ovale doornenkrans, een jachthoorn, gekruiste pijlen, een schild met
 * een vossenkop, een lint met "VOSSENJACHT" en het monogram MSK. Alles in
 * lijnwerk met een "borduursteek", zodat het eruitziet als kant of borduurwerk.
 *
 * Gebruik in de browser:  Embleem.svg({ id: 'start' })
 * Gebruik in Node:        require('./embleem.js').svg({ voor: '#000', achter: '#fff' })
 */
(function (wereld) {
  'use strict';

  function svg(opties) {
    const o = Object.assign({ id: 'e', voor: '#fff', achter: '#000', steek: true }, opties || {});
    const V = o.voor, A = o.achter, id = o.id;
    const cx = 200, cy = 265, RX = 178, RY = 238;
    const f = n => n.toFixed(1);
    const op = (t, dr) => [cx + (RX + dr) * Math.cos(t), cy + (RY + dr) * Math.sin(t)];

    // twee in elkaar gedraaide ranken rond het ovaal
    const rank = fase => {
      let d = '';
      for (let i = 0; i <= 400; i++) {
        const t = i / 400 * Math.PI * 2;
        const [x, y] = op(t, 7 * Math.sin(17 * t + fase));
        d += (i ? 'L' : 'M') + f(x) + ' ' + f(y);
      }
      return `<path d="${d}Z"/>`;
    };

    // doornen en blaadjes langs de rank
    let doornen = '', blaadjes = '';
    for (let i = 0; i < 68; i++) {
      const t = i / 68 * Math.PI * 2 + 0.04;
      const [x, y] = op(t, 7 * Math.sin(17 * t));
      let nx = Math.cos(t) / RX, ny = Math.sin(t) / RY;
      const l = Math.hypot(nx, ny); nx /= l; ny /= l;
      const tx = -ny, ty = nx, s = (i % 2 ? 1 : -1) * 13;
      doornen += `<path d="M${f(x - tx * 3.5)} ${f(y - ty * 3.5)}L${f(x + nx * s + tx * 2)} ${f(y + ny * s + ty * 2)}L${f(x + tx * 3.5)} ${f(y + ty * 3.5)}"/>`;
      if (i % 6 === 3) {
        const hoek = Math.atan2(ty, tx) * 180 / Math.PI + 35;
        const [bx, by] = op(t, 15);
        blaadjes += `<ellipse cx="${f(bx)}" cy="${f(by)}" rx="9" ry="4" transform="rotate(${f(hoek)} ${f(bx)} ${f(by)})"/>`;
      }
    }

    const sterretje = (x, y, r) =>
      `<path d="M${x - r} ${y}H${x + r}M${x} ${y - r}V${y + r}M${x - r * .7} ${y - r * .7}L${x + r * .7} ${y + r * .7}M${x + r * .7} ${y - r * .7}L${x - r * .7} ${y + r * .7}"/>`;

    // vossenkop (rond 0,0)
    const vosVorm = 'M-48 -38L-36 -92L-12 -50L12 -50L36 -92L48 -38L54 -6L30 10L0 58L-30 10L-54 -6Z';
    const schild = 'M140 178H260V266C260 320 231 346 200 363C169 346 140 320 140 266Z';
    const lint = 'M98 384Q200 412 302 384L309 414Q200 442 91 414Z';
    const staartL = 'M98 384L60 380L76 399L60 417L91 414';
    const staartR = 'M302 384L340 380L324 399L340 417L309 414';

    // vlakken die het net eronder afdekken
    const vlakken = `
      <g fill="${A}">
        <circle cx="200" cy="112" r="34"/>
        <path d="${schild}"/>
        <path d="${lint}"/><path d="${staartL}Z"/><path d="${staartR}Z"/>
        <circle cx="200" cy="468" r="27"/><circle cx="147" cy="462" r="12"/><circle cx="253" cy="462" r="12"/>
      </g>
      <path d="${schild}" fill="url(#${id}-fijn)"/>
      <path d="${vosVorm}" transform="translate(200 270)" fill="${A}"/>`;

    // gekruiste pijlen: achter het schild, dus vóór de vlakken getekend
    const pijlen = `
      <path d="M108 168L296 418"/><path d="M292 168L104 418"/>
      <path d="M100 157L118 164L111 182Z"/><path d="M300 157L282 164L289 182Z"/>
      <path d="M296 418L286 430M296 418L308 424M288 406L278 418M288 406L300 412"/>
      <path d="M104 418L114 430M104 418L92 424M112 406L122 418M112 406L100 412"/>`;

    // al het lijnwerk
    const lijnen = `
      ${rank(0)}${rank(Math.PI)}
      ${doornen}${blaadjes}
      <ellipse cx="${cx}" cy="${cy}" rx="${RX - 24}" ry="${RY - 24}"/>
      <ellipse cx="${cx}" cy="${cy}" rx="${RX - 30}" ry="${RY - 30}"/>
      <!-- jachthoorn -->
      <circle cx="200" cy="112" r="32"/><circle cx="200" cy="112" r="21"/>
      <path d="M229 100C252 88 270 74 284 56"/><path d="M275 47L298 72"/><path d="M279 51C290 56 294 62 294 68"/>
      <path d="M171 124C152 133 138 146 126 162"/><path d="M122 158L131 166"/>
      ${sterretje(132, 92, 8)}${sterretje(268, 120, 7)}
      <circle cx="150" cy="122" r="2.5"/><circle cx="252" cy="88" r="2.5"/>
      <!-- schild met vos -->
      <path d="${schild}"/>
      <g transform="translate(200 270)">
        <path d="${vosVorm}"/>
        <path d="M-33 -79L-22 -53M33 -79L22 -53M0 -50V-32M-30 10L-11 21L0 50L11 21L30 10"/>
        <path d="M-54 -6L-44 -2L-50 6M54 -6L44 -2L50 6"/>
        <ellipse cx="-21" cy="-17" rx="8" ry="3.5" transform="rotate(22 -21 -17)"/>
        <ellipse cx="21" cy="-17" rx="8" ry="3.5" transform="rotate(-22 21 -17)"/>
      </g>
      <!-- lint -->
      <path d="${lint}"/><path d="${staartL}"/><path d="${staartR}"/>
      <!-- monogram en medaillons -->
      <circle cx="200" cy="468" r="25"/><circle cx="200" cy="468" r="20"/>
      <circle cx="147" cy="462" r="10"/><circle cx="253" cy="462" r="10"/>
      ${sterretje(147, 462, 5)}${sterretje(253, 462, 5)}`;

    const tekst = `
      <path id="${id}-boog" d="M104 405Q200 433 296 405" fill="none" stroke="none"/>
      <text font-family="Georgia, 'Times New Roman', serif" font-weight="700" font-size="21" letter-spacing="2.5" fill="${V}">
        <textPath href="#${id}-boog" startOffset="50%" text-anchor="middle">VOSSENJACHT</textPath>
      </text>
      <text x="200" y="473" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-weight="700" font-size="13" letter-spacing="1" fill="${V}">MSK</text>
      <circle cx="200" cy="320" r="5" fill="${V}"/>`;

    // de "borduursteek": fijne puntjes over elke lijn
    const steek = inhoud => o.steek
      ? `<g fill="none" stroke="${A}" stroke-width="1.1" stroke-dasharray="0.6 2.8" stroke-linecap="round" opacity=".6">${inhoud}</g>`
      : '';

    return `<svg class="embleem" viewBox="-14 -14 428 558" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Embleem van de Vossenjacht">
  <defs>
    <pattern id="${id}-net" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <path d="M0 0H9M0 0V9" stroke="${V}" stroke-width=".7" opacity=".5"/>
    </pattern>
    <pattern id="${id}-fijn" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <path d="M0 0H5M0 0V5" stroke="${V}" stroke-width=".6" opacity=".6"/>
    </pattern>
  </defs>
  <ellipse cx="${cx}" cy="${cy}" rx="${RX - 27}" ry="${RY - 27}" fill="url(#${id}-net)"/>
  <g fill="none" stroke="${V}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">${pijlen}</g>
  ${steek(pijlen)}
  ${vlakken}
  <g fill="none" stroke="${V}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">${lijnen}</g>
  ${steek(lijnen)}
  ${tekst}
</svg>`;
  }

  // kleine pictogrammen voor de spelers
  function icoon(rol) {
    if (rol === 'vos') {
      return `<svg class="icoon" viewBox="-60 -100 120 165" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="9" stroke-linejoin="round">
        <path d="M-48 -38L-36 -92L-12 -50L12 -50L36 -92L48 -38L54 -6L30 10L0 58L-30 10L-54 -6Z"/></g>
        <circle cx="0" cy="50" r="8" fill="currentColor"/></svg>`;
    }
    return `<svg class="icoon" viewBox="0 0 120 120" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round">
      <circle cx="55" cy="62" r="30"/><circle cx="55" cy="62" r="17"/><path d="M83 52C96 44 104 34 110 20M102 12L116 30M27 72C16 80 10 90 6 100"/></g></svg>`;
  }

  const api = { svg, icoon };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else wereld.Embleem = api;
})(typeof window !== 'undefined' ? window : globalThis);
