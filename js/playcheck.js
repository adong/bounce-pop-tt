/* TT Bounce Pop: the play check. Drives the page the way a kid does: real keydown / keyup events on window and pointer
   events on the touch pads (never the rules' inputs or the autopilot), lets the game run through its own runner
   (game.step), and measures where each kid really is on the screen (his head projected through the camera, as drawn).
   - direction: → / D walk right on screen and ← / A left, on all 40 levels; 1P as Teddy and as Tommy, with Froggy,
     and 2P (Teddy's keys move only Teddy, Tommy's only Tommy)
   - ladders: ↑ / W climb up the screen onto the ledge and ↓ / S back down, on every level with a ladder
   - throw: Space, X, ↑ away from a ladder (1P); Space and / each throw their own kid's rope (2P); a tap shorter
     than a frame still throws
   - touch: ◀ ▶ walk, FIRE throws, ▲ climbs; 2P: the left pad is Teddy's, the right pad Tommy's
   - stuck: nothing leaves a kid stuck: a bump (he gets up and walks), letting go of a ladder half way, pause with a
     key held, the ? panel, a lost window focus, a cancelled finger, keep going after running out of lives, the next
     level, the brother's freeze, a high five, the timer running out, a glass block breaking under him, a wall
   game.playCheck() runs it; game.playProve() runs it with the keys mirrored and with a bump that never ends, and
   passes only if both are caught. */
