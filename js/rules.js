/* TT Bounce Pop: the rules, with no Three.js (node loads this file for the headless check, tools/check.js).
   One unit is about a kid's arm span. The field is W wide and H tall: the floor is y = 0, the walls x = 0 and x = W.
   Balloons come in four sizes (0 tiny .. 3 big). Each bounces off the floor (and off block tops) back up to its own
   height, the bigger the higher, and drifts sideways at one speed; walls, the ceiling and block sides and bottoms
   send it back. A kid walks the floor (and climbs ladders onto ledges) and throws a rope straight up. A balloon the
   rope touches splits into two of the next size down; a tiny one pops into confetti. Clear the screen before the
   timer runs out. Bumping a balloon costs a life: the kid sees stars for a moment, then blinks safe for a while.
   Power-ups fall out of popped balloons: a double rope, a sticky rope that stays up, a freeze clock and fruit.
   The other brother pops in when called and freezes every balloon for 5 seconds.
   Exposes BP.levelDef, BP.moveBalloon, BP.Sim, BP.Runner, BP.Cpu and the sizes. */
(function () {
  'use strict';
  const BP = (window.BP = window.BP || {});

  // ---------------------------------------------------------------- sizes and speeds
  const W = 16, H = 10;
  const DT = 1 / 60;
  const RADIUS = [0.3, 0.55, 0.9, 1.3];       // tiny, small, medium, big
  const BOUNCE = [2.0, 3.1, 4.3, 5.5];        // how high a balloon's bottom goes above what it bounced off
  const GRAV = 13;
  const VX = 2.3;                             // sideways drift, every size
  const POP_HOP = 1.1;                        // the two halves hop up this high when a balloon splits
  const EASY_SPEED = 0.62;                    // 🐣 EASY: the balloons move at this speed (same heights, just slower)
  const ROPE_SPEED = 15, ROPE_HW = 0.1;       // the rope climbs this fast; its half-width
  const STICK_T = 4;                          // a sticky rope stays up this long
  const WALK = 5.2, CLIMB = 3.6, FALL_G = 30;
  const KID_H = 1.45, KID_HW = 0.36;          // a kid's size (feet at his y)
  const GRAB = 0.5;                           // how near a ladder's middle a kid must be to climb it
  const PTS = [200, 150, 100, 50];            // smaller balloons are worth more
  const BRICK_PTS = 50, FRUIT_PTS = 500, TREAT_PTS = 100;
  const FREEZE_CLOCK = 4, FREEZE_BUDDY = 5;
  const READY_T = 1.6, CLEAR_T = 3.2, BONK_T = 1.1, SAFE_T = 2.2, ITEM_T = 7;
  const LEVELS = 40;
  const TREATS = [['🍦', 'ICE CREAM'], ['💧', 'WATER'], ['🧃', 'JUICE'], ['🍪', 'COOKIE'], ['🍉', 'WATERMELON'], ['🍌', 'BANANA']];
  const COLORS = ['#ff4f6d', '#ff9b2f', '#3fb3ff', '#5fd35a', '#b77bff', '#ff7ad1', '#ffd23f'];
  const hitsFor = (s) => 2 ** (s + 1) - 1;    // ropes it takes to clear one balloon of size s
  const bounceV = (s) => Math.sqrt(2 * GRAV * BOUNCE[s]);
  const HOP_V = Math.sqrt(2 * GRAV * POP_HOP);

  Object.assign(BP, { W, H, DT, RADIUS, BOUNCE, GRAV, VX, EASY_SPEED, ROPE_SPEED, ROPE_HW, STICK_T, WALK, CLIMB, KID_H, KID_HW, GRAB, PTS,
    FREEZE_CLOCK, FREEZE_BUDDY, READY_T, CLEAR_T, BONK_T, SAFE_T, LEVELS, TREATS, COLORS, hitsFor, bounceV });

  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  BP.rng = rng;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // ---------------------------------------------------------------- the 40 levels
  // Ten landmarks (our own drawings, js/art.js), four times of day each. Balloons: "size@x"; blocks and ladders come
  // from a layout. Glass blocks (brk) break when a rope hits them; toy blocks stop ropes. Ledges have a ladder.
  const PLACES = [
    'THE GREAT WALL', 'THE EIFFEL TOWER', 'THE PYRAMIDS', 'BIG BEN', 'THE SYDNEY OPERA HOUSE',
    'THE LEANING TOWER OF PISA', 'THE TAJ MAHAL', 'MOUNT FUJI', 'THE GOLDEN GATE BRIDGE', 'THE STATUE OF LIBERTY',
  ];
  const TIMES = ['MORNING', 'DAYTIME', 'SUNSET', 'NIGHT'];
  const Bk = (x0, y0, w, h, brk) => ({ x0, y0, x1: x0 + w, y1: y0 + h, brk: !!brk });
  const LAYOUTS = {
    none: () => ({}),
    bricks: () => ({ blocks: [5, 6, 7, 8, 9, 10].map((x) => Bk(x, 5.2, 1, 0.6, true)) }),
    shelves: () => ({ blocks: [Bk(2.5, 5, 3, 0.5), Bk(10.5, 5, 3, 0.5)] }),
    center: () => ({ blocks: [Bk(6, 4.6, 4, 0.5)] }),
    pillars: () => ({ blocks: [4.6, 5.4, 6.2].flatMap((y) => [Bk(4.6, y, 0.8, 0.8, true), Bk(10.6, y, 0.8, 0.8, true)]) }),
    ledgeL: () => ({ blocks: [Bk(1, 2.9, 4, 0.5)], ladders: [{ x: 4.3, y0: 0, y1: 3.4 }] }),
    ledgeR: () => ({ blocks: [Bk(11, 2.9, 4, 0.5)], ladders: [{ x: 11.7, y0: 0, y1: 3.4 }] }),
    ledges: () => ({ blocks: [Bk(1, 2.9, 4, 0.5), Bk(11, 2.9, 4, 0.5)], ladders: [{ x: 4.3, y0: 0, y1: 3.4 }, { x: 11.7, y0: 0, y1: 3.4 }] }),
    bridge: () => ({ blocks: [Bk(5.5, 2.9, 5, 0.5)], ladders: [{ x: 6.1, y0: 0, y1: 3.4 }, { x: 9.9, y0: 0, y1: 3.4 }] }),
    stairs: () => ({ blocks: [Bk(1, 2.9, 5.8, 0.5), Bk(6, 5.4, 4, 0.5)], ladders: [{ x: 1.8, y0: 0, y1: 3.4 }, { x: 6.4, y0: 3.4, y1: 5.9 }] }),
    glassTop: () => ({ blocks: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map((x) => Bk(x, 7.4, 1, 0.6, true)), top: 7.2 }),
  };
  const PLAN = [
    ['2@4', 'none'], ['3@4', 'none'], ['2@3 2@13', 'none'], ['3@4 1@12', 'none'],
    ['1@2 1@5 1@8 1@11 1@14', 'none'], ['3@3 2@13', 'none'], ['3@4 3@12', 'none'], ['0@2 0@4 0@6 0@10 0@12 0@14 2@8', 'none'],
    ['3@3 3@13', 'bricks'], ['2@2 2@6 2@10 2@14', 'shelves'], ['3@3 1@8 3@13', 'center'], ['3@2 2@8 3@14', 'bricks'],
    ['3@8 2@2 2@14', 'pillars'], ['2@2 2@6 2@10 2@14', 'bricks'], ['3@2 3@14 1@8', 'shelves'], ['3@3 3@8 3@13', 'none'],
    ['3@11 2@4', 'ledgeL'], ['3@5 2@12', 'ledgeR'], ['2@3 2@7 2@9 2@13', 'ledges'], ['3@3 3@13', 'bridge'],
    ['3@12 2@3 2@8', 'stairs'], ['1@1 1@3 1@13 1@15 1@5.5 1@10.5 1@7 1@9', 'none'], ['3@3 3@13 2@8', 'center'], ['3@3 3@13 1@6 1@10', 'ledgeL'],
    ['3@4 3@12', 'glassTop'], ['2@2 2@5 2@11 2@14', 'bridge'], ['3@8 3@2', 'pillars'], ['3@2 3@8 3@14', 'ledges'],
    ['0@1.5 0@3 0@4.5 0@6 0@10 0@11.5 0@13 0@14.5 3@8', 'bricks'], ['3@12 3@3 2@8', 'stairs'], ['3@3 3@13 2@6 2@10', 'shelves'], ['3@4 3@12 3@8', 'glassTop'],
    ['3@3 3@13 3@8', 'bridge'], ['2@2 2@4 2@6 2@10 2@12 2@14', 'center'], ['3@2 3@6 3@10 3@14', 'none'], ['3@4 3@12 2@8 1@2 1@14', 'ledges'],
    ['3@3 3@8 3@13', 'stairs'], ['3@2 3@6 3@10 3@14', 'bricks'], ['3@2 3@14 3@8 2@5.5 2@10.5', 'pillars'], ['3@2 3@6 3@10 3@14', 'bridge'],
  ];
  const START_Y = [7.8, 7.6, 7.4, 7.3];
  const TIPS = {
    0: 'Walk with ← →. Space throws your rope up!',
    1: 'Big balloons split into two smaller ones!',
    4: 'Tiny balloons pop into confetti!',
    8: 'Ropes break the glass blocks!',
    12: 'Grab ⏰ to freeze every balloon!',
    16: 'Climb the ladder with ↑ ↓!',
  };
  const MORE_TIPS = ['Call your brother: he freezes every balloon!', 'Grab 🍯 for a sticky rope!', 'Grab 🔗 for two ropes at once!', 'Pop them all before the time runs out!'];

  // sabotage (the fail variant of the check): 'cage' boxes the first balloon in with toy blocks
  function levelDef(L, sab) {
    L = clamp(L | 0, 0, LEVELS - 1);
    const [spec, lay] = PLAN[L];
    const t = LAYOUTS[lay]();
    const blocks = (t.blocks || []).map((k) => ({ ...k }));
    const ladders = (t.ladders || []).map((l) => ({ ...l }));
    const balloons = spec.split(' ').map((s, i) => {
      const [size, x] = s.split('@').map(Number);
      const r = RADIUS[size];
      const y = t.top ? Math.min(START_Y[size], t.top - r - 0.05) : START_Y[size];
      return { s: size, x, y, dir: x < W / 2 ? 1 : -1, c: i % COLORS.length };
    });
    if (sab === 'cage') {
      const b = balloons[0], m = RADIUS[b.s] + 1.2;
      blocks.push(Bk(b.x - m, b.y - m - 0.5, 2 * m, 0.5), Bk(b.x - m, b.y + m, 2 * m, 0.5), Bk(b.x - m - 0.5, b.y - m - 0.5, 0.5, 2 * m + 1), Bk(b.x + m, b.y - m - 0.5, 0.5, 2 * m + 1));
    }
    const hits = balloons.reduce((a, b) => a + hitsFor(b.s), 0);
    const time = Math.ceil((30 + 3.2 * hits) / 5) * 5;
    const place = Math.floor(L / 4);
    return {
      L, place, tod: L % 4, name: PLACES[place], when: TIMES[L % 4], layout: lay, balloons, blocks, ladders, hits, time,
      tip: TIPS[L] || MORE_TIPS[L % MORE_TIPS.length],
    };
  }
  BP.levelDef = levelDef;
  BP.PLACES = PLACES;
  BP.TIMES = TIMES;

  // ---------------------------------------------------------------- balloon motion
  // Gravity is integrated exactly (a parabola), and a floor or block-top bounce is placed at the moment it touched, so
  // a balloon always comes back up to the same height whatever the step. Sabotage 'fps' (the fail variant): naive
  // Euler steps and "flip the speed" bounces, which drift with the frame rate.
  function landOn(b, floor, sab) {
    const r = RADIUS[b.s];
    if (sab === 'fps') { b.y = floor + r; b.vy = Math.abs(b.vy); return; }
    // it touched tau seconds ago: y(-tau) = floor + r
    const c = floor + r - b.y, vy = b.vy;
    const disc = Math.max(0, vy * vy - 2 * GRAV * c);
    const tau = Math.max(0, (-vy - Math.sqrt(disc)) / GRAV);
    const v0 = bounceV(b.s);
    b.vy = v0 - GRAV * tau;
    b.y = floor + r + v0 * tau - 0.5 * GRAV * tau * tau;
  }

  function moveBalloon(b, dt, blocks, sab) {
    if (dt <= 0) return;
    const r = RADIUS[b.s];
    const x0 = b.x, y0 = b.y;
    b.x += b.vx * dt;
    if (sab === 'fps') { b.vy -= GRAV * dt; b.y += b.vy * dt; } else { b.y += b.vy * dt - 0.5 * GRAV * dt * dt; b.vy -= GRAV * dt; }
    if (b.x < r) { b.x = 2 * r - b.x; b.vx = Math.abs(b.vx); }
    else if (b.x > W - r) { b.x = 2 * (W - r) - b.x; b.vx = -Math.abs(b.vx); }
    if (b.y > H - r && b.vy > 0) { b.y = 2 * (H - r) - b.y; b.vy = -b.vy; }
    if (b.y < r && b.vy < 0) { landOn(b, 0, sab); b.bounces = (b.bounces || 0) + 1; b.top = b.peak; b.peak = 0; }
    if (blocks) for (const k of blocks) {
      if (k.gone) continue;
      const cx = clamp(b.x, k.x0, k.x1), cy = clamp(b.y, k.y0, k.y1);
      const dx = b.x - cx, dy = b.y - cy, d2 = dx * dx + dy * dy;
      if (d2 >= r * r) continue;
      if (y0 - r >= k.y1 - 1e-6 && b.vy < 0 && b.x >= k.x0 && b.x <= k.x1) { landOn(b, k.y1, sab); b.top = b.peak; b.peak = 0; }
      else if (y0 + r <= k.y0 + 1e-6 && b.vy > 0 && b.x >= k.x0 && b.x <= k.x1) { b.y = 2 * (k.y0 - r) - b.y; b.vy = -b.vy; }
      else if (x0 + r <= k.x0 + 1e-6 && b.vx > 0) { b.x = 2 * (k.x0 - r) - b.x; b.vx = -b.vx; }
      else if (x0 - r >= k.x1 - 1e-6 && b.vx < 0) { b.x = 2 * (k.x1 + r) - b.x; b.vx = -b.vx; }
      else {
        // a corner: push out along the line from the corner and bounce off it, keeping the usual sideways speed
        const d = Math.sqrt(d2) || 1e-6, nx = d2 ? dx / d : 0, ny = d2 ? dy / d : 1;
        b.x = cx + nx * r;
        b.y = cy + ny * r;
        const vn = b.vx * nx + b.vy * ny;
        if (vn < 0) { b.vx -= 2 * vn * nx; b.vy -= 2 * vn * ny; }
        b.vx = (b.vx >= 0 ? 1 : -1) * VX * (Math.abs(b.vx) > 0.01 ? 1 : 1);
      }
    }
    if (b.x < r) b.x = r; else if (b.x > W - r) b.x = W - r;
    b.peak = Math.max(b.peak || 0, b.y - r);
  }
  BP.moveBalloon = moveBalloon;

  // the highest thing a kid can stand on at x, no higher than y (the floor is 0)
  function supportAt(blocks, x, y) {
    let s = 0;
    for (const k of blocks) if (!k.gone && x >= k.x0 - 0.12 && x <= k.x1 + 0.12 && k.y1 <= y + 0.02 && k.y1 > s) s = k.y1;
    return s;
  }
  // how high a rope thrown at x from height base can go, and what stops it
  function ropeLimit(blocks, x, base) {
    let y = H, block = null;
    for (const k of blocks) if (!k.gone && x + ROPE_HW > k.x0 && x - ROPE_HW < k.x1 && k.y0 >= base - 0.01 && k.y0 < y) { y = k.y0; block = k; }
    return { y, block };
  }
  // the gap between a balloon and a rope (a segment from base to tip at x); sabotage 'thin' ignores the balloon's size
  function ropeGap(b, rope, sab) {
    const cy = clamp(b.y, rope.base, rope.tip);
    const dx = b.x - rope.x, dy = b.y - cy;
    if (sab === 'thin') return Math.abs(dx) - ROPE_HW + (dy ? 9 : 0);
    return Math.sqrt(dx * dx + dy * dy) - RADIUS[b.s] - ROPE_HW;
  }
  BP.supportAt = supportAt;
  BP.ropeLimit = ropeLimit;
  BP.ropeGap = ropeGap;

  // ---------------------------------------------------------------- a game
  // o: { level (0-based), mode: '1p' | '2p' | 'cpu', hero, easy, seed, buddy, sabotage }
  class Sim {
    constructor(o = {}) {
      this.o = o;
      this.mode = o.mode || '1p';
      this.easy = o.easy !== false;
      this.hero = o.hero === 'tommy' ? 'tommy' : 'teddy';
      this.sab = o.sabotage || null;
      this.rand = rng(o.seed || 1);
      this.seed = o.seed || 1;
      this.maxLives = this.easy ? 5 : 3;
      this.lives = this.maxLives;
      this.bs = this.easy ? EASY_SPEED : 1;
      this.buddyId = o.buddy || (this.hero === 'tommy' ? 'teddy' : 'tommy');
      const whos = this.mode === '2p' ? ['teddy', 'tommy'] : this.mode === 'cpu' ? [this.hero, this.easy ? 'froggy' : 'foxy'] : [this.hero];
      this.players = whos.map((who, i) => ({ i, who, cpu: this.mode === 'cpu' && i === 1, score: 0, x: 0, y: 0, vy: 0, st: 'walk', face: 0,
        safe: 0, bonkT: 0, power: null, fireCd: 0, ladder: null, pose: 'stand', poseT: 0, moving: 0, climbing: 0, hurt: 0 }));
      this.buddy = null;
      this.hi5Cd = 0;
      this.treat = 0;
      this.events = [];
      this.t = 0;
      this.nextId = 1;
      this.loadLevel(o.level || 0, true);
    }

    get score() { return this.players.reduce((a, p) => a + p.score, 0); }
    emit(ev) { this.events.push(ev); }

    loadLevel(L, first) {
      const def = (this.def = levelDef(L, this.sab));
      this.level = def.L;
      this.balloons = def.balloons.map((b) => ({ id: this.nextId++, s: b.s, x: b.x, y: b.y, vx: b.dir * VX, vy: 0, c: b.c, peak: 0, top: 0, bounces: 0 }));
      this.blocks = def.blocks.map((k) => ({ ...k, gone: false }));
      this.ladders = def.ladders;
      this.ropes = [];
      this.items = [];
      this.timeMax = Math.round(def.time * (this.easy ? 1.8 : 1));
      this.time = this.timeMax;
      this.freezeT = 0;
      this.state = 'ready';
      this.stateT = 0;
      this.popped = 0;
      const xs = this.players.length === 2 ? [W / 2 - 2, W / 2 + 2] : [W / 2];
      for (const p of this.players) {
        Object.assign(p, { x: xs[p.i], y: 0, vy: 0, st: 'walk', face: 0, safe: 0, bonkT: 0, power: null, fireCd: 0, ladder: null, pose: 'stand', poseT: 0, moving: 0, climbing: 0 });
      }
      if (!first) this.emit({ type: 'level', level: this.level });
    }

    step(inputs = [], dt = DT) {
      this.t += dt;
      this.stateT += dt;
      this.hi5Cd = Math.max(0, this.hi5Cd - dt);
      this.stepBuddy(dt);
      for (const p of this.players) if (p.poseT > 0) p.poseT = Math.max(0, p.poseT - dt);
      if (this.state === 'ready') {
        this.players.forEach((p, i) => this.stepPlayer(p, inputs[i] || {}, dt, false));
        if (this.stateT >= READY_T) { this.state = 'play'; this.stateT = 0; this.emit({ type: 'go' }); }
        return;
      }
      if (this.state === 'clear') {
        this.stepItems(dt);
        if (this.stateT >= CLEAR_T) {
          if (this.level + 1 >= LEVELS) { this.state = 'done'; this.stateT = 0; this.emit({ type: 'done' }); }
          else this.loadLevel(this.level + 1);
        }
        return;
      }
      if (this.state !== 'play') return;
      this.time -= dt;
      if (this.freezeT > 0) this.freezeT = Math.max(0, this.freezeT - dt);
      const bdt = this.freezeT > 0 ? 0 : dt * this.bs;
      for (const b of this.balloons) moveBalloon(b, bdt, this.blocks, this.sab);
      this.players.forEach((p, i) => this.stepPlayer(p, inputs[i] || {}, dt, true));
      this.stepRopes(dt);
      this.stepItems(dt);
      this.bonks();
      if (this.state !== 'play') return;
      if (!this.balloons.length) return this.clear();
      if (this.time <= 0) {
        this.time = this.timeMax;
        this.emit({ type: 'timeup' });
        this.loseLife();
      }
    }

    // ---------------------------------------------------------------- the kids
    canClimb(p, dir) {
      for (const l of this.ladders) {
        if (Math.abs(p.x - l.x) > GRAB) continue;
        if (dir > 0 && p.y >= l.y0 - 0.05 && p.y < l.y1 - 0.05) return l;
        if (dir < 0 && p.y > l.y0 + 0.05 && p.y <= l.y1 + 0.05) return l;
      }
      return null;
    }

    stepPlayer(p, inp, dt, canFire) {
      p.fireCd = Math.max(0, p.fireCd - dt);
      p.hurt = Math.max(0, p.hurt - dt);
      if (p.safe > 0) p.safe = Math.max(0, p.safe - dt);
      const mx = clamp(Math.round(inp.mx || 0), -1, 1) * (this.sab === 'mirror' ? -1 : 1);
      const my = clamp(Math.round(inp.my || 0), -1, 1);
      p.moving = 0;
      p.climbing = 0;
      if (p.st === 'bonk') {
        p.bonkT -= dt;
        if (p.bonkT <= 0 && this.sab !== 'stun') {
          p.safe = SAFE_T;
          if (p.ladder && Math.abs(p.x - p.ladder.x) < 0.01 && p.y > p.ladder.y0 && p.y < p.ladder.y1) p.st = 'climb';
          else p.st = supportAt(this.blocks, p.x, p.y) >= p.y - 0.01 ? 'walk' : 'fall';
          p.vy = 0;
        }
        return;
      }
      let fire = !!inp.fire;
      // ↑ climbs at a ladder, and throws the rope anywhere else
      if (inp.upFire && !(p.st === 'walk' && this.canClimb(p, 1)) && p.st !== 'climb') fire = true;
      if (p.st === 'climb') {
        const l = p.ladder;
        if (my) {
          p.y += my * CLIMB * dt;
          p.climbing = my;
          if (p.y >= l.y1) { p.y = l.y1; p.st = 'walk'; }
          else if (p.y <= l.y0) { p.y = l.y0; p.st = 'walk'; }
        } else if (mx) {
          // let go of the ladder half way: hop off sideways and drop to whatever is below
          p.st = 'fall';
          p.vy = 0;
          p.x = clamp(p.x + mx * 0.3, KID_HW, W - KID_HW);
          p.face = mx;
        }
      } else if (p.st === 'walk') {
        const l = my > 0 ? this.canClimb(p, 1) : my < 0 ? this.canClimb(p, -1) : null;
        if (l) {
          p.st = 'climb';
          p.ladder = l;
          p.x = l.x;
          p.climbing = my;
        } else if (mx) {
          p.x = clamp(p.x + mx * WALK * dt, KID_HW, W - KID_HW);
          p.face = mx;
          p.moving = mx;
          if (supportAt(this.blocks, p.x, p.y) < p.y - 0.01) { p.st = 'fall'; p.vy = 0; }
        }
        if (p.st === 'walk' && supportAt(this.blocks, p.x, p.y) < p.y - 0.01) { p.st = 'fall'; p.vy = 0; } // a glass block broke under him
      } else if (p.st === 'fall') {
        if (mx) { p.x = clamp(p.x + mx * WALK * 0.7 * dt, KID_HW, W - KID_HW); p.face = mx; }
        const s = supportAt(this.blocks, p.x, p.y);
        p.vy -= FALL_G * dt;
        p.y += p.vy * dt;
        if (p.y <= s) { p.y = s; p.vy = 0; p.st = 'walk'; this.emit({ type: 'land', i: p.i }); }
      }
      if (fire && canFire && p.fireCd <= 0) this.fire(p);
    }

    fire(p) {
      const max = p.power === 'double' ? 2 : 1;
      if (this.ropes.filter((r) => r.owner === p.i).length >= max) return false;
      p.fireCd = 0.12;
      p.pose = 'throw';
      p.poseT = 0.3;
      this.ropes.push({ owner: p.i, x: p.x, base: p.y, tip: p.y + KID_H * 0.9, sticky: p.power === 'sticky', stuck: false, t: 0 });
      this.emit({ type: 'fire', i: p.i });
      return true;
    }

    // ---------------------------------------------------------------- ropes
    stepRopes(dt) {
      const keep = [];
      for (const rope of this.ropes) {
        const lim = ropeLimit(this.blocks, rope.x, rope.base);
        if (rope.stuck) rope.t += dt;
        else rope.tip = Math.min(lim.y, rope.tip + ROPE_SPEED * dt);
        // the first balloon it touches (the lowest), only one per rope
        let hit = null;
        for (const b of this.balloons) if (ropeGap(b, rope, this.sab) <= 0 && (!hit || b.y < hit.y)) hit = b;
        if (hit) { this.split(hit, rope.owner); continue; }
        if (rope.stuck) { if (rope.t < STICK_T) keep.push(rope); else this.emit({ type: 'ropeEnd', i: rope.owner }); continue; }
        if (rope.tip >= lim.y - 1e-9) {
          if (lim.block && lim.block.brk) { this.breakBlock(lim.block, rope.owner); continue; }
          if (rope.sticky) { rope.stuck = true; rope.t = 0; keep.push(rope); this.emit({ type: 'stick', i: rope.owner, x: rope.x, y: rope.tip }); continue; }
          this.emit({ type: 'ropeEnd', i: rope.owner });
          continue;
        }
        keep.push(rope);
      }
      this.ropes = keep;
    }

    breakBlock(k, who) {
      k.gone = true;
      const p = this.players[who];
      if (p) p.score += BRICK_PTS;
      this.emit({ type: 'brick', x: (k.x0 + k.x1) / 2, y: (k.y0 + k.y1) / 2, i: who, pts: BRICK_PTS });
    }

    // a balloon the rope touched: two of the next size down, or confetti. Sabotage 'split': only one half appears.
    split(b, who) {
      const i = this.balloons.indexOf(b);
      if (i < 0) return [];
      this.balloons.splice(i, 1);
      this.popped++;
      const pts = PTS[b.s];
      const p = this.players[who];
      if (p) p.score += pts;
      const kids = [];
      if (b.s > 0) {
        const s = b.s - 1, r = RADIUS[s];
        for (const d of this.sab === 'split' ? [1] : [-1, 1]) {
          const k = { id: this.nextId++, s, x: clamp(b.x, r, W - r), y: Math.max(r, b.y), vx: d * VX, vy: HOP_V, c: b.c, peak: 0, top: 0, bounces: 0 };
          this.balloons.push(k);
          kids.push(k);
        }
      }
      this.emit({ type: 'pop', x: b.x, y: b.y, s: b.s, c: b.c, i: who, pts, id: b.id, kids: kids.map((k) => k.id) });
      this.maybeDrop(b);
      return kids;
    }

    // ---------------------------------------------------------------- power-ups
    maybeDrop(b) {
      if (this.items.length >= 2 || this.o.noItems) return;
      if (this.rand() >= (this.easy ? 0.24 : 0.15)) return;
      const r = this.rand();
      const kind = r < 0.27 ? 'double' : r < 0.54 ? 'sticky' : r < 0.76 ? 'freeze' : 'fruit';
      this.items.push({ id: this.nextId++, kind, x: clamp(b.x, 0.5, W - 0.5), y: b.y, vy: 2, t: 0, rest: false });
      this.emit({ type: 'drop', kind });
    }

    stepItems(dt) {
      const keep = [];
      for (const it of this.items) {
        if (!it.rest) {
          const s = supportAt(this.blocks, it.x, it.y);
          it.vy -= 14 * dt;
          it.y += it.vy * dt;
          if (it.y <= s) { it.y = s; it.rest = true; }
        } else {
          it.t += dt;
          if (supportAt(this.blocks, it.x, it.y) < it.y - 0.01) it.rest = false; // its glass block broke
        }
        if (it.t >= ITEM_T) continue;
        if (this.state === 'play') {
          const p = this.players.find((q) => q.st !== 'bonk' && Math.abs(q.x - it.x) < 0.75 && it.y > q.y - 0.4 && it.y < q.y + KID_H);
          if (p) { this.take(p, it); continue; }
        }
        keep.push(it);
      }
      this.items = keep;
    }

    take(p, it) {
      if (it.kind === 'double' || it.kind === 'sticky') p.power = it.kind;
      else if (it.kind === 'freeze') this.freeze(FREEZE_CLOCK, 'clock');
      else p.score += FRUIT_PTS;
      this.emit({ type: 'take', i: p.i, kind: it.kind, x: it.x, y: it.y, pts: it.kind === 'fruit' ? FRUIT_PTS : 0 });
    }

    freeze(secs, by) {
      this.freezeT = Math.max(this.freezeT, secs);
      this.emit({ type: 'freeze', by, secs });
    }

    // ---------------------------------------------------------------- bumps (nobody gets hurt: a kid sees stars)
    kidBox(p) {
      const hw = this.easy ? 0.26 : 0.32, h = this.easy ? 1.1 : 1.25;
      return { x0: p.x - hw, x1: p.x + hw, y0: p.y, y1: p.y + h };
    }

    bonks() {
      if (this.freezeT > 0) return; // frozen balloons are harmless
      for (const p of this.players) {
        if (p.st === 'bonk' || p.safe > 0) continue;
        const k = this.kidBox(p);
        for (const b of this.balloons) {
          const r = RADIUS[b.s];
          const dx = b.x - clamp(b.x, k.x0, k.x1), dy = b.y - clamp(b.y, k.y0, k.y1);
          if (dx * dx + dy * dy < r * r) { this.bonk(p, b); break; }
        }
        if (this.state !== 'play') return;
      }
    }

    bonk(p, b) {
      p.st = 'bonk';
      p.bonkT = BONK_T;
      p.power = null;
      p.hurt = 0.6;
      this.emit({ type: 'bonk', i: p.i, who: p.who, x: p.x, y: p.y });
      this.loseLife();
    }

    loseLife() {
      this.lives--;
      for (const q of this.players) if (q.st !== 'bonk') q.safe = Math.max(q.safe, 1);
      if (this.lives <= 0) {
        this.lives = 0;
        this.state = 'over';
        this.stateT = 0;
        this.ropes = [];
        this.emit({ type: 'over' });
      }
    }

    keepGoing() {
      if (this.state !== 'over') return false;
      this.lives = this.maxLives;
      this.state = 'play';
      this.stateT = 0;
      this.time = Math.max(this.time, this.timeMax * 0.5);
      for (const p of this.players) {
        p.st = supportAt(this.blocks, p.x, p.y) >= p.y - 0.01 ? 'walk' : 'fall';
        p.bonkT = 0;
        p.vy = 0;
        p.safe = SAFE_T;
      }
      this.emit({ type: 'keepGoing' });
      return true;
    }

    clear() {
      this.state = 'clear';
      this.stateT = 0;
      this.ropes = [];
      const bonus = Math.ceil(Math.max(0, this.time)) * 10;
      for (const p of this.players) { p.score += bonus; p.pose = 'cheer'; p.poseT = CLEAR_T; }
      this.emit({ type: 'clear', level: this.level, bonus, last: this.level + 1 >= LEVELS });
    }

    // ---------------------------------------------------------------- the brother
    // 1 player (and with Froggy / Foxy): he pops in on a cloud, does his signature move, tosses a treat, then freezes
    // every balloon for 5 seconds. Call him as often as you like: each call is one more freeze. 2 players: a high five.
    callBuddy() {
      if (this.state !== 'play' && this.state !== 'ready') return false;
      if (this.mode === '2p') {
        if (this.hi5Cd > 0) return false;
        this.hi5Cd = 2.5;
        for (const p of this.players) { p.pose = 'hi5'; p.poseT = 1.2; }
        this.emit({ type: 'highfive' });
        return true;
      }
      const B = this.buddy;
      if (!B) {
        const p = this.players[0];
        this.buddy = { id: this.buddyId, state: 'enter', t: 0, loads: 1, side: p.x < W / 2 ? 1 : -1 };
        this.emit({ type: 'buddyIn', who: this.buddyId });
      } else {
        B.loads++;
        if (B.state === 'idle' || B.state === 'bye' || B.state === 'leave') { B.state = 'hello'; B.t = 0; }
      }
      return true;
    }

    stepBuddy(dt) {
      const B = this.buddy;
      if (!B) return;
      B.t += dt;
      const go = (s) => { B.state = s; B.t = 0; };
      const p = this.players[0];
      switch (B.state) {
        case 'enter': if (B.t >= 0.5) go('hello'); break;
        case 'hello': if (B.t >= 1.2) {
          go('give');
          const [emoji, name] = TREATS[this.treat++ % TREATS.length];
          p.score += TREAT_PTS;
          this.emit({ type: 'gift', from: B.id, to: p.who, emoji, name });
        } break;
        case 'give': if (B.t >= 0.7) go('cast'); break;
        case 'cast': if (B.t >= 0.5) {
          this.freeze(FREEZE_BUDDY, B.id);
          B.loads--;
          go(B.loads > 0 ? 'hello' : 'idle');
        } break;
        case 'idle': if (B.t >= 1.5 && this.freezeT <= 0.5) { go('bye'); this.emit({ type: 'buddyBye', who: B.id }); } break;
        case 'bye': if (B.t >= 1.0) go('leave'); break;
        case 'leave': if (B.t >= 0.4) { this.buddy = null; this.emit({ type: 'buddyOut', who: B.id }); } break;
      }
    }
  }
  BP.Sim = Sim;

  // fixed steps, whatever the frame rate (sabotage 'fps': one step per frame, with the frame's own time)
  class Runner {
    constructor(sim) { this.sim = sim; this.acc = 0; }
    advance(dt, inputs) {
      if (this.sim.sab === 'fps') { if (dt > 0) this.sim.step(inputs(), dt); return dt > 0 ? 1 : 0; }
      this.acc += dt;
      let n = 0;
      while (this.acc >= DT - 1e-9 && n < 10) { this.sim.step(inputs()); this.acc -= DT; n++; }
      if (n >= 10) this.acc = 0;
      return n;
    }
  }
  BP.Runner = Runner;

  // ---------------------------------------------------------------- the autopilot (Froggy, Foxy, the demo, the check)
  // It stays on the floor. Every `think` seconds it looks ahead (where every balloon will be over the next 0.8 s), picks
  // a balloon it can reach and walks under its path, steering clear of any balloon that would bump it. Every step it
  // throws the rope when a balloon is about to cross it. o: { think, noise (units of aim error), seed, lazy (0..1) }
  class Cpu {
    constructor(sim, p, o = {}) {
      this.sim = sim;
      this.p = p;
      this.think = o.think || 0.12;
      this.noise = o.noise || 0;
      this.lazy = o.lazy || 0;
      this.rand = rng(o.seed || 7);
      this.wait = 0;
      this.mx = 0;
      this.goal = null;
    }

    predict(secs, n) {
      const sim = this.sim, out = [];
      const frozen = sim.freezeT;
      const clones = sim.balloons.map((b) => ({ ...b }));
      const dt = secs / n;
      for (let k = 1; k <= n; k++) {
        const t = k * dt;
        const move = Math.max(0, Math.min(dt, t - frozen)) * sim.bs;
        for (const c of clones) { moveBalloon(c, move / 2, sim.blocks); moveBalloon(c, move / 2, sim.blocks); }
        out.push({ t, at: clones.map((c) => ({ x: c.x, y: c.y, r: RADIUS[c.s], id: c.id })) });
      }
      return out;
    }

    plan() {
      const sim = this.sim, p = this.p;
      const steps = this.predict(0.8, 8);
      const hazard = (m) => {
        // when would a kid walking this way first be bumped? (a little bigger than the real bump box)
        for (const s of steps) {
          const x = clamp(p.x + m * WALK * s.t, KID_HW, W - KID_HW);
          if (sim.freezeT > s.t) continue;
          for (const b of s.at) {
            const dx = b.x - clamp(b.x, x - 0.5, x + 0.5), dy = b.y - clamp(b.y, p.y, p.y + 1.6);
            if (dx * dx + dy * dy < b.r * b.r) return s.t;
          }
        }
        return 9;
      };
      // a target: the balloon whose path is easiest to get under, that a rope from the floor can reach
      let best = null;
      for (const b of sim.balloons) {
        const t = Math.min(0.8, Math.abs(b.x - p.x) / WALK);
        const s = steps[Math.max(0, Math.min(steps.length - 1, Math.round(t / 0.1) - 1))];
        const f = s.at.find((q) => q.id === b.id) || b;
        const lim = ropeLimit(sim.blocks, f.x, p.y).y;
        if (f.y - RADIUS[b.s] > lim) continue;
        const cost = Math.abs(f.x - p.x) + (f.y - RADIUS[b.s] - p.y) * 0.15 - b.s * 0.3;
        if (!best || cost < best.cost) best = { cost, x: f.x };
      }
      this.goal = best ? clamp(best.x + (this.rand() - 0.5) * 2 * this.noise, KID_HW, W - KID_HW) : null;
      const want = this.goal == null || Math.abs(this.goal - p.x) < 0.15 ? 0 : Math.sign(this.goal - p.x);
      const order = [want, 0, -want || 1, want ? -want : -1].filter((m, i, a) => a.indexOf(m) === i);
      let pick = order[0], bestT = -1;
      for (const m of order) {
        const t = hazard(m);
        if (t >= 9) { pick = m; bestT = t; break; }
        if (t > bestT) { bestT = t; pick = m; }
      }
      this.mx = pick;
    }

    // is a balloon about to run into a rope thrown from here?
    shouldFire() {
      const sim = this.sim, p = this.p;
      if (sim.state !== 'play' || p.st === 'bonk') return false;
      const max = p.power === 'double' ? 2 : 1;
      if (sim.ropes.filter((r) => r.owner === p.i).length >= max) return false;
      const lim = ropeLimit(sim.blocks, p.x, p.y).y;
      const bs = sim.freezeT > 0 ? 0 : sim.bs;
      for (const b of sim.balloons) {
        const r = RADIUS[b.s];
        for (let t = 0; t <= 0.7; t += 0.1) {
          const bx = b.x + b.vx * bs * t;
          const by = Math.max(r, b.y + b.vy * bs * t - 0.5 * GRAV * bs * bs * t * t);
          const tip = Math.min(lim, p.y + KID_H * 0.9 + ROPE_SPEED * t);
          if (Math.abs(bx - p.x) <= r * 0.85 + ROPE_HW && by - r <= tip && by - r < lim) return true;
        }
      }
      return false;
    }

    input() {
      const sim = this.sim, p = this.p;
      if (sim.state !== 'play' && sim.state !== 'ready') return { mx: 0 };
      this.wait -= DT;
      if (this.wait <= 0) { this.plan(); this.wait = this.think; }
      let fire = sim.state === 'play' && this.shouldFire();
      if (fire && this.lazy && this.rand() < this.lazy) fire = false;
      return { mx: p.st === 'walk' || p.st === 'fall' ? this.mx : p.st === 'climb' ? 0 : 0, my: p.st === 'climb' ? -1 : 0, fire };
    }
  }
  BP.Cpu = Cpu;
})();
