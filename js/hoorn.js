/*
 * De jachthoorn
 * -------------
 * Speelt een fanfare op een nagebootste natuurhoorn (zonder ventielen, dus
 * enkel de natuurtonen van D, zoals een echte trompe de chasse).
 *
 * Wil je een echte opname gebruiken? Zet het pad in data.js bij
 * MSK.geluid.hoorn / MSK.geluid.hallali (bv. 'audio/hoorn.mp3').
 *
 * Let op: iPads spelen pas geluid af na een aanraking. Roep daarom
 * Hoorn.ontgrendel() aan bij de eerste tik (de knop "Ik ben klaar").
 */
window.Hoorn = (() => {
  'use strict';

  const GRONDTOON = 73.42; // D2: de hoorn speelt boventonen hiervan
  const ACHTSTE = 0.165;   // duur van een achtste noot in seconden

  // [boventoon, aantal achtsten] — 3 = A3, 4 = D4, 5 = F#4, 6 = A4, 8 = D5
  const ROEP = [
    [3, 1], [4, 1], [5, 1], [6, 3], [5, 1], [6, 1], [5, 1], [4, 3],
    [3, 1], [4, 1], [5, 1], [6, 2], [8, 1], [6, 1], [5, 1], [4, 1], [6, 1], [4, 5]
  ];
  const HALLALI = [
    [4, 1], [4, 1], [4, 1], [6, 3], [5, 1], [6, 1], [8, 2], [6, 1], [8, 5]
  ];

  let ctx = null, uit = null, galm = null;
  const opnames = {};

  function maakContext() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();

    uit = ctx.createGain();
    uit.gain.value = 0.55;
    uit.connect(ctx.destination);

    // Galm van een grote zaal (of een bos), gemaakt met uitstervende ruis.
    const lengte = Math.floor(ctx.sampleRate * 2.4);
    const buffer = ctx.createBuffer(2, lengte, ctx.sampleRate);
    for (let k = 0; k < 2; k++) {
      const d = buffer.getChannelData(k);
      for (let i = 0; i < lengte; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / lengte, 3.2);
    }
    galm = ctx.createConvolver();
    galm.buffer = buffer;
    const natGeluid = ctx.createGain();
    natGeluid.gain.value = 0.4;
    galm.connect(natGeluid).connect(uit);
    return ctx;
  }

  function ontgrendel() {
    const c = maakContext();
    if (c) {
      if (c.state === 'suspended') c.resume();
      const stil = c.createBufferSource();
      stil.buffer = c.createBuffer(1, 1, 22050);
      stil.connect(c.destination);
      stil.start(0);
    }
    // Opnames vooraf laden en ontgrendelen
    const g = (window.MSK && window.MSK.geluid) || {};
    ['hoorn', 'hallali'].forEach(naam => {
      if (g[naam] && !opnames[naam]) {
        const a = new Audio(g[naam]);
        a.preload = 'auto';
        a.muted = true;
        a.play().then(() => { a.pause(); a.currentTime = 0; a.muted = false; }).catch(() => { a.muted = false; });
        opnames[naam] = a;
      }
    });
  }

  function noot(t, freq, duur) {
    // Twee oscillatoren voor een koperachtige klank
    const o1 = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    o1.type = 'sawtooth';
    o2.type = 'square';
    // De toon "glijdt" even naar de juiste hoogte, zoals bij een echte hoornist
    o1.frequency.setValueAtTime(freq * 0.965, t);
    o1.frequency.exponentialRampToValueAtTime(freq, t + 0.05);
    o2.frequency.setValueAtTime(freq * 0.968, t);
    o2.frequency.exponentialRampToValueAtTime(freq * 1.003, t + 0.05);

    // Licht vibrato
    const lfo = ctx.createOscillator();
    const diepte = ctx.createGain();
    lfo.frequency.value = 5.3;
    diepte.gain.setValueAtTime(0, t);
    diepte.gain.linearRampToValueAtTime(freq * 0.005, t + Math.min(0.4, duur));
    lfo.connect(diepte);
    diepte.connect(o1.frequency);
    diepte.connect(o2.frequency);

    const meng2 = ctx.createGain();
    meng2.gain.value = 0.3;

    // Filter dat even "opengaat" bij de aanzet: dat maakt het koper
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 1.4;
    filter.frequency.setValueAtTime(freq * 1.2, t);
    filter.frequency.linearRampToValueAtTime(freq * 7, t + 0.06);
    filter.frequency.exponentialRampToValueAtTime(freq * 3.4, t + 0.3);

    const volume = ctx.createGain();
    const einde = t + duur;
    volume.gain.setValueAtTime(0.0001, t);
    volume.gain.exponentialRampToValueAtTime(0.3, t + 0.045);
    volume.gain.exponentialRampToValueAtTime(0.22, t + 0.18);
    volume.gain.setValueAtTime(0.22, Math.max(t + 0.19, einde - 0.07));
    volume.gain.exponentialRampToValueAtTime(0.0001, einde + 0.04);

    o1.connect(filter);
    o2.connect(meng2).connect(filter);
    filter.connect(volume);
    volume.connect(uit);
    volume.connect(galm);

    [o1, o2, lfo].forEach(o => { o.start(t); o.stop(einde + 0.1); });
  }

  function speel(melodie) {
    const start = ctx.currentTime + 0.08;
    let t = start;
    melodie.forEach(([boventoon, achtsten]) => {
      const duur = achtsten * ACHTSTE;
      noot(t, GRONDTOON * boventoon, duur * 0.9);
      t += duur;
    });
    return t - start + 0.6; // + uitklinken van de galm
  }

  function blaas(naam, melodie, klaar) {
    const opname = opnames[naam];
    if (opname) {
      opname.currentTime = 0;
      opname.onended = () => klaar && klaar();
      opname.play().catch(() => klaar && klaar());
      return;
    }
    // Het spel mag nooit blijven hangen op geluid: klaar() wordt altijd precies één keer opgeroepen.
    let gedaan = false;
    const af = () => { if (!gedaan) { gedaan = true; if (klaar) klaar(); } };
    const c = maakContext();
    if (!c) { setTimeout(af, 300); return; }
    const start = () => setTimeout(af, speel(melodie) * 1000);
    if (c.state === 'running') { start(); return; }
    const vangnet = setTimeout(af, 1500); // geen geluid toegestaan? dan gewoon verder
    c.resume().then(() => {
      if (gedaan) return;
      clearTimeout(vangnet);
      c.state === 'running' ? start() : af();
    }).catch(af);
  }

  return {
    ontgrendel,
    roep: klaar => blaas('hoorn', ROEP, klaar),
    hallali: klaar => blaas('hallali', HALLALI, klaar)
  };
})();
