/* TT Bounce Pop: everything around the rules. Screens, the keyboard and the touch pads, the HUD, the companion button,
   toasts, the level banner, HI-SCORE saving, the title-screen demo (Teddy and Tommy popping together on the
   autopilot), the CPU friend (Froggy on EASY, Foxy on NORMAL) and test hooks on window.game. */
(function () {
  'use strict';
  const BP = window.BP, S = Kit.sound;
  const { DT, W, LEVELS } = BP;
  const $ = (id) => document.getElementById(id);
  const NAME = { teddy: 'TEDDY', tommy: 'TOMMY', froggy: 'FROGGY', foxy: 'FOXY' };
  const EMOJI = { froggy: '🐸', foxy: '🦊' };
  const cls = (who) => (who === 'tommy' ? 'm' : who === 'teddy' ? 't' : 'c');
  const fmt = (n) => n.toLocaleString('en-US');

  // ---------------------------------------------------------------- saving
  const SAVE_KEY = 'bouncePopTT.v1';
  const save = { hi: { easy: 0, normal: 0 }, reached: { easy: 1, normal: 1 }, hero: 'teddy', easy: true };
  try { Object.assign(save, JSON.parse(localStorage.getItem(SAVE_KEY) || '{}')); } catch (e) { /* storage blocked */ }
  const store = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* storage blocked */ } };
  const dkey = () => (G.easy ? 'easy' : 'normal');

  const view = new BP.View($('scene'));
  const faces = Kit.portraits([Kit.roster.get('teddy'), Kit.roster.get('tommy'), Kit.roster.get('froggy'), Kit.roster.get('foxy')], { size: 160 });

  const G = {
    screen: 'title', mode: '1p', hero: save.hero === 'tommy' ? 'tommy' : 'teddy', easy: save.easy !== false,
    startLevel: 0, sim: null, runner: null, demo: null, held: false, keepAwake: false,
    toasts: [], touchOn: false, bannerT: 9, auto: null, cpu: null, doneT: 0, sabotage: null, newHi: false, lastSec: 0,
  };

  // ---------------------------------------------------------------- input
  const keys = new Set();
  const tapped = new Set();   // keys pressed since the last rules step: a quick tap still counts
  const pressed = new Set();  // fresh presses since the last rules step
  const pads = [{}, {}];      // touch pads: which buttons are down, per player
  const padTap = [new Set(), new Set()];

  addEventListener('keydown', (e) => {
    S.init();
    if (/^Arrow|^Space$/.test(e.code)) e.preventDefault();
    const fresh = !keys.has(e.code);
    keys.add(e.code);
    tapped.add(e.code);
    if (fresh && !e.repeat) { pressed.add(e.code); onKey(e.code); }
  });
  addEventListener('keyup', (e) => keys.delete(e.code));
  addEventListener('blur', () => { keys.clear(); tapped.clear(); pressed.clear(); releasePads(); });

  function onKey(code) {
    const sc = G.screen;
    if (code === 'KeyM') return toggleMute();
    if (sc === 'play') {
      if (code === 'KeyT' || code === 'Enter' || code === 'NumpadEnter') callBuddy();
      else if (code === 'KeyP' || code === 'Escape') pause();
    } else if (sc === 'pause') {
      if (code === 'KeyP' || code === 'Escape' || code === 'Space' || code === 'Enter') resume();
    } else if (sc === 'title') {
      if (code === 'Enter' || code === 'Space' || code === 'Digit1' || code === 'Numpad1') startGame('1p', G.hero);
      else if (code === 'Digit2' || code === 'Numpad2') startGame('2p');
      else if (code === 'Digit3' || code === 'Numpad3') startGame('cpu', G.hero);
      else if (code === 'ArrowLeft' || code === 'KeyA') pickHero('teddy');
      else if (code === 'ArrowRight' || code === 'KeyD') pickHero('tommy');
      else if (code === 'KeyE') setEasy(!G.easy);
    } else if (sc === 'over') {
      if (code === 'Enter' || code === 'Space') keepGoing();
      else if (code === 'Escape') toTitle();
    } else if (sc === 'win') {
      if (code === 'Enter' || code === 'Space') playAgain();
      else if (code === 'Escape') toTitle();
    }
  }

  // what every kid wants this step (keys, touch pads, the CPU friend or the autopilot)
  function inputs() {
    const k = (c) => (keys.has(c) || tapped.has(c) ? 1 : 0);
    const p = (c) => pressed.has(c);
    const pad = (i, b) => (pads[i][b] || padTap[i].has(b) ? 1 : 0);
    const out = [];
    const one = (i, mx, my, fire, upFire) => {
      mx += pad(i, 'r') - pad(i, 'l');
      my += pad(i, 'u') - pad(i, 'd');
      out[i] = { mx: Math.max(-1, Math.min(1, mx)), my: Math.max(-1, Math.min(1, my)), fire: !!(fire || padTap[i].has('f')), upFire: !!(upFire || padTap[i].has('u')) };
    };
    if (G.mode === '2p') {
      one(0, k('KeyD') - k('KeyA'), k('KeyW') - k('KeyS'), p('Space') || p('KeyF'), p('KeyW'));
      one(1, k('ArrowRight') - k('ArrowLeft'), k('ArrowUp') - k('ArrowDown'), p('Slash') || p('Period') || p('Numpad0'), p('ArrowUp'));
    } else {
      one(0, (k('KeyD') || k('ArrowRight')) - (k('KeyA') || k('ArrowLeft')), (k('KeyW') || k('ArrowUp')) - (k('KeyS') || k('ArrowDown')),
        p('Space') || p('KeyX') || p('KeyZ') || p('Slash') || p('KeyF'), p('KeyW') || p('ArrowUp'));
      if (G.mode === 'cpu' && G.cpu && G.cpu.sim === G.sim) out[1] = G.cpu.input();
    }
    if (G.auto && G.auto.length && G.auto[0].sim === G.sim) for (const b of G.auto) out[b.p.i] = b.input();
    return out;
  }

  // ---------------------------------------------------------------- touch pads: big buttons in the bottom corners
  function buildPads() {
    const sim = G.sim;
    const ladders = !!(sim && sim.ladders.length);
    const two = G.mode === '2p';
    const btn = (i, k, label, extra = '') => `<button class="tb ${extra}" data-i="${i}" data-k="${k}">${label}</button>`;
    const climb = (i) => (ladders ? `<div class="col">${btn(i, 'u', '▲', 'small')}${btn(i, 'd', '▼', 'small')}</div>` : '');
    const fire = (i, c) => btn(i, 'f', 'FIRE', 'fire ' + c);
    const stack = two && (innerHeight <= 520 || innerWidth <= 640);
    $('touch').classList.toggle('stack', stack);
    if (stack) {
      // a phone on its side: climb, FIRE, then walk, stacked
      const row = (h) => `<div class="row2">${h}</div>`;
      $('padL').innerHTML = (ladders ? row(btn(0, 'u', '▲', 'small') + btn(0, 'd', '▼', 'small')) : '') + fire(0, 't') + row(btn(0, 'l', '◀') + btn(0, 'r', '▶'));
      $('padR').innerHTML = (ladders ? row(btn(1, 'u', '▲', 'small') + btn(1, 'd', '▼', 'small')) : '') + fire(1, 'm') + row(btn(1, 'l', '◀') + btn(1, 'r', '▶'));
    } else if (two) {
      $('padL').innerHTML = btn(0, 'l', '◀') + btn(0, 'r', '▶') + climb(0) + fire(0, 't');
      $('padR').innerHTML = fire(1, 'm') + climb(1) + btn(1, 'l', '◀') + btn(1, 'r', '▶');
    } else {
      $('padL').innerHTML = btn(0, 'l', '◀') + btn(0, 'r', '▶');
      $('padR').innerHTML = climb(0) + fire(0, '');
    }
    G.padKey = `${two}${ladders}${stack}`;
  }
  function releasePads() {
    for (const p of pads) for (const k of Object.keys(p)) p[k] = false;
    for (const b of document.querySelectorAll('.tb.on')) b.classList.remove('on');
  }
  function setupTouch() {
    const t = $('touch');
    const find = (e) => e.target.closest && e.target.closest('.tb');
    const held = new Map();
    t.addEventListener('pointerdown', (e) => {
      const b = find(e);
      if (!b) return;
      e.preventDefault();
      S.init();
      if (!G.touchOn) { G.touchOn = true; layoutHud(); }
      const i = +b.dataset.i, k = b.dataset.k;
      try { b.setPointerCapture(e.pointerId); } catch (err) { /* fine */ }
      held.set(e.pointerId, { i, k, b });
      pads[i][k] = true;
      padTap[i].add(k);
      b.classList.add('on');
    });
    const up = (e) => {
      const h = held.get(e.pointerId);
      if (!h) return;
      held.delete(e.pointerId);
      pads[h.i][h.k] = false;
      h.b.classList.remove('on');
    };
    for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) t.addEventListener(ev, up);
    addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch' && !G.touchOn) { G.touchOn = true; layoutHud(); } }, true);
    if (matchMedia('(pointer: coarse)').matches) G.touchOn = true;
  }

  // ---------------------------------------------------------------- flow
  const SCREENS = ['title', 'pause', 'over', 'win'];
  function show(screen) {
    G.screen = screen;
    for (const id of SCREENS) $(id).classList.toggle('hidden', id !== screen);
    $('hud').classList.toggle('hidden', screen === 'title');
    S.music(screen === 'play' ? 'play' : screen === 'pause' ? 'pause' : screen === 'over' ? 'over' : 'title');
    if (screen !== 'play') { keys.clear(); pressed.clear(); tapped.clear(); releasePads(); }
    layoutHud();
  }

  function startGame(mode, hero, level) {
    S.init();
    BP.sfx.start();
    G.mode = mode;
    if (hero) { G.hero = hero; save.hero = hero; }
    save.easy = G.easy;
    store();
    G.demo = null;
    G.auto = null;
    G.doneT = 0;
    G.newHi = false;
    releasePads();
    clearToasts();
    const L = Math.max(0, Math.min(LEVELS - 1, level ?? G.startLevel));
    G.sim = new BP.Sim({ level: L, mode, hero: G.hero, easy: G.easy, seed: (Math.random() * 1e9) | 0, buddy: Kit.roster.buddyFor(G.hero), sabotage: G.sabotage });
    G.runner = new BP.Runner(G.sim);
    makeCpu();
    view.setGame(G.sim);
    G.sim.events.length = 0;
    levelBanner();
    BP.sfx.ready();
    setupHud();
    view.update(G.sim, 0);
    show('play');
  }

  // Froggy (EASY) or Foxy (NORMAL): the autopilot, a little slower to react and a little less sure where to stand
  function makeCpu() {
    const sim = G.sim;
    G.cpu = sim && sim.mode === 'cpu' ? new BP.Cpu(sim, sim.players[1], sim.easy ? { think: 0.45, noise: 1.2, lazy: 0.5, seed: sim.seed } : { think: 0.25, noise: 0.6, lazy: 0.2, seed: sim.seed }) : null;
  }

  function levelBanner() {
    const def = G.sim.def;
    $('bnNum').textContent = `LEVEL ${def.L + 1} OF ${LEVELS}`;
    $('bnName').textContent = def.name;
    $('bnTip').textContent = def.tip;
    G.bannerT = 0;
  }

  function keepGoing() {
    if (!G.sim || G.screen !== 'over') return;
    G.sim.keepGoing();
    G.sim.events.length = 0;
    clearToasts();
    toast('KEEP GOING! ❤️', { big: true, life: 1.6 });
    show('play');
  }

  function playAgain() { startGame(G.mode, G.hero, 0); }

  function win() {
    const sim = G.sim;
    keepHi();
    const who = G.mode === '2p' ? 'Teddy and Tommy' : G.mode === 'cpu' ? `${cap(G.hero)} and ${cap(sim.players[1].who)}` : cap(G.hero);
    $('winTitle').textContent = 'YOU DID IT!';
    $('winText').textContent = `${who} popped every balloon at all ${LEVELS} places!`;
    $('winScore').textContent = `SCORE ${fmt(sim.score)}`;
    $('winHi').textContent = G.newHi ? `NEW HI-SCORE! ${fmt(save.hi[dkey()])}` : `HI-SCORE ${fmt(save.hi[dkey()])}`;
    show('win');
  }
  const cap = (s) => s[0].toUpperCase() + s.slice(1);

  function keepHi() {
    const sim = G.sim, k = dkey();
    if (!sim) return;
    if (sim.score > (save.hi[k] || 0)) { save.hi[k] = sim.score; G.newHi = true; }
    save.reached[k] = Math.max(save.reached[k] || 1, Math.min(LEVELS, sim.level + 1));
    store();
  }

  function pause() { if (G.screen === 'play') show('pause'); }
  function resume() { if (G.screen === 'pause') show('play'); }

  function toTitle() {
    keepHi();
    clearToasts();
    G.sim = null;
    G.auto = null;
    G.cpu = null;
    startDemo();
    show('title');
    refreshTitle();
  }

  function callBuddy() {
    const sim = G.sim;
    if (!sim || G.screen !== 'play') return;
    S.init();
    if (!sim.callBuddy() && G.mode === '2p' && sim.hi5Cd > 0) toast(`HIGH FIVE IN ${Math.ceil(sim.hi5Cd)}…`, { life: 0.9 });
    for (const ev of sim.events) handle(ev, sim);
    sim.events.length = 0;
  }

  // ---------------------------------------------------------------- the rules' events
  function afterSteps(n) {
    const sim = G.sim;
    if (n > 0) { tapped.clear(); pressed.clear(); padTap[0].clear(); padTap[1].clear(); }
    for (const ev of sim.events) handle(ev, sim);
    sim.events.length = 0;
    if (sim.state === 'over' && G.screen === 'play') {
      keepHi();
      $('overText').textContent = `Out of lives on level ${sim.level + 1}. Keep going: the balloons you popped stay popped!`;
      show('over');
    }
    if (sim.state === 'done' && G.screen === 'play') {
      G.doneT += n * DT;
      if (G.doneT > 3.2) win();
    }
    // the last ten seconds tick
    const sec = Math.ceil(sim.time);
    if (sim.state === 'play' && sec !== G.lastSec && sec <= 10 && sec > 0) BP.sfx.tick();
    G.lastSec = sec;
  }

  function handle(ev, sim, quiet) {
    view.onEvent(ev, sim);
    if (quiet) return;
    const fx = BP.sfx;
    const who = (i) => (sim.players[i] ? sim.players[i].who : G.hero);
    switch (ev.type) {
      case 'level':
        fx.ready();
        levelBanner();
        keepHi();
        setupHud();
        break;
      case 'go': fx.go(); break;
      case 'fire': fx.fire(); break;
      case 'pop': fx.pop(ev.s); break;
      case 'brick': fx.brick(); break;
      case 'ropeEnd': fx.ropeEnd(); break;
      case 'stick': fx.stick(); break;
      case 'land': fx.land(); break;
      case 'drop': fx.drop(); break;
      case 'bonk':
        fx.bonk();
        toast(sim.lives > 0 ? `BOING! ${NAME[ev.who]} SEES STARS! ⭐` : 'OUT OF LIVES! 💔', { big: true, cls: cls(ev.who), life: 1.6 });
        break;
      case 'timeup': fx.timeup(); toast("TIME'S UP! THE CLOCK STARTS AGAIN ⏱️", { big: true, life: 2 }); break;
      case 'take':
        fx.take(ev.kind);
        if (ev.kind === 'double') toast(`🔗 DOUBLE ROPE FOR ${NAME[who(ev.i)]}!`, { cls: cls(who(ev.i)), life: 1.6 });
        else if (ev.kind === 'sticky') toast(`🍯 STICKY ROPE FOR ${NAME[who(ev.i)]}!`, { cls: cls(who(ev.i)), life: 1.6 });
        else if (ev.kind === 'fruit') toast('🍓 YUM! +500', { life: 1.3 });
        break;
      case 'freeze':
        if (ev.by === 'clock') toast('⏰ FREEZE CLOCK! ❄️', { big: true, cls: 'ice', life: 1.8 });
        else { fx.freeze(); toast(`${NAME[ev.by]} SAYS: FREEZE! ❄️`, { big: true, cls: cls(ev.by), life: 2.2 }); }
        break;
      case 'clear':
        fx.clear();
        toast(ev.last ? `ALL ${LEVELS} LEVELS! 🎉` : `LEVEL ${ev.level + 1} CLEAR! +${fmt(ev.bonus)} 🎉`, { big: true, life: 2.6 });
        save.reached[dkey()] = Math.max(save.reached[dkey()] || 1, Math.min(LEVELS, ev.level + 2));
        keepHi();
        break;
      case 'done': fx.done(); break;
      case 'over': fx.over(); break;
      case 'buddyIn': fx.buddyIn(); toast(`${NAME[ev.who]} IS COMING TO HELP!`, { cls: cls(ev.who), life: 1.8 }); break;
      case 'gift': fx.gift(); toast(`${ev.emoji} ${ev.name} FROM ${NAME[ev.from]}!`, { cls: cls(ev.from), life: 2 }); break;
      case 'buddyOut': fx.buddyOut(); toast(`BYE BYE, ${NAME[ev.who]}! 👋`, { cls: cls(ev.who), life: 1.4 }); break;
      case 'highfive': fx.highfive(); toast('✋ HIGH FIVE!', { big: true, life: 1.8 }); break;
    }
  }

  // ---------------------------------------------------------------- the title-screen demo: Teddy and Tommy pop together
  function startDemo(level) {
    level = level ?? Math.floor(Math.random() * LEVELS);
    const sim = new BP.Sim({ level, mode: '2p', seed: (Math.random() * 1e9) | 0, easy: true });
    sim.state = 'play';
    G.demo = { sim, level, t: 0, runner: new BP.Runner(sim), bots: sim.players.map((p, i) => new BP.Cpu(sim, p, { think: 0.3 + i * 0.15, noise: 0.8, lazy: 0.4, seed: 11 + i })) };
    view.setGame(sim);
  }

  function demoAfter() {
    const d = G.demo;
    for (const ev of d.sim.events) handle(ev, d.sim, true);
    d.sim.events.length = 0;
    if (d.sim.state === 'over') d.sim.keepGoing();
    if (d.sim.level !== d.level || d.t > 70) startDemo((d.level + 1 + Math.floor(Math.random() * 5)) % LEVELS);
  }

  // ---------------------------------------------------------------- HUD
  function setupHud() {
    const sim = G.sim;
    const card = (el, p) => {
      el.className = 'pcard ' + cls(p.who);
      el.querySelector('img').src = faces[p.who];
    };
    card($('pcardA'), sim.players[0]);
    $('pcardB').classList.toggle('hidden', sim.players.length < 2);
    if (sim.players[1]) card($('pcardB'), sim.players[1]);
    const btn = $('callBtn'), bud = Kit.roster.buddyFor(G.hero);
    const hi5 = G.mode === '2p';
    btn.classList.toggle('t', !hi5 && bud === 'teddy');
    btn.querySelector('img').src = faces[bud];
    btn.querySelector('img').classList.toggle('hidden', hi5);
    btn.querySelector('.five').classList.toggle('hidden', !hi5);
    buildPads();
    G.hudCache = {};
    updateHud();
    layoutHud();
  }

  function layoutHud() {
    const playing = !$('hud').classList.contains('hidden');
    const h = innerHeight, w = innerWidth;
    const short = h <= 520;
    const touch = playing && G.touchOn && (G.screen === 'play' || G.screen === 'pause');
    $('touch').classList.toggle('hidden', !touch);
    if (G.sim && G.padKey !== `${G.mode === '2p'}${!!G.sim.ladders.length}${G.mode === '2p' && (short || w <= 640)}`) buildPads();
    const wide = short && touch && G.mode === '2p';
    document.body.classList.toggle('wide-hud', wide);
    const top = document.querySelector('#hud .top');
    const r = (el) => el.getBoundingClientRect();
    view.margins.left = 58; // clear of the kit's round buttons in the middle of the left edge
    view.margins.right = w < 900 ? 8 : 12;
    if (playing) {
      view.margins.top = short && !wide ? 6 : Math.min(h * 0.3, r(top).bottom + 6);
      view.margins.bottom = 6;
      if (touch && !short) view.margins.bottom = Math.max(r($('padL')).height, r($('padR')).height) + 18;
      if (wide) {
        // 2 players on a phone on its side: the HUD across the top, a small pad stack each side
        view.margins.left = r($('padL')).right + 12;
        view.margins.right = w - r($('padR')).left + 12;
      } else if (short) {
        // a phone on its side: score cards, lives and the left pad down the left; the buttons and the right pad down the right
        const q = (sel) => r(document.querySelector(sel)).width;
        const sideL = Math.max(q('#hud .side.l'), q('#hud .row.b'), touch ? r($('padL')).width : 0);
        const sideR = Math.max(q('#hud .side.r'), q('#hud .row.a'), touch ? r($('padR')).width : 0);
        view.margins.left = Math.max(58, sideL + 18);
        view.margins.right = Math.max(8, sideR + 18);
      }
    } else {
      view.margins.top = 8;
      view.margins.bottom = 8;
    }
    view.fit(true);
  }
  addEventListener('resize', () => setTimeout(layoutHud, 50));

  function setText(key, el, text, html) {
    if (G.hudCache[key] === text) return;
    G.hudCache[key] = text;
    if (html) el.innerHTML = text; else el.textContent = text;
  }

  function updateHud() {
    const sim = G.sim;
    if (!sim || !G.hudCache) return;
    const [a, b] = sim.players;
    setText('scoreA', $('scoreA'), fmt(a.score));
    if (b) setText('scoreB', $('scoreB'), fmt(b.score));
    const narrow = innerWidth < 480;
    setText('lives', $('livesPill'), sim.lives <= 0 ? '💔' : narrow && sim.lives > 3 ? `❤️×${sim.lives}` : '❤️'.repeat(Math.min(sim.lives, 6)));
    setText('lvl', $('lvlPill'), `LEVEL <b>${sim.level + 1}</b>`, true);
    const secs = Math.max(0, Math.ceil(sim.time));
    setText('time', $('timeNum'), String(secs));
    $('timePill').classList.toggle('low', secs <= 10 && sim.state === 'play');
    const hi = Math.max(save.hi[dkey()] || 0, sim.score);
    setText('hi', $('hiNum'), fmt(hi));
    const ice = sim.freezeT > 0;
    $('icePill').classList.toggle('hidden', !ice);
    if (ice) setText('ice', $('icePill'), `❄️ FROZEN ${Math.ceil(sim.freezeT)}`);
    const B = sim.buddy, here = !!B && B.state !== 'leave';
    const btn = $('callBtn');
    btn.classList.toggle('here', here);
    const bud = Kit.roster.buddyFor(G.hero);
    let label;
    if (G.mode === '2p') {
      const cd = sim.hi5Cd;
      btn.querySelector('.cool').style.background = cd > 0 ? `conic-gradient(rgba(10,8,25,0.65) ${(cd / 2.5) * 360}deg, transparent 0)` : 'none';
      label = 'HIGH FIVE! ✋<small>press T</small>';
    } else {
      btn.querySelector('.cool').style.background = 'none';
      label = here ? `${NAME[bud]} IS HERE!<small>tap to freeze again</small>` : `CALL ${NAME[bud]}<small>press T</small>`;
    }
    setText('call', btn.querySelector('em'), label, true);
    const pk = `${G.mode === '2p'}${!!sim.ladders.length}${G.mode === '2p' && (innerHeight <= 520 || innerWidth <= 640)}`;
    if (pk !== G.padKey) { buildPads(); layoutHud(); }
  }

  // ---------------------------------------------------------------- toasts and the level banner (game time)
  function toast(text, o = {}) {
    const el = document.createElement('div');
    el.className = 'toast' + (o.big ? ' huge' : '') + (o.cls ? ' ' + o.cls : '');
    el.textContent = text;
    $('toasts').appendChild(el);
    G.toasts.push({ el, t: 0, life: o.life || 1.6 });
    const live = G.toasts.filter((q) => !q.done);
    if (live.length > 3) live[0].life = 0;
  }
  function clearToasts() {
    for (const q of G.toasts) q.el.remove();
    G.toasts = [];
  }
  function updateToasts(dt) {
    for (const q of G.toasts) {
      q.t += dt;
      const a = Math.min(1, q.t * 6, (q.life - q.t) * 4);
      q.el.style.opacity = Math.max(0, a);
      q.el.style.transform = `scale(${0.7 + 0.3 * Math.min(1, q.t * 6) + (q.t < 0.25 ? Math.sin(q.t * 12.5) * 0.08 : 0)})`;
      if (q.t >= q.life) { q.el.remove(); q.done = true; }
    }
    G.toasts = G.toasts.filter((q) => !q.done);
  }
  function updateBanner(dt) {
    const sim = G.sim;
    if (G.screen === 'play' && sim) G.bannerT += dt;
    const on = G.screen === 'play' && sim && (sim.state === 'ready' || sim.state === 'play') && G.bannerT < 2.4;
    $('banner').classList.toggle('hidden', !on);
    if (on) $('banner').style.opacity = Math.min(1, (2.4 - G.bannerT) * 3);
  }

  // ---------------------------------------------------------------- the loop
  function sounds(sim) {
    if (G.screen !== 'play' || !view.bounced.length) return;
    BP.sfx.boing(Math.max(...view.bounced));
  }

  function tick(dt) {
    if (G.sim && (G.screen === 'play' || G.screen === 'win' || G.screen === 'over')) {
      if (G.screen === 'play') { const n = G.runner.advance(dt, inputs); afterSteps(n); }
      else { G.runner.advance(dt, () => []); for (const ev of G.sim.events) handle(ev, G.sim, true); G.sim.events.length = 0; }
    } else if (G.screen === 'title' && G.demo) {
      G.demo.t += dt;
      G.demo.runner.advance(dt, () => G.demo.bots.map((b) => b.input()));
      demoAfter();
    }
    const sim = activeSim();
    if (sim) { view.update(sim, dt); sounds(sim); }
    updateHud();
    updateToasts(dt);
    updateBanner(dt);
    view.render();
  }
  const activeSim = () => (G.screen === 'title' ? G.demo && G.demo.sim : G.sim);

  let last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    if (G.held) { view.render(); return; }
    tick(dt);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (!G.keepAwake) { pause(); S.suspend(); }
    } else S.resume();
  });

  // ---------------------------------------------------------------- the title screen
  function refreshTitle() {
    const zh = Kit.lang.is('zh');
    $('logo').innerHTML = zh ? `<span class="b">${BP.TITLE_ZH}</span>` : BP.TITLE.replace(/^(\S+) (\S+) (\S+)$/, '<span class="a">$1</span> <span class="b">$2</span><br><span class="c">$3</span>');
    $('subtitle').textContent = BP.SUBTITLE;
    for (const b of document.querySelectorAll('.kid')) {
      b.querySelector('img').src = faces[b.dataset.hero];
      b.classList.toggle('pick', b.dataset.hero === G.hero);
    }
    $('img2pT').src = faces.teddy;
    $('img2pM').src = faces.tommy;
    const cpu = G.easy ? 'froggy' : 'foxy';
    $('btnCpu').querySelector('span').textContent = `PLAY WITH ${NAME[cpu]} ${EMOJI[cpu]}`;
    for (const b of document.querySelectorAll('#segEasy button')) b.classList.toggle('on', (b.dataset.easy === '1') === G.easy);
    const opts = levelOptions();
    if (!opts.includes(G.startLevel + 1)) G.startLevel = 0;
    $('startNum').textContent = String(G.startLevel + 1);
    $('btnLevel').classList.toggle('hidden', opts.length <= 1);
    const hi = save.hi[dkey()] || 0;
    $('bestLine').textContent = hi ? `HI-SCORE ${fmt(hi)}` : '';
    muteIcons();
  }
  Kit.lang.onChange(() => { if (G.screen === 'title') refreshTitle(); });

  // levels you can start at: 1, every 5th you've reached, and the furthest one
  function levelOptions() {
    const max = Math.max(1, Math.min(LEVELS, save.reached[dkey()] || 1));
    const out = [1];
    for (let n = 5; n < max; n += 5) out.push(n);
    if (max > 1) out.push(max);
    return out;
  }

  function pickHero(id) { G.hero = id; save.hero = id; store(); refreshTitle(); }
  function setEasy(on) { G.easy = on; save.easy = on; store(); refreshTitle(); }

  function toggleMute() {
    S.init();
    S.toggleMute();
    muteIcons();
  }
  function muteIcons() {
    const m = S.isMuted() ? '🔇' : '🔊';
    $('btnMute').textContent = m;
    $('btnMute2').textContent = m;
  }
  S.onMute(muteIcons);

  function wire() {
    const click = (id, fn) => $(id).addEventListener('click', (e) => { S.init(); BP.sfx.click(); fn(e); });
    for (const b of document.querySelectorAll('.kid')) b.addEventListener('click', () => startGame('1p', b.dataset.hero));
    click('btn2p', () => startGame('2p'));
    click('btnCpu', () => startGame('cpu', G.hero));
    for (const b of document.querySelectorAll('#segEasy button')) b.addEventListener('click', () => { S.init(); BP.sfx.click(); setEasy(b.dataset.easy === '1'); });
    click('btnLevel', () => { const o = levelOptions(); G.startLevel = o[(o.indexOf(G.startLevel + 1) + 1) % o.length] - 1; refreshTitle(); });
    click('btnMute', toggleMute);
    click('btnMute2', toggleMute);
    click('btnPause', pause);
    click('btnResume', resume);
    click('btnRestart', () => startGame(G.mode, G.hero, G.sim ? G.sim.level : 0));
    click('btnMenu', toTitle);
    click('btnKeep', keepGoing);
    click('btnOverMenu', toTitle);
    click('btnAgain', playAgain);
    click('btnWinMenu', toTitle);
    $('callBtn').addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); callBuddy(); });
  }

  // ---------------------------------------------------------------- start
  setupTouch();
  wire();
  const q = new URLSearchParams(location.search);
  if (q.has('level')) {
    if (q.has('easy')) G.easy = q.get('easy') === '1';
    startGame(['2p', 'cpu'].includes(q.get('mode')) ? q.get('mode') : '1p', q.get('hero') === 'tommy' ? 'tommy' : G.hero, (+q.get('level') || 1) - 1);
  } else {
    startDemo();
    show('title');
    refreshTitle();
  }
  requestAnimationFrame(frame);

  // ---------------------------------------------------------------- test hooks
  // The Browser pane throttles requestAnimationFrame while hidden, so tests drive the game with step().
  window.game = {
    G, view, faces, save, keys, pads,
    get sim() { return G.sim; },
    // advance the game by `seconds` of game time through the same runner the screen uses; draw: false skips rendering
    step(seconds = 0.5, o = {}) {
      const frames = Math.max(1, Math.round(seconds / (1 / 60)));
      for (let i = 0; i < frames; i++) {
        if (o.draw === false) {
          if (G.sim && G.screen === 'play') afterSteps(G.runner.advance(1 / 60, inputs));
          else if (G.screen === 'title' && G.demo) { G.demo.runner.advance(1 / 60, () => G.demo.bots.map((b) => b.input())); demoAfter(); }
          const sim = activeSim();
          if (sim) view.update(sim, 1 / 60);
          updateToasts(1 / 60);
          updateBanner(1 / 60);
        } else tick(1 / 60);
      }
      updateHud();
      view.render();
      return this.state();
    },
    hold(on = true) { G.held = on; },
    keepAwake() { G.keepAwake = true; },
    start(level = 1, mode = '1p', hero = 'teddy', easy = true) { G.easy = easy; startGame(mode, hero, level - 1); return this.state(); },
    title() { toTitle(); },
    demo(level = 1) { toTitle(); startDemo(level - 1); },
    call() { callBuddy(); },
    pause, resume, keepGoing, playAgain, win,
    showTouch(on = true) { G.touchOn = on; layoutHud(); },
    sabotage(kind) { G.sabotage = kind || null; if (G.sim) G.sim.sab = G.sabotage; },
    state() {
      const s = G.sim;
      return {
        screen: G.screen, mode: G.mode, hero: G.hero, easy: G.easy,
        sim: s && { state: s.state, level: s.level + 1, lives: s.lives, time: Math.ceil(s.time), balloons: s.balloons.length, freeze: +s.freezeT.toFixed(2),
          buddy: s.buddy && `${s.buddy.id}:${s.buddy.state}`, ropes: s.ropes.length,
          players: s.players.map((p) => ({ who: p.who, st: p.st, x: +p.x.toFixed(2), y: +p.y.toFixed(2), power: p.power, score: p.score })) },
      };
    },
    // the headless checks (js/checks.js), the same as `node tools/check.js`
    check(quick = true) { const r = BP.checks.run({ quick }); return { ok: r.ok, lines: r.lines }; },
    prove() { const r = BP.checks.prove(); return { ok: r.ok, lines: r.lines }; },
    // the autopilot plays the real game (screenshots, demos)
    autopilot(on = true) { G.auto = on && G.sim ? G.sim.players.filter((p) => !p.cpu).map((p) => new BP.Cpu(G.sim, p, { think: 0.12 })) : null; },
  };
})();
