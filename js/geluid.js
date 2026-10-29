/*
 * Geluid — alle geluidseffecten van de Vossenjacht
 * ------------------------------------------------
 * Alles wordt in de browser zelf nagemaakt (Web Audio), zodat er geen
 * bestanden nodig zijn. Echte opnames klinken nog beter: zet een pad bij
 * MSK.geluiden in data.js (bv. hoorn: 'audio/hoorn.mp3') en dat bestand
 * wordt dan gebruikt in plaats van de nagemaakte versie.
 *
 * Let op: een iPad speelt pas geluid na een aanraking. Geluid.ontgrendel()
 * wordt daarom bij elke tik opgeroepen.
 */
window.Geluid = (() => {
  'use strict';

  let ctx = null, uit = null, galm = null, koperGolf = null, warm = null;
  let sfeer = null, hartslag = null;
  const opnames = {};

  function context() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();

    // licht compressie zodat alles samen niet te hard wordt
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 3;
    comp.connect(ctx.destination);
    uit = ctx.createGain();
    uit.gain.value = 0.7;
    uit.connect(comp);

    // galm van een bos / grote zaal
    const n = Math.floor(ctx.sampleRate * 2.4);
    const b = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let k = 0; k < 2; k++) {
      const d = b.getChannelData(k);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3);
    }
    galm = ctx.createConvolver();
    galm.buffer = b;
    const g = ctx.createGain();
    g.gain.value = 0.3;
    galm.connect(g).connect(uit);

    // klankkleur van koper: sterke boventonen die langzaam afnemen
    const N = 18, re = new Float32Array(N), im = new Float32Array(N);
    const sterkte = [0, 1, .92, .82, .72, .6, .5, .42, .34, .27, .21, .16, .12, .09, .07, .05, .04, .03];
    for (let i = 1; i < N; i++) im[i] = sterkte[i];
    koperGolf = ctx.createPeriodicWave(re, im);

    // zachte verzadiging: maakt koper "scherper" bij luid spelen
    warm = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) { const x = i / 511.5 - 1; warm[i] = Math.tanh(1.8 * x) / Math.tanh(1.8); }
    return ctx;
  }

  const klaar = () => ctx && ctx.state === 'running';

  function ontgrendel() {
    const c = context();
    if (!c) return;
    if (c.state === 'suspended') c.resume();
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
    const n = Math.max(1, Math.floor(ctx.sampleRate * seconden));
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

  function filter(type, f, q) {
    const fl = ctx.createBiquadFilter();
    fl.type = type; fl.frequency.value = f; fl.Q.value = q || 1;
    return fl;
  }

  /* ---------- de trompet / jachthoorn ---------- */
  // Natuurtrompet in Bes: enkel boventonen van de grondtoon.
  const GRONDTOON = 116.54;   // Bes2 → 3 = F4, 4 = Bes4, 5 = D5, 6 = F5, 8 = Bes5
  const ACHTSTE = 0.15;
  const ROEP = [[3, 1], [4, 1], [5, 1], [6, 3], [5, 1], [6, 1], [5, 1], [4, 3], [3, 1], [4, 1], [5, 1], [6, 2], [8, 1], [6, 1], [5, 1], [4, 1], [6, 1], [4, 5]];
  const HALLALI = [[4, 1], [4, 1], [4, 1], [6, 3], [5, 1], [6, 1], [8, 2], [6, 1], [8, 6]];
  const DROEVIG = [[6, 3], [5, 3], [4, 3], [3, 9]];
  const KORT = [[4, 1], [5, 1], [6, 1], [8, 5]];
  const SIGNAAL = [[6, 1], [6, 1], [8, 3]];

  function trompetNoot(t, f, duur, luid = 1) {
    const e = t + duur;
    const voor = ctx.createGain();
    voor.gain.value = .55 * luid;

    // twee licht ontstemde stemmen voor een vollere klank
    const oscs = [0, 6].map(cent => {
      const o = ctx.createOscillator();
      o.setPeriodicWave(koperGolf);
      o.detune.value = cent;
      // de lip "zoekt" de toon: begint iets te laag, schiet even over
      o.frequency.setValueAtTime(f * .93, t);
      o.frequency.exponentialRampToValueAtTime(f * 1.008, t + .035);
      o.frequency.exponentialRampToValueAtTime(f, t + .08);
      o.connect(voor);
      return o;
    });

    // vibrato dat pas na de aanzet begint
    const lfo = ctx.createOscillator(), diepte = ctx.createGain();
    lfo.frequency.value = 5.6;
    diepte.gain.setValueAtTime(0, t);
    diepte.gain.linearRampToValueAtTime(f * .006, t + Math.min(.35, duur));
    lfo.connect(diepte);
    oscs.forEach(o => diepte.connect(o.frequency));

    // het geluid wordt helderder bij de aanzet en doffer bij het loslaten
    const helder = filter('lowpass', f * 1.5, .9);
    helder.frequency.setValueAtTime(f * 1.5, t);
    helder.frequency.exponentialRampToValueAtTime(f * 9, t + .04);
    helder.frequency.exponentialRampToValueAtTime(f * 6, t + .2);
    helder.frequency.setValueAtTime(f * 6, Math.max(t + .21, e - .05));
    helder.frequency.exponentialRampToValueAtTime(f * 2, e + .05);

    const scherp = ctx.createWaveShaper();
    scherp.curve = warm;

    // klankkast: een lichte piek rond 1,2 kHz zoals bij een trompet
    const kast = filter('peaking', 1200, 1.2);
    kast.gain.value = 4;

    const vol = ctx.createGain();
    vol.gain.setValueAtTime(.0001, t);
    vol.gain.exponentialRampToValueAtTime(.38 * luid, t + .025);
    vol.gain.exponentialRampToValueAtTime(.27 * luid, t + .12);
    vol.gain.setValueAtTime(.27 * luid, Math.max(t + .13, e - .06));
    vol.gain.exponentialRampToValueAtTime(.0001, e + .06);

    voor.connect(helder).connect(scherp).connect(kast).connect(vol);
    vol.connect(uit);
    vol.connect(galm);

    // adem / lipgeruis bij de aanzet
    const adem = ruis(.08), ademF = filter('bandpass', f * 3, 1.5);
    adem.connect(ademF).connect(omhulsel(t, .005, .05 * luid, .07));
    adem.start(t);

    oscs.forEach(o => { o.start(t); o.stop(e + .12); });
    lfo.start(t); lfo.stop(e + .12);
  }

  function trompet(melodie, naam, klaarFn, luid = 1) {
    if (opname(naam, klaarFn)) return;
    // het spel mag nooit blijven hangen op geluid: klaarFn wordt altijd één keer opgeroepen
    let gedaan = false;
    const af = () => { if (!gedaan) { gedaan = true; if (klaarFn) klaarFn(); } };
    const speel = () => {
      let t = ctx.currentTime + .06;
      const start = t;
      melodie.forEach(([n, a]) => { trompetNoot(t, GRONDTOON * n, a * ACHTSTE * .88, luid); t += a * ACHTSTE; });
      setTimeout(af, (t - start + .4) * 1000);
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

  /* ---------- korte effecten ---------- */
  // tikje bij elke knop
  function klik() {
    if (!klaar()) return;
    const t = ctx.currentTime, s = ruis(.03);
    s.connect(filter('highpass', 2500)).connect(omhulsel(t, .002, .12, .03));
    s.start(t);
  }

  // juist: een helder belletje
  function ting() {
    if (opname('juist') || !klaar()) return;
    const t = ctx.currentTime;
    [[1318, 0], [1976, .09]].forEach(([f, d]) => {
      const o = ctx.createOscillator();
      o.type = 'triangle'; o.frequency.value = f;
      const g = omhulsel(t + d, .01, .22, .7);
      g.connect(galm);
      o.connect(g);
      o.start(t + d); o.stop(t + d + .8);
    });
  }

  // reeks verdiend: snel oplopend arpeggio
  function jubel() {
    if (!klaar()) return;
    const t = ctx.currentTime;
    [523, 659, 784, 1047, 1319].forEach((f, i) => {
      const o = ctx.createOscillator();
      o.type = 'triangle'; o.frequency.value = f;
      const g = omhulsel(t + i * .07, .008, .18, .5);
      g.connect(galm);
      o.connect(g);
      o.start(t + i * .07); o.stop(t + i * .07 + .55);
    });
  }

  // vos: ritselende pootjes door de bladeren
  function stappen(aantal = 5) {
    if (!klaar()) return;
    const t = ctx.currentTime;
    for (let i = 0; i < aantal; i++) {
      const s = ruis(.1);
      s.connect(filter('bandpass', 900 + Math.random() * 700, .8)).connect(omhulsel(t + i * .14, .004, .3, .09));
      s.start(t + i * .14);
    }
  }

  // jager: paardenhoeven in galop
  function galop() {
    if (!klaar()) return;
    const t = ctx.currentTime;
    [0, .09, .18, .42, .51, .6, .84, .93, 1.02].forEach((d, i) => {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(220 - (i % 3) * 30, t + d);
      o.frequency.exponentialRampToValueAtTime(90, t + d + .06);
      o.connect(omhulsel(t + d, .002, .35, .08));
      o.start(t + d); o.stop(t + d + .1);
      const s = ruis(.04);
      s.connect(filter('bandpass', 1800, 2)).connect(omhulsel(t + d, .002, .12, .04));
      s.start(t + d);
    });
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
      const s = ruis(.3), m = ctx.createGain();
      m.gain.value = .5;
      const f = filter('bandpass', 1100, 2);
      const g = omhulsel(t + d, .02, .3, .26);
      g.connect(galm);
      o.connect(f); s.connect(m).connect(f); f.connect(g);
      o.start(t + d); o.stop(t + d + .3); s.start(t + d);
    });
  }

  // geblaf van de jachthonden
  function blaf(zacht) {
    if (opname('blaf') || !klaar()) return;
    const t = ctx.currentTime, l = zacht ? .4 : 1;
    [0, .26, .48, .9, 1.12].forEach((d, i) => {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      const f0 = [440, 470, 520, 430, 500][i];
      o.frequency.setValueAtTime(f0 * .8, t + d);
      o.frequency.exponentialRampToValueAtTime(f0, t + d + .03);
      o.frequency.exponentialRampToValueAtTime(f0 * .45, t + d + .15);
      const s = ruis(.16);
      const bp = filter('bandpass', 850, 1.2);
      const g = omhulsel(t + d, .01, .42 * l, .17);
      g.connect(galm);
      o.connect(bp); s.connect(bp); bp.connect(g);
      o.start(t + d); o.stop(t + d + .2); s.start(t + d);
    });
  }

  // jachthond die huilt (de jager is klaar)
  function jank() {
    if (!klaar()) return;
    const t = ctx.currentTime, o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(330, t);
    o.frequency.exponentialRampToValueAtTime(560, t + .25);
    o.frequency.setValueAtTime(560, t + .7);
    o.frequency.exponentialRampToValueAtTime(380, t + 1.1);
    const lfo = ctx.createOscillator(), d = ctx.createGain();
    lfo.frequency.value = 6; d.gain.value = 12;
    lfo.connect(d).connect(o.frequency);
    const g = omhulsel(t, .08, .2, 1.15);
    g.connect(galm);
    o.connect(filter('bandpass', 900, 1.5)).connect(g);
    o.start(t); o.stop(t + 1.2); lfo.start(t); lfo.stop(t + 1.2);
  }

  // vos die keft (de vos is klaar)
  function vosroep() {
    if (!klaar()) return;
    const t = ctx.currentTime;
    [0, .3].forEach(d => {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(700, t + d);
      o.frequency.exponentialRampToValueAtTime(1300, t + d + .06);
      o.frequency.exponentialRampToValueAtTime(600, t + d + .18);
      const g = omhulsel(t + d, .01, .22, .2);
      g.connect(galm);
      o.connect(filter('bandpass', 1500, 1.8)).connect(g);
      o.start(t + d); o.stop(t + d + .22);
    });
  }

  // mist: een windvlaag
  function mist() {
    if (opname('mist') || !klaar()) return;
    const t = ctx.currentTime, s = ruis(2.8), f = filter('bandpass', 300, 1);
    f.frequency.setValueAtTime(300, t);
    f.frequency.exponentialRampToValueAtTime(1600, t + 1.2);
    f.frequency.exponentialRampToValueAtTime(400, t + 2.6);
    s.connect(f).connect(omhulsel(t, .6, .4, 2.7));
    s.start(t);
  }

  // whoosh: omdraaien
  function zwiep() {
    if (!klaar()) return;
    const t = ctx.currentTime, s = ruis(.6), f = filter('bandpass', 200, 2);
    f.frequency.setValueAtTime(200, t);
    f.frequency.exponentialRampToValueAtTime(3200, t + .3);
    f.frequency.exponentialRampToValueAtTime(500, t + .55);
    s.connect(f).connect(omhulsel(t, .15, .35, .55));
    s.start(t);
  }

  // trom bij het aftellen
  function trom(laatste) {
    if (!klaar()) return;
    const t = ctx.currentTime, o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(laatste ? 150 : 110, t);
    o.frequency.exponentialRampToValueAtTime(48, t + .25);
    o.connect(omhulsel(t, .004, laatste ? .9 : .7, .35));
    o.start(t); o.stop(t + .4);
    const s = ruis(.15);
    s.connect(filter('bandpass', laatste ? 2200 : 1400, .8)).connect(omhulsel(t, .002, laatste ? .3 : .18, .14));
    s.start(t);
  }

  // de tegenspeler vindt een spoor: geritsel in de verte
  function ver() {
    if (!klaar()) return;
    const t = ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const s = ruis(.08);
      const g = omhulsel(t + i * .12, .005, .06, .08, galm);
      s.connect(filter('bandpass', 1200, 1)).connect(g);
      s.start(t + i * .12);
    }
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
      o.connect(omhulsel(t + d, .08, .07, l, galm));
      o.start(t + d); o.stop(t + d + l + .1);
    });
  }

  // krekels
  function krekel() {
    if (!klaar()) return;
    const t = ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const o = ctx.createOscillator();
      o.type = 'sine'; o.frequency.value = 4300 + Math.random() * 200;
      o.connect(omhulsel(t + i * .07, .005, .025, .05));
      o.start(t + i * .07); o.stop(t + i * .07 + .06);
    }
  }

  // een takje dat kraakt
  function takje() {
    if (!klaar()) return;
    const t = ctx.currentTime;
    [0, .05].forEach(d => {
      const s = ruis(.03);
      s.connect(filter('highpass', 1800)).connect(omhulsel(t + d, .001, .14, .03, galm));
      s.start(t + d);
    });
  }

  /* ---------- achtergrond ---------- */
  // sfeer: wind door de bomen, krekels, af en toe een uil of een takje
  function startSfeer() {
    if (!klaar() || sfeer) return;
    const s = ruis(4);
    s.loop = true;
    const f = filter('lowpass', 420);
    const lfo = ctx.createOscillator(), diepte = ctx.createGain();
    lfo.frequency.value = .09; diepte.gain.value = 240;
    lfo.connect(diepte).connect(f.frequency);
    const g = ctx.createGain();
    g.gain.setValueAtTime(.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(.12, ctx.currentTime + 2);
    s.connect(f).connect(g).connect(uit);
    s.start(); lfo.start();
    const lussen = [
      setInterval(uil, 11000),
      setInterval(() => { if (Math.random() < .7) krekel(); }, 1400),
      setInterval(() => { if (Math.random() < .5) takje(); }, 6000)
    ];
    sfeer = { s, lfo, g, lussen };
  }

  function stopSfeer() {
    if (!sfeer) return;
    const { s, lfo, g, lussen } = sfeer;
    lussen.forEach(clearInterval);
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
    hartslag = setInterval(slag, 700);
  }

  function stopHartslag() {
    clearInterval(hartslag);
    hartslag = null;
  }

  return {
    ontgrendel, startSfeer, stopSfeer, startHartslag, stopHartslag,
    klik, ting, jubel, stappen, galop, kraai, blaf, jank, vosroep, mist, zwiep, trom, ver, uil,
    roep: klaarFn => trompet(ROEP, 'hoorn', klaarFn),
    hallali: () => trompet(HALLALI, 'hallali'),
    droevig: () => trompet(DROEVIG, 'verlies', null, .7),
    kort: () => trompet(KORT, 'kort', null, .8),
    signaal: () => trompet(SIGNAAL, 'signaal', null, .6)
  };
})();
