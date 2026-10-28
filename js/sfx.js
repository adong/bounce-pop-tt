/* TT Bounce Pop: sound effects, all synthesised with Kit.sound.tone and Kit.sound.hiss (no audio files), so they follow
   the kit's one sound switch. Our own sounds: a zippy "fwip" for the rope, rubbery boings for bounces, pops that go up
   in pitch as the balloons get smaller, a glassy tinkle for glass blocks, a cuckoo-boing when a kid sees stars, icy
   chimes for the freeze. Every effect is silent until Kit.sound.init(). */
(function () {
  'use strict';
  const BP = (window.BP = window.BP || {});
  const S = Kit.sound;
  const { tone, hiss } = S;
  const notes = (list, o = {}) => list.forEach((f, i) => tone({ type: o.type || 'triangle', f, at: (o.at || 0) + i * (o.gap || 0.07), dur: o.dur || 0.16, vol: o.vol || 0.12 }));
  let lastBoing = 0;

  BP.sfx = {
    log: [],
    // the rope zips up
    fire() {
      tone({ type: 'sawtooth', f: 300, to: 1400, dur: 0.16, vol: 0.05, lp: 2200 });
      hiss({ filter: 'bandpass', f: 1500, to: 5000, q: 2, dur: 0.14, vol: 0.05 });
    },
    // a balloon lands: a soft rubbery boing (big ones lower), not too often
    boing(s) {
      const now = performance.now();
      if (now - lastBoing < 90) return;
      lastBoing = now;
      const f = [520, 400, 300, 220][s] || 300;
      tone({ type: 'sine', f: f * 0.8, to: f * 1.25, dur: 0.12, vol: 0.035 });
    },
    // pops: the smaller the balloon, the higher the pop; tiny ones end in a confetti sparkle
    pop(s) {
      const f = [1500, 1100, 800, 560][s] || 800;
      hiss({ filter: 'bandpass', f: f * 2, q: 1.2, dur: 0.06, vol: 0.22 });
      tone({ type: 'sine', f, to: f * 0.45, dur: 0.12, vol: 0.12 });
      if (s === 0) notes([1568, 2093, 2637], { gap: 0.04, vol: 0.04, type: 'sine', at: 0.05, dur: 0.12 });
    },
    brick() {
      notes([2637, 3136, 2349, 2794], { gap: 0.03, vol: 0.05, type: 'sine', dur: 0.2 });
      hiss({ filter: 'highpass', f: 4000, dur: 0.12, vol: 0.06 });
    },
    ropeEnd() { tone({ type: 'square', f: 1300, dur: 0.02, vol: 0.015, lp: 3000 }); },
    stick() { tone({ type: 'sine', f: 300, to: 180, dur: 0.15, vol: 0.08 }); },
    // seeing stars: boing, then a silly cuckoo
    bonk() {
      tone({ type: 'sine', f: 180, to: 700, dur: 0.25, vol: 0.16 });
      tone({ type: 'sine', f: 988, dur: 0.14, vol: 0.08, at: 0.3 });
      tone({ type: 'sine', f: 784, dur: 0.2, vol: 0.08, at: 0.46 });
    },
    land() { tone({ type: 'sine', f: 200, to: 120, dur: 0.06, vol: 0.06 }); },
    drop() { notes([1319, 1760], { gap: 0.06, vol: 0.05, type: 'sine' }); },
    take(kind) {
      if (kind === 'freeze') return BP.sfx.freeze();
      if (kind === 'fruit') { S.coin(6); return; }
      notes([523, 659, 784, 1047, 1319], { gap: 0.05, vol: 0.08, type: 'square', dur: 0.1 });
    },
    // icy chimes going down, and a little shiver
    freeze() {
      notes([2093, 1760, 1568, 1319, 1175], { gap: 0.06, vol: 0.06, type: 'sine', dur: 0.4 });
      hiss({ filter: 'highpass', f: 5000, to: 8000, dur: 0.6, vol: 0.03 });
    },
    tick() { tone({ type: 'sine', f: 1200, dur: 0.04, vol: 0.04 }); },
    timeup() { notes([440, 415, 392], { gap: 0.18, vol: 0.09, type: 'square', dur: 0.2 }); },
    ready() { notes([523, 659], { gap: 0.12, vol: 0.07 }); },
    go() { notes([784, 1047], { gap: 0.08, vol: 0.09 }); },
    clear() { notes([523, 659, 784, 1047, 784, 1047, 1319], { gap: 0.1, dur: 0.24, vol: 0.12 }); },
    done() { notes([523, 659, 784, 1047, 1319, 1568, 2093], { gap: 0.12, dur: 0.3, vol: 0.13 }); },
    over() { notes([392, 370, 349, 330], { gap: 0.22, dur: 0.3, vol: 0.1 }); },
    highfive() {
      hiss({ f: 1800, q: 1.2, dur: 0.07, vol: 0.4 });
      hiss({ f: 2400, q: 1.2, dur: 0.05, vol: 0.2, at: 0.05 });
      notes([659, 880, 1109, 1319], { gap: 0.06, vol: 0.1, at: 0.12 });
    },
    buddyIn() { tone({ type: 'sine', f: 400, to: 1200, dur: 0.35, vol: 0.1 }); hiss({ f: 1200, to: 3000, dur: 0.35, vol: 0.05 }); },
    buddyOut() { tone({ type: 'sine', f: 1200, to: 400, dur: 0.35, vol: 0.08 }); },
    gift() { S.coin(4); notes([1047, 1319], { gap: 0.08, vol: 0.08, at: 0.15 }); },
    click() { S.click(); },
    start() { S.powerup(); },
  };
  // keep a short list of what played (tests check sound in code, never by ear)
  for (const k of Object.keys(BP.sfx)) {
    if (typeof BP.sfx[k] !== 'function') continue;
    const fn = BP.sfx[k];
    BP.sfx[k] = function () { BP.sfx.log.push(k); if (BP.sfx.log.length > 50) BP.sfx.log.shift(); return fn.apply(this, arguments); };
  }
})();