(function () {
  'use strict';
  const BP = window.BP;
  const NAMES = { ArrowRight: 'ArrowRight', ArrowLeft: 'ArrowLeft', ArrowUp: 'ArrowUp', ArrowDown: 'ArrowDown', KeyA: 'a', KeyD: 'd', KeyW: 'w', KeyS: 's', KeyX: 'x', KeyT: 't', KeyP: 'p', Space: ' ', Escape: 'Escape', Slash: '/', Enter: 'Enter' };
  const key = (type, code) => window.dispatchEvent(new KeyboardEvent(type, { code, key: NAMES[code] || code, bubbles: true, cancelable: true }));
  const down = (code) => key('keydown', code);
  const up = (code) => key('keyup', code);
  const tap = (code) => { down(code); up(code); };
  const run = (s) => window.game.step(s, { draw: false });
  const ptr = (el, type, id = 5) => {
    const r = el.getBoundingClientRect();
    el.dispatchEvent(new PointerEvent(type, { clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, pointerId: id, pointerType: 'touch', isPrimary: true, bubbles: true, cancelable: true }));
  };
  const padBtn = (i, k) => document.querySelector(`#touch .tb[data-i="${i}"][data-k="${k}"]`);

  // where kid i is on the screen, as drawn
  function at(i) {
    const g = window.game;
    g.view.shake = 0;
    g.view.update(g.sim, 0);
    return g.view.kidOnScreen(i);
  }
  // hold a key (or a touch button) for a while; how far did the kid go on the screen?
  function nudge(code, i, secs = 0.3) {
    const a = at(i);
    down(code);
    run(secs);
    up(code);
    run(0.05);
    const b = at(i);
    return { dx: b.x - a.x, dy: b.y - a.y };
  }
  function nudgePad(i, k, secs = 0.3) {
    const a = at(i), el = padBtn(i, k);
    if (!el) return { dx: 0, dy: 0, missing: true };
    ptr(el, 'pointerdown');
    run(secs);
    ptr(el, 'pointerup');
    run(0.05);
    const b = at(i);
    return { dx: b.x - a.x, dy: b.y - a.y };
  }
  // stand kid i on the floor at x, nothing able to bump him
  function place(i, x) {
    const p = window.game.sim.players[i];
    Object.assign(p, { x, y: 0, vy: 0, st: 'walk', ladder: null, bonkT: 0 });
  }
  const calm = () => { const s = window.game.sim; s.freezeT = 999; s.ropes = []; };
  const toPlay = () => { const s = window.game.sim; for (let k = 0; k < 200 && s.state !== 'play'; k++) run(0.05); calm(); return s.state === 'play'; };
  const myRopes = (i) => window.game.sim.ropes.filter((r) => r.owner === i).length;

  function playCheck(o = {}) {
    const g = window.game;
    const lines = [], fails = [];
    const check = (name, ok, info) => { lines.push(`${ok ? '✓' : '✗'} ${name}${info ? ': ' + info : ''}`); if (!ok) fails.push(name); };
    g.keepAwake();
    g.sabotage(o.sabotage || null);
    const wasEasy = g.G.easy, wasTouch = g.G.touchOn;
    const N = o.levels || BP.LEVELS;
    try {
      // ---------------------------------------------------------------- direction, every level
      for (const [mode, hero] of [['1p', 'teddy'], ['1p', 'tommy'], ['cpu', 'teddy'], ['2p', 'teddy']]) {
        const bad = [];
        let n = 0;
        for (let L = 1; L <= N; L++) {
          g.start(L, mode, hero, L % 2 === 1);
          run(0.05);
          calm();
          const sets = mode === '2p' ? [[0, 'KeyD', 'KeyA', 1], [1, 'ArrowRight', 'ArrowLeft', 0]] : [[0, 'ArrowRight', 'ArrowLeft'], [0, 'KeyD', 'KeyA']];
          for (const [i, r, l, other] of sets) {
            place(i, BP.W / 2);
            if (other != null) place(other, i ? 3 : 13);
            const ox = other != null ? g.sim.players[other].x : 0;
            const R = nudge(r, i), Lm = nudge(l, i);
            const still = other == null || g.sim.players[other].x === ox;
            n += 2;
            if (!(R.dx > 20 && Lm.dx < -20 && still)) bad.push(`L${L} ${r}/${l}: ${R.dx.toFixed(0)}/${Lm.dx.toFixed(0)}px${still ? '' : ' (moved the other kid)'}`);
          }
        }
        check(`direction ${mode === '2p' ? '2P, each kid his own keys' : mode === 'cpu' ? 'with ' + (g.sim.players[1] || {}).who : '1P ' + hero}: → right, ← left on screen, ${N} levels`, bad.length === 0, bad.length ? bad.slice(0, 3).join('; ') : `${n} presses`);
      }

      // ---------------------------------------------------------------- ladders, every level that has one
      {
        const bad = [];
        let n = 0;
        for (let L = 1; L <= N; L++) {
          const def = BP.levelDef(L - 1);
          if (!def.ladders.length) continue;
          for (const mode of ['1p', '2p']) {
            g.start(L, mode, 'teddy', true);
            run(0.05);
            calm();
            def.ladders.forEach((l, li) => {
              const sets = mode === '2p' ? [[0, 'KeyW', 'KeyS'], [1, 'ArrowUp', 'ArrowDown']] : [[0, li % 2 ? 'KeyW' : 'ArrowUp', li % 2 ? 'KeyS' : 'ArrowDown']];
              for (const [i, u, d] of sets) {
                if (mode === '2p') place(1 - i, i ? 2 : 14);
                place(i, l.x + 0.2);
                const secs = (l.y1 - l.y0) / BP.CLIMB + 0.25;
                const U = nudge(u, i, secs);
                const top = g.sim.players[i];
                const onTop = Math.abs(top.y - l.y1) < 0.01 && top.st === 'walk';
                const D = nudge(d, i, secs);
                const back = Math.abs(g.sim.players[i].y - l.y0) < 0.01 && g.sim.players[i].st === 'walk';
                n++;
                if (!(U.dy < -40 && onTop && D.dy > 40 && back)) bad.push(`L${L} ${mode} kid ${i} ${u}: up ${U.dy.toFixed(0)}px${onTop ? '' : ' (not on the ledge)'}, down ${D.dy.toFixed(0)}px${back ? '' : ' (not back down)'}`);
              }
            });
          }
        }
        check('ladders: ↑ / W climb up the screen onto the ledge, ↓ / S climb back down', bad.length === 0, bad.length ? bad.slice(0, 3).join('; ') : `${n} ladders climbed up and down`);
      }

      // ---------------------------------------------------------------- throwing
      {
        g.start(1, '1p', 'teddy', true);
        toPlay();
        place(0, 4);
        const res = [];
        for (const code of ['Space', 'KeyX', 'ArrowUp', 'KeyW']) {
          g.sim.ropes = [];
          run(0.2);
          tap(code);
          run(1 / 60);
          res.push(myRopes(0) === 1);
        }
        check('1P: Space, X, ↑ and W (no ladder near) throw the rope, even a tap shorter than a frame', res.every(Boolean), res.join(' '));
        g.start(17, '1p', 'teddy', true);
        toPlay();
        const l = g.sim.ladders[0];
        place(0, l.x);
        g.sim.ropes = [];
        down('ArrowUp'); run(0.2); up('ArrowUp'); run(0.05);
        check('1P: ↑ at a ladder climbs instead of throwing', myRopes(0) === 0 && g.sim.players[0].y > 0.3, `y ${g.sim.players[0].y.toFixed(2)}`);
        g.start(1, '2p', 'teddy', true);
        toPlay();
        place(0, 4); place(1, 12);
        tap('Space'); run(1 / 60);
        const a = myRopes(0) === 1 && myRopes(1) === 0;
        g.sim.ropes = [];
        tap('Slash'); run(1 / 60);
        const b = myRopes(0) === 0 && myRopes(1) === 1;
        check('2P: Space throws Teddy\'s rope, / throws Tommy\'s', a && b);
      }

      // ---------------------------------------------------------------- touch
      {
        g.showTouch(true);
        g.start(17, '1p', 'tommy', true);
        toPlay();
        place(0, 9);
        const R = nudgePad(0, 'r'), Lm = nudgePad(0, 'l');
        g.sim.ropes = [];
        ptr(padBtn(0, 'f'), 'pointerdown'); run(1 / 60); ptr(padBtn(0, 'f'), 'pointerup');
        const fired = myRopes(0) === 1;
        place(0, g.sim.ladders[0].x);
        const U = nudgePad(0, 'u', 0.5);
        check('touch 1P: ▶ walks right, ◀ left, FIRE throws, ▲ climbs', R.dx > 20 && Lm.dx < -20 && fired && U.dy < -20, `${R.dx.toFixed(0)}/${Lm.dx.toFixed(0)}px, rope ${fired}, up ${U.dy.toFixed(0)}px`);
        g.start(17, '2p', 'teddy', true);
        toPlay();
        place(0, 9); place(1, 12);
        const T1 = nudgePad(0, 'r'), x1 = g.sim.players[1].x;
        const M1 = nudgePad(1, 'l');
        g.sim.ropes = [];
        ptr(padBtn(1, 'f'), 'pointerdown'); run(1 / 60); ptr(padBtn(1, 'f'), 'pointerup');
        check('touch 2P: the left pad moves Teddy, the right pad Tommy (and throws his rope)', T1.dx > 20 && M1.dx < -20 && g.sim.players[0].x > 9 && x1 === 12 && myRopes(1) === 1 && myRopes(0) === 0);
      }

      // ---------------------------------------------------------------- nothing leaves a kid stuck
      const walks = (i = 0) => { place(i, BP.W / 2); return nudge('ArrowRight', i).dx > 20 || nudge(i ? 'ArrowRight' : 'KeyD', i).dx > 20; };
      const stuck = [];
      const ok = (name, v) => { if (!v) stuck.push(name); return v; };
      {
        // a bump: he sees stars, then gets up and walks
        g.start(2, '1p', 'teddy', true);
        toPlay();
        g.sim.freezeT = 0;
        const p = g.sim.players[0];
        p.safe = 0;
        const b = g.sim.balloons[0];
        Object.assign(b, { x: p.x, y: 1.2, vx: 0, vy: 0 });
        run(1 / 60);
        const bonked = p.st === 'bonk';
        calm();
        down('ArrowRight'); run(BP.BONK_T + 0.3); up('ArrowRight');
        ok('a bump (he gets up and walks)', bonked && p.st === 'walk' && walks());
      }
      {
        // let go of a ladder half way: he drops to the floor and walks
        g.start(17, '1p', 'teddy', true);
        toPlay();
        const l = g.sim.ladders[0], p = g.sim.players[0];
        place(0, l.x);
        down('ArrowUp'); run(0.4); up('ArrowUp');
        const mid = p.st === 'climb' && p.y > 0.5 && p.y < l.y1 - 0.5;
        down('ArrowRight'); run(0.6); up('ArrowRight');
        ok('letting go of a ladder half way', mid && p.st === 'walk' && p.y === 0 && walks());
      }
      {
        // pause with a key held, then play again: nothing keeps walking by itself
        g.start(3, '1p', 'teddy', true);
        toPlay();
        place(0, 8);
        down('ArrowRight'); run(0.1);
        tap('KeyP');
        up('ArrowRight');
        tap('KeyP');
        const x = g.sim.players[0].x;
        run(0.3);
        ok('pause with a key held', g.G.screen === 'play' && g.sim.players[0].x === x && walks());
      }
      {
        // the ? panel opens and closes, a lost window focus with keys held, a cancelled finger
        g.start(3, '1p', 'teddy', true);
        toPlay();
        down('ArrowLeft');
        if (Kit.help) { Kit.help.open(); Kit.help.close(); }
        window.dispatchEvent(new Event('blur'));
        const x = g.sim.players[0].x;
        run(0.3);
        up('ArrowLeft');
        const still = g.sim.players[0].x === x;
        g.showTouch(true);
        const el = padBtn(0, 'l');
        ptr(el, 'pointerdown', 9);
        run(0.1);
        el.dispatchEvent(new PointerEvent('pointercancel', { pointerId: 9, pointerType: 'touch', bubbles: true }));
        const x2 = g.sim.players[0].x;
        run(0.3);
        ok('the ? panel, a lost window focus, a cancelled finger', still && g.sim.players[0].x === x2 && walks());
      }
      {
        // out of lives, keep going: he walks and throws
        g.start(4, '1p', 'teddy', false);
        toPlay();
        g.sim.lives = 1;
        g.sim.freezeT = 0;
        const p = g.sim.players[0];
        p.safe = 0;
        Object.assign(g.sim.balloons[0], { x: p.x, y: 1.2, vx: 0, vy: 0 });
        run(0.1);
        const over = g.G.screen === 'over';
        tap('Enter');
        run(BP.BONK_T + 0.2);
        calm();
        g.sim.balloons[0].x = 1;
        g.sim.ropes = [];
        tap('Space'); run(1 / 60);
        const threw = myRopes(0) === 1;
        ok('keep going after running out of lives', over && g.G.screen === 'play' && threw && walks());
      }
      {
        // the next level: clear this one and carry on
        g.start(1, '1p', 'tommy', true);
        toPlay();
        g.sim.balloons = [];
        run(BP.CLEAR_T + 0.3);
        const next = g.sim.level === 1;
        toPlay();
        g.sim.ropes = [];
        tap('Space'); run(1 / 60);
        ok('the next level', next && walks() && myRopes(0) === 1);
      }
      {
        // the brother's visit and freeze: walk and throw the whole time
        g.start(7, '1p', 'teddy', true);
        toPlay();
        g.sim.freezeT = 0;
        g.sim.players[0].safe = 999;
        tap('KeyT');
        run(1.0);
        const w1 = walks();
        run(2.2);
        const frozen = g.sim.freezeT > 0;
        const w2 = walks();
        g.sim.ropes = [];
        tap('Space'); run(1 / 60);
        ok("the brother's visit and freeze", w1 && frozen && w2 && myRopes(0) === 1);
      }
      {
        // 2P: a high five, then both walk
        g.start(5, '2p', 'teddy', true);
        toPlay();
        tap('KeyT');
        run(1.4);
        place(1, 12);
        ok('a high five', walks(0) && walks(1));
      }
      {
        // the timer runs out: a life goes, the clock starts again, he walks
        g.start(5, '1p', 'teddy', true);
        toPlay();
        g.sim.time = 0.05;
        const lives = g.sim.lives;
        run(0.2);
        ok('the timer running out', g.sim.lives === lives - 1 && g.sim.time > 10 && walks());
      }
      {
        // a glass block breaks under him: he drops and walks
        g.start(9, '1p', 'teddy', true);
        toPlay();
        const k = { x0: 6, x1: 8, y0: 2.9, y1: 3.4, brk: true, gone: false };
        g.sim.blocks.push(k);
        const p = g.sim.players[0];
        Object.assign(p, { x: 7, y: 3.4, st: 'walk' });
        g.sim.breakBlock(k, 0);
        run(0.8);
        ok('a glass block breaking under him', p.st === 'walk' && p.y === 0 && walks());
      }
      {
        // pushing into a wall, then walking back
        g.start(6, '1p', 'teddy', true);
        toPlay();
        place(0, 1);
        nudge('ArrowLeft', 0, 0.6);
        const back = nudge('ArrowRight', 0).dx > 20;
        ok('a wall', g.sim.players[0].x >= BP.KID_HW && back);
      }
      check('nothing leaves a kid stuck', stuck.length === 0, stuck.length ? 'stuck after: ' + stuck.join(', ') : '12 situations');
    } finally {
      for (const c of ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'KeyA', 'KeyD', 'KeyW', 'KeyS']) up(c);
      g.sabotage(null);
      g.G.easy = wasEasy;
      g.showTouch(wasTouch);
      g.title();
    }
    return { ok: fails.length === 0, lines, fails };
  }

  // the fail variant: mirrored keys and a bump that never ends must both be caught
  function playProve() {
    const lines = [];
    const m = playCheck({ sabotage: 'mirror', levels: 3 });
    const s = playCheck({ sabotage: 'stun', levels: 3 });
    const mc = m.fails.some((f) => f.startsWith('direction'));
    const sc = s.fails.includes('nothing leaves a kid stuck');
    lines.push(`${mc ? '✓ caught' : '✗ MISSED'} [mirror] the keys walk the wrong way${mc ? ' → ' + m.fails[0] : ''}`);
    lines.push(`${sc ? '✓ caught' : '✗ MISSED'} [stun] a bumped kid never gets up${sc ? ' → ' + s.lines.find((l) => l.includes('stuck after')) : ''}`);
    return { ok: mc && sc, lines };
  }

  Object.assign(window.game, { playCheck, playProve });
})();
