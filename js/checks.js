/* TT Bounce Pop: the headless check of the rules (no Three.js; node runs it through tools/check.js, the page through
   game.check()). The brief's rules:
   - split: a rope splits a balloon into two of the next size down, moving apart from the same spot; a tiny one pops
     into nothing; one balloon of size s takes exactly 2^(s+1) - 1 ropes to clear, and the points add up
   - bounce: every size bounces back up to its own height, the same at 30, 60 and 120 frames a second (and with a
     jumpy frame rate), and on EASY too (slower, not lower)
   - rope: the rope pops what it touches and nothing it doesn't (edge on, from below, a balloon running into a sticky
     rope, one balloon per rope, frozen balloons too); toy blocks stop it, glass blocks break
   - clear: every level is laid out fairly (no balloon starts inside a block, every ladder stands on something and
     reaches a ledge, room to stand under every block) and the autopilot clears all 40 levels on EASY and NORMAL
     before the timer runs out
   plus the brother's freeze: every balloon stops for 5 seconds, then carries on; a bonked kid is back on his feet.
   prove() runs each check against a broken rule ('split', 'fps', 'thin', 'cage', 'stun') and passes only if each
   broken rule is caught. */
(function () {
  'use strict';
  const BP = window.BP;
  const { W, H, DT, RADIUS, BOUNCE, VX, ROPE_HW, KID_H, LEVELS, PTS, hitsFor } = BP;

  // a level with only the balloons we put there; the kid can't be bumped and nothing drops
  function lab(o = {}) {
    const sim = new BP.Sim({ level: o.level || 0, easy: o.easy ?? false, seed: 3, sabotage: o.sab, noItems: true });
    sim.state = 'play';
    sim.balloons = [];
    sim.blocks = o.blocks || [];
    sim.ladders = [];
    sim.items = [];
    sim.time = 999;
    for (const p of sim.players) p.safe = 1e9;
    return sim;
  }
  const put = (sim, s, x, y, vx = VX, vy = 0) => {
    const b = { id: sim.nextId++, s, x, y, vx, vy, c: 0, peak: 0, top: 0, bounces: 0 };
    sim.balloons.push(b);
    return b;
  };

  // ---------------------------------------------------------------- split sizes and counts
  function split(sab) {
    const out = [];
    for (let s = 1; s <= 3; s++) {
      const sim = lab({ sab });
      const b = put(sim, s, 6, 5, VX, -3);
      const kids = sim.split(b, 0);
      const ok = kids.length === 2 && kids.every((k) => k.s === s - 1 && k.x === 6 && k.y === 5 && k.vy > 0) && kids[0].vx * kids[1].vx < 0 && sim.balloons.length === 2;
      out.push([`size ${s} splits into two of size ${s - 1}, moving apart from the same spot`, ok, kids.map((k) => `${k.s}@${k.x},${k.y} vx ${k.vx.toFixed(1)}`).join(' / ')]);
    }
    {
      const sim = lab({ sab });
      const b = put(sim, 0, 6, 5);
      const kids = sim.split(b, 0);
      const pop = sim.events.find((e) => e.type === 'pop');
      out.push(['a tiny balloon pops into confetti (nothing left)', kids.length === 0 && sim.balloons.length === 0 && pop && pop.s === 0]);
    }
    const want = [1, 3, 7, 15], score = [200, 150 + 2 * 200, 100 + 2 * 150 + 4 * 200, 50 + 2 * 100 + 4 * 150 + 8 * 200];
    for (let s = 0; s <= 3; s++) {
      const sim = lab({ sab });
      put(sim, s, 8, 6);
      let n = 0;
      while (sim.balloons.length && n < 100) { sim.split(sim.balloons[0], 0); n++; }
      out.push([`one size-${s} balloon takes ${want[s]} ropes, worth ${score[s]}`, n === want[s] && hitsFor(s) === want[s] && sim.players[0].score === score[s], `${n} ropes, ${sim.players[0].score} points`]);
    }
    let bad = 0;
    for (let L = 0; L < LEVELS; L++) { const d = BP.levelDef(L); if (d.hits !== d.balloons.reduce((a, b) => a + want[b.s], 0)) bad++; }
    out.push(['every level counts its ropes right (the timer is based on it)', bad === 0]);
    return out;
  }

  // ---------------------------------------------------------------- bounce heights at any frame rate
  function heights(s, frame, easy, sab, jumpy) {
    const sim = lab({ easy, sab });
    sim.blocks = [];
    put(sim, s, 3, RADIUS[s] + 0.01, VX, BP.bounceV(s));
    const run = new BP.Runner(sim);
    const tops = [];
    const r = BP.rng(5);
    let t = 0, last = 0;
    while (t < 16 && tops.length < 5) {
      const dt = jumpy ? 1 / 30 + r() * (1 / 144 - 1 / 30) : frame;
      run.advance(dt, () => []);
      t += dt;
      const b = sim.balloons[0];
      if (b.bounces !== last) { last = b.bounces; tops.push(b.top); }
    }
    return tops;
  }
  function bounce(sab) {
    const out = [];
    for (let s = 0; s <= 3; s++) {
      const runs = { 30: heights(s, 1 / 30, false, sab), 60: heights(s, 1 / 60, false, sab), 120: heights(s, 1 / 120, false, sab), jumpy: heights(s, 0, false, sab, true) };
      const all = Object.values(runs).flat();
      // bounce by bounce, every frame rate gives the very same height
      let spread = 0;
      for (const v of Object.values(runs)) v.forEach((h, i) => { spread = Math.max(spread, Math.abs(h - runs[60][i])); });
      const near = all.every((v) => Math.abs(v - BOUNCE[s]) < 0.02);
      out.push([`size ${s} bounces to ${BOUNCE[s]} at 30, 60, 120 fps and a jumpy frame rate`, all.length >= 16 && Object.values(runs).every((v) => v.length === runs[60].length) && spread < 1e-9 && near,
        Object.entries(runs).map(([k, v]) => `${k}: ${v.map((x) => x.toFixed(4)).join(' ')}`).join(' | ')]);
      const easy = heights(s, 1 / 60, true, sab);
      out.push([`size ${s} bounces just as high on EASY (only slower)`, easy.length >= 4 && easy.every((v) => Math.abs(v - BOUNCE[s]) < 0.02), easy.map((x) => x.toFixed(3)).join(' ')]);
    }
    return out;
  }

  // ---------------------------------------------------------------- the rope hits what it touches
  function throwAndWait(sim, max = 3) {
    const p = sim.players[0];
    sim.fire(p);
    for (let k = 0; k < max / DT && sim.ropes.length; k++) sim.step([]);
  }
  function rope(sab) {
    const out = [];
    const p0 = 8;
    for (const s of [0, 2, 3]) {
      const r = RADIUS[s];
      for (const side of [-1, 1]) {
        const sim = lab({ sab });
        sim.freezeT = 99;
        put(sim, s, p0 + side * (r + ROPE_HW - 0.02), 5);
        throwAndWait(sim);
        const a = sim.balloons.length === (s ? 2 : 0);
        const sim2 = lab({ sab });
        sim2.freezeT = 99;
        put(sim2, s, p0 + side * (r + ROPE_HW + 0.03), 5);
        throwAndWait(sim2);
        const b = sim2.balloons.length === 1 && sim2.balloons[0].s === s;
        out.push([`size ${s}, ${side < 0 ? 'left' : 'right'} side: just touching pops it, just missing doesn't`, a && b]);
      }
    }
    {
      // straight above: it pops the very step the rope's tip reaches the balloon's bottom
      const sim = lab({ sab });
      sim.freezeT = 99;
      const b = put(sim, 2, p0, 8.6);
      sim.fire(sim.players[0]);
      let tipAt = null;
      for (let k = 0; k < 120 && sim.balloons.includes(b); k++) { const before = sim.ropes[0] && sim.ropes[0].tip; sim.step([]); if (!sim.balloons.includes(b)) tipAt = before; }
      const bottom = 8.6 - RADIUS[2];
      out.push(['from below: it pops when the tip reaches it, not before', tipAt != null && tipAt < bottom + ROPE_HW && tipAt + BP.ROPE_SPEED * DT >= bottom - ROPE_HW, tipAt != null ? `tip ${tipAt.toFixed(2)} → bottom ${bottom.toFixed(2)}` : 'never popped']);
    }
    {
      // a sticky rope stays up, and a balloon that drifts into it pops
      const sim = lab({ sab });
      put(sim, 1, 3, 6, VX, 0);
      sim.freezeT = 1.6;
      sim.players[0].power = 'sticky';
      sim.fire(sim.players[0]);
      for (let k = 0; k < 90; k++) sim.step([]);
      const stuck = sim.ropes.length === 1 && sim.ropes[0].stuck;
      let popped = false;
      for (let k = 0; k < 200 && !popped; k++) { sim.step([]); popped = sim.events.some((e) => e.type === 'pop'); sim.events.length = 0; }
      out.push(['a sticky rope stays up and pops a balloon that drifts into it', stuck && popped]);
    }
    {
      // one rope, one balloon: two balloons on the same line, only one splits
      const sim = lab({ sab });
      sim.freezeT = 99;
      put(sim, 1, p0, 4);
      put(sim, 1, p0, 7);
      throwAndWait(sim);
      out.push(['one rope pops one balloon (the lower one)', sim.balloons.length === 3 && sim.balloons.some((b) => b.s === 1 && b.y === 7)]);
    }
    {
      // a toy block stops the rope; a glass block breaks and stops it too
      const sim = lab({ sab, blocks: [{ x0: 7, x1: 9, y0: 5, y1: 5.5, brk: false }] });
      sim.freezeT = 99;
      put(sim, 1, p0, 8);
      throwAndWait(sim);
      const a = sim.balloons.length === 1 && !sim.blocks[0].gone;
      const sim2 = lab({ sab, blocks: [{ x0: 7, x1: 9, y0: 5, y1: 5.5, brk: true }] });
      sim2.freezeT = 99;
      put(sim2, 1, p0, 8);
      throwAndWait(sim2);
      const b = sim2.balloons.length === 1 && sim2.blocks[0].gone;
      out.push(['a toy block stops the rope; a glass block breaks (the balloon above is safe)', a && b]);
    }
    return out;
  }

  // ---------------------------------------------------------------- every level can be cleared
  function layout(L, sab) {
    const d = BP.levelDef(L, sab);
    const bad = [];
    for (const b of d.balloons) {
      const r = RADIUS[b.s];
      if (b.x < r || b.x > W - r || b.y + r > H) bad.push(`balloon ${b.s}@${b.x} outside`);
      for (const k of d.blocks) {
        const dx = b.x - Math.max(k.x0, Math.min(k.x1, b.x)), dy = b.y - Math.max(k.y0, Math.min(k.y1, b.y));
        if (dx * dx + dy * dy < r * r) bad.push(`balloon ${b.s}@${b.x} in a block`);
      }
    }
    for (const k of d.blocks) if (k.y0 < 2.9) bad.push(`block at ${k.x0} too low for a big balloon`);
    const tops = [0];
    for (const l of d.ladders) {
      if (BP.supportAt(d.blocks, l.x, l.y1) !== l.y1) bad.push(`ladder at ${l.x} reaches no ledge`);
      if (BP.supportAt(d.blocks, l.x, l.y0) !== l.y0) bad.push(`ladder at ${l.x} stands on nothing`);
      tops.push(l.y1);
    }
    // gaps between blocks one above the other: none, or room for a big balloon (so nothing gets wedged)
    for (const k of d.blocks) {
      const above = d.blocks.filter((j) => j !== k && j.x1 > k.x0 && j.x0 < k.x1 && j.y0 >= k.y1 - 0.01);
      if (!above.length) continue;
      const gap = Math.min(...above.map((j) => j.y0)) - k.y1;
      if (gap > 0.01 && gap < 2 * RADIUS[3] + 0.2) bad.push(`a ${gap.toFixed(1)} gap over the block at ${k.x0} could wedge a big balloon`);
    }
    // headroom: a kid standing on the floor or a ledge never touches a block above him
    for (const k of d.blocks) for (const j of d.blocks) {
      if (j === k || !tops.includes(k.y1)) continue;
      if (j.x1 > k.x0 && j.x0 < k.x1 && j.y0 >= k.y1 && j.y0 < k.y1 + KID_H + 0.3) bad.push(`no room to stand under the block at ${j.x0}`);
    }
    return bad;
  }
  function play(L, easy, sab) {
    const sim = new BP.Sim({ level: L, easy, seed: 101 + L, sabotage: sab });
    const cpu = new BP.Cpu(sim, sim.players[0], { think: 0.1 });
    let steps = 0, bonks = 0, timeups = 0;
    const max = (sim.timeMax + 10) / DT;
    while (steps < max && sim.state !== 'clear' && sim.state !== 'done') {
      sim.step([cpu.input()]);
      steps++;
      for (const e of sim.events) { if (e.type === 'bonk') bonks++; if (e.type === 'timeup') timeups++; }
      sim.events.length = 0;
      if (sim.state === 'over') sim.keepGoing();
    }
    return { cleared: (sim.state === 'clear' || sim.state === 'done') && timeups === 0, secs: steps * DT, of: sim.timeMax, bonks };
  }
  function clear(sab, quick, levels) {
    const out = [];
    const list = levels || [...Array(LEVELS).keys()].filter((L) => !quick || L % 4 === 0 || L === LEVELS - 1);
    const bad = list.flatMap((L) => layout(L, sab).map((m) => `level ${L + 1}: ${m}`));
    out.push([`every level is laid out fairly (${list.length} levels)`, bad.length === 0, bad.slice(0, 4).join('; ')]);
    for (const easy of [true, false]) {
      const res = list.map((L) => ({ L, ...play(L, easy, sab) }));
      const fails = res.filter((r) => !r.cleared);
      const worst = res.reduce((a, r) => Math.max(a, r.secs / r.of), 0);
      const bonks = res.reduce((a, r) => a + r.bonks, 0);
      out.push([`the autopilot clears ${list.length === LEVELS ? 'all ' : ''}${list.length} levels on ${easy ? 'EASY' : 'NORMAL'} before the time runs out`, fails.length === 0,
        fails.length ? `not cleared: ${fails.map((r) => r.L + 1).join(', ')}` : `slowest used ${(worst * 100).toFixed(0)}% of its time; ${bonks} bumps in all`]);
    }
    return out;
  }

  // ---------------------------------------------------------------- the brother's freeze, and nobody stays stunned
  function helpers(sab) {
    const out = [];
    {
      const sim = new BP.Sim({ level: 6, easy: true, seed: 9, sabotage: sab, noItems: true });
      sim.state = 'play';
      sim.players[0].safe = 1e9;
      sim.callBuddy();
      let at = null;
      for (let k = 0; k < 6 / DT && at == null; k++) { sim.step([]); if (sim.events.some((e) => e.type === 'freeze')) at = sim.t; sim.events.length = 0; }
      const snap = sim.balloons.map((b) => [b.x, b.y]);
      for (let k = 0; k < 4.9 / DT; k++) sim.step([]);
      const still = sim.balloons.every((b, i) => b.x === snap[i][0] && b.y === snap[i][1]);
      for (let k = 0; k < 0.3 / DT; k++) sim.step([]);
      const moving = sim.balloons.some((b, i) => b.x !== snap[i][0] || b.y !== snap[i][1]);
      out.push(['the brother freezes every balloon for 5 seconds, then they carry on', at != null && still && moving]);
      sim.callBuddy();
      sim.callBuddy();
      let n = 0;
      for (let k = 0; k < 12 / DT; k++) { sim.step([]); n += sim.events.filter((e) => e.type === 'freeze').length; sim.events.length = 0; }
      out.push(['call him again and again: each call is one more freeze', n === 2, `${n} freezes`]);
    }
    {
      const sim = lab({ sab });
      const p = sim.players[0];
      p.safe = 0;
      put(sim, 2, p.x, 1.2, 0, 0);
      sim.step([]);
      const bonked = p.st === 'bonk';
      sim.balloons = [];
      put(sim, 0, 1, 9);
      sim.freezeT = 99;
      for (let k = 0; k < (BP.BONK_T + 0.2) / DT; k++) sim.step([]);
      const x0 = p.x;
      for (let k = 0; k < 0.3 / DT; k++) sim.step([{ mx: 1 }]);
      out.push(['a bumped kid sees stars, then walks again (not stuck)', bonked && p.st === 'walk' && p.x > x0 + 0.5, `${p.st}, moved ${(p.x - x0).toFixed(2)}`]);
    }
    return out;
  }

  function report(groups) {
    const lines = [], fails = [];
    for (const [name, rows] of groups) {
      lines.push(`— ${name}`);
      for (const [label, ok, info] of rows) {
        lines.push(`${ok ? '✓' : '✗'} ${label}${info ? ': ' + info : ''}`);
        if (!ok) fails.push(label);
      }
    }
    return { ok: fails.length === 0, lines, fails };
  }

  BP.checks = {
    run(o = {}) {
      return report([['split sizes and counts', split()], ['bounce heights', bounce()], ['the rope hits what it touches', rope()],
        ['every level can be cleared', clear(null, o.quick)], ['the brother and the bumps', helpers()]]);
    },
    // the fail variant: break one rule at a time and make sure the check notices
    prove() {
      const cases = [
        ['split', 'only one half appears when a balloon splits', () => split('split')],
        ['fps', 'balloons move one step per frame (naive Euler bounces)', () => bounce('fps')],
        ['thin', 'the rope ignores how big a balloon is', () => rope('thin')],
        ['cage', 'a balloon is boxed in by toy blocks', () => clear('cage', false, [0, 1, 8, 16])],
        ['stun', 'a bumped kid never gets up', () => helpers('stun')],
      ];
      const lines = [], missed = [];
      for (const [key, what, fn] of cases) {
        const rows = fn();
        const caught = rows.filter((r) => !r[1]).map((r) => r[0]);
        lines.push(`${caught.length ? '✓ caught' : '✗ MISSED'} [${key}] ${what}${caught.length ? ' → ' + caught[0] : ''}`);
        if (!caught.length) missed.push(key);
      }
      return { ok: missed.length === 0, lines, missed };
    },
  };
})();
