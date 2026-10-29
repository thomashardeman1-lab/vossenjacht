/*
 * Geluid — alle geluidseffecten van de Vossenjacht
 * ------------------------------------------------
 * Alles wordt in de browser zelf nagemaakt (Web Audio), zodat er geen
 * bestanden nodig zijn. Echte opnames klinken beter: zet een pad bij
 * MSK.geluiden in data.js (bv. hoorn: 'audio/hoorn.mp3') en dat bestand
 * wordt dan gebruikt in plaats van de nagemaakte versie.
 *
 * Let op: een iPad speelt pas geluid na een aanraking. Geluid.ontgrendel()
 * wordt daarom bij de eerste tik opgeroepen.
 */
window.Geluid = (() => {
  'use strict';

  let ctx = null, uit = null, galm = null;
  let sfeer = null, hartslag = null;
  const opnames = {};

  function context() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    uit = ctx.createGain();
    uit.gain.value = 0.6;
    uit.connect(ctx.destination);
    // galm van een bos / grote zaal
    const n = Math.floor(ctx.sampleRate * 2.2);
    const b = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let k = 0; k < 2; k++) {
      const d = b.getChannelData(k);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3.2);
    }
    galm = ctx.createConvolver();
    galm.buffer = b;
    const g = ctx.createGain();
    g.gain.value = 0.35;
    galm.connect(g).connect(uit);
    return ctx;
  }

  const klaar = () => ctx && ctx.state === 'running';

  function ontgrendel() {
    const c = context();
    if (!c) return;
    if (c.state === 'suspended') c.resume();
    const s = c.createBufferSource();
    s.buffer = c.createBuffer(1, 1, 22050);
    s.connect(c.destination);
    s.start(0);
    const lijst = (window.MSK && window.MSK.geluiden) || {};
    Object.keys(lijst).forEach(naam => {
      if (lijst[naam] && !opnames[naam]) {
        const a = new Audio(lijst[naam]);
        a.preload = 'auto';
        opnames[naam] = a;
      }
    });
  }

  // speel een echte opname als die bestaat; anders false
  function opname(naam, klaarFn) {
    const a = opnames[naam];
    if (!a) return false;
    a.currentTime = 0;
    a.onended = () => klaarFn && klaarFn();
    a.play().catch(() => klaarFn && klaarFn());
    return true;
  }

  /* ---------- bouwstenen ---------- */
  function ruis(seconden) {
    const n = Math.floor(ctx.sampleRate * seconden);
    const b = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const s = ctx.createBufferSource();
    s.buffer = b;
    return s;
  }

  function omhulsel(t, aanzet, piek, duur, naar) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(piek, t + aanzet);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duur);
    g.connect(naar || uit);
    return g;
  }

  /* ---------- de jachthoorn ---------- */
  const GRONDTOON = 73.42; // D2: de natuurhoorn speelt enkel boventonen
  const ACHTSTE = 0.165;
  const ROEP = [[3, 1], [4, 1], [5, 1], [6, 3], [5, 1], [6, 1], [5, 1], [4, 3], [3, 1], [4, 1], [5, 1], [6, 2], [8, 1], [6, 1], [5, 1], [4, 1], [6, 1], [4, 5]];
  const HALLALI = [[4, 1], [4, 1], [4, 1], [6, 3], [5, 1], [6, 1], [8, 2], [6, 1], [8, 5]];
  const DROEVIG = [[6, 3], [5, 3], [4, 3], [3, 8]];
  const KORT = [[4, 1], [6, 1], [8, 4]];

  function hoornNoot(t, f, duur) {
    const o1 = ctx.createOscillator(), o2 = ctx.createOscillator();
    o1.type = 'sawtooth'; o2.type = 'square';
    o1.frequency.setValueAtTime(f * .965, t); o1.frequency.exponentialRampToValueAtTime(f, t + .05);
    o2.frequency.setValueAtTime(f * .968, t); o2.frequency.exponentialRampToValueAtTime(f * 1.003, t + .05);
    const m2 = ctx.createGain(); m2.gain.value = .3;
    const fl = ctx.createBiquadFilter();
    fl.type = 'lowpass'; fl.Q.value = 1.4;
    fl.frequency.setValueAtTime(f * 1.2, t);
    fl.frequency.linearRampToValueAtTime(f * 7, t + .06);
    fl.frequency.exponentialRampToValueAtTime(f * 3.4, t + .3);
    const v = ctx.createGain(), e = t + duur;
    v.gain.setValueAtTime(.0001, t);
    v.gain.exponentialRampToValueAtTime(.3, t + .045);
    v.gain.exponentialRampToValueAtTime(.22, t + .18);
    v.gain.setValueAtTime(.22, Math.max(t + .19, e - .07));
    v.gain.exponentialRampToValueAtTime(.0001, e + .04);
    o1.connect(fl); o2.connect(m2).connect(fl); fl.connect(v); v.connect(uit); v.connect(galm);
    [o1, o2].forEach(o => { o.start(t); o.stop(e + .1); });
  }

  function hoorn(melodie, naam, klaarFn) {
    if (opname(naam, klaarFn)) return;
    // het spel mag nooit blijven hangen op geluid: klaarFn wordt altijd één keer opgeroepen
    let gedaan = false;
    const af = () => { if (!gedaan) { gedaan = true; if (klaarFn) klaarFn(); } };
    const speel = () => {
      let t = ctx.currentTime + .08;
      const start = t;
      melodie.forEach(([n, a]) => { hoornNoot(t, GRONDTOON * n, a * ACHTSTE * .9); t += a * ACHTSTE; });
      setTimeout(af, (t - start + .5) * 1000);
    };
    if (!ctx) { setTimeout(af, 300); return; }
    if (klaar()) { speel(); return; }
    const vangnet = setTimeout(af, 1200);
    ctx.resume().then(() => {
      if (gedaan) return;
      clearTimeout(vangnet);
      klaar() ? speel() : af();
    }).catch(af);
  }

  /* ---------- effecten ---------- */
  // juist: een helder belletje
  function ting() {
    if (opname('juist') || !klaar()) return;
    const t = ctx.currentTime;
    [[1318, 0], [1976, .09]].forEach(([f, d]) => {
      const o = ctx.createOscillator();
      o.type = 'triangle'; o.frequency.value = f;
      o.connect(omhulsel(t + d, .01, .25, .6));
      o.start(t + d); o.stop(t + d + .7);
    });
  }

  // pootstapjes door de bladeren
  function stappen(aantal = 4) {
    if (!klaar()) return;
    const t = ctx.currentTime;
    for (let i = 0; i < aantal; i++) {
      const s = ruis(.12), f = ctx.createBiquadFilter();
      f.type = 'bandpass'; f.frequency.value = 900 + Math.random() * 500; f.Q.value = .8;
      s.connect(f).connect(omhulsel(t + i * .17, .005, .35, .1));
      s.start(t + i * .17);
    }
  }

  // fout: een krassende kraai
  function kraai() {
    if (opname('fout') || !klaar()) return;
    const t = ctx.currentTime;
    [0, .32].forEach(d => {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(620, t + d);
      o.frequency.exponentialRampToValueAtTime(380, t + d + .25);
      const s = ruis(.3);
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass'; f.frequency.value = 1100; f.Q.value = 2;
      const g = omhulsel(t + d, .02, .28, .26);
      const m = ctx.createGain(); m.gain.value = .5;
      o.connect(f); s.connect(m).connect(f); f.connect(g); g.connect(galm);
      o.start(t + d); o.stop(t + d + .3); s.start(t + d);
    });
  }

  // geblaf van de jachthonden
  function blaf() {
    if (opname('blaf') || !klaar()) return;
    const t = ctx.currentTime;
    [0, .28, .5].forEach((d, i) => {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      const f0 = i === 2 ? 520 : 440;
      o.frequency.setValueAtTime(f0, t + d);
      o.frequency.exponentialRampToValueAtTime(f0 * .45, t + d + .14);
      const s = ruis(.16);
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass'; bp.frequency.value = 800; bp.Q.value = 1.2;
      const g = omhulsel(t + d, .01, .4, .16);
      o.connect(bp); s.connect(bp); bp.connect(g); g.connect(galm);
      o.start(t + d); o.stop(t + d + .18); s.start(t + d);
    });
  }

  // mist: een zachte windvlaag
  function mist() {
    if (opname('mist') || !klaar()) return;
    const t = ctx.currentTime;
    const s = ruis(2.6), f = ctx.createBiquadFilter();
    f.type = 'bandpass'; f.Q.value = 1;
    f.frequency.setValueAtTime(300, t);
    f.frequency.exponentialRampToValueAtTime(1600, t + 1.2);
    f.frequency.exponentialRampToValueAtTime(400, t + 2.5);
    s.connect(f).connect(omhulsel(t, .6, .35, 2.5));
    s.start(t);
  }

  // tik bij het aftellen
  function tik(hoog) {
    if (!klaar()) return;
    const t = ctx.currentTime, o = ctx.createOscillator();
    o.type = 'square'; o.frequency.value = hoog ? 1040 : 660;
    o.connect(omhulsel(t, .005, .12, .12));
    o.start(t); o.stop(t + .15);
  }

  // een uil in de verte: "hoe… hoe-hoe"
  function uil() {
    if (!klaar()) return;
    const t = ctx.currentTime;
    [[0, .5], [.75, .22], [1.05, .45]].forEach(([d, l]) => {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(390, t + d);
      o.frequency.linearRampToValueAtTime(360, t + d + l);
      const g = omhulsel(t + d, .08, .06, l, galm);
      o.connect(g); o.start(t + d); o.stop(t + d + l + .1);
    });
  }

  // sfeer: wind door de bomen, af en toe een uil
  function startSfeer() {
    if (!klaar() || sfeer) return;
    const s = ruis(4);
    s.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 420;
    const lfo = ctx.createOscillator(), diepte = ctx.createGain();
    lfo.frequency.value = .09; diepte.gain.value = 240;
    lfo.connect(diepte).connect(f.frequency);
    const g = ctx.createGain();
    g.gain.setValueAtTime(.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(.12, ctx.currentTime + 2);
    s.connect(f).connect(g).connect(uit);
    s.start(); lfo.start();
    const uilen = setInterval(uil, 9000 + Math.random() * 4000);
    sfeer = { s, lfo, g, uilen };
  }

  function stopSfeer() {
    if (!sfeer) return;
    const { s, lfo, g, uilen } = sfeer;
    clearInterval(uilen);
    g.gain.setTargetAtTime(.0001, ctx.currentTime, .4);
    setTimeout(() => { try { s.stop(); lfo.stop(); } catch (e) { /* al gestopt */ } }, 1500);
    sfeer = null;
  }

  // hartslag: de tegenstander is bijna bij het einde
  function startHartslag() {
    if (!klaar() || hartslag) return;
    const slag = () => {
      const t = ctx.currentTime;
      [0, .22].forEach(d => {
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.setValueAtTime(70, t + d);
        o.frequency.exponentialRampToValueAtTime(45, t + d + .15);
        o.connect(omhulsel(t + d, .01, .5, .18));
        o.start(t + d); o.stop(t + d + .2);
      });
    };
    slag();
    hartslag = setInterval(slag, 720);
  }

  function stopHartslag() {
    clearInterval(hartslag);
    hartslag = null;
  }

  function stilte() { stopSfeer(); stopHartslag(); }

  return {
    ontgrendel, startSfeer, stopSfeer, startHartslag, stopHartslag, stilte,
    ting, stappen, kraai, blaf, mist, tik, uil,
    roep: klaarFn => hoorn(ROEP, 'hoorn', klaarFn),
    hallali: () => hoorn(HALLALI, 'hallali'),
    droevig: () => hoorn(DROEVIG, 'verlies'),
    kort: () => hoorn(KORT, 'kort')
  };
})();
