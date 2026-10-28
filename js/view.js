/* TT Bounce Pop: the Three.js scene. A fixed arcade camera looks straight at the field: a toy box made of stacked
   coloured blocks with a wooden floor, our drawing of the level's landmark behind it, toy blocks and glass blocks,
   wooden ladders, glossy googly-eyed balloons on strings, the kids (Kit.people), their ropes, power-up badges and the
   brother on a little cloud. Effects: confetti pops, puffs, floating scores, glass sparkles, a freeze wave, stars over
   a bonked kid. Exposes BP.View. The rules are in js/rules.js. */
(function () {
  'use strict';
  const T = THREE, G = Kit.gfx, BP = window.BP, A = BP.art;
  const { W, H, RADIUS, KID_H } = BP;
  const KID_S = KID_H / 2;          // Kit.people are about 2 m tall
  const SIG_T = 2.4;                // Teddy switches between boxing and the jump shot this often
  const BLOCK_COLS = ['#ff6b81', '#ffb84d', '#58b9ff', '#69d36a', '#b98aff', '#ff8fc8'];
  const FRAME_COLS = ['#ff5d73', '#ffd23f', '#3fb3ff', '#5fd35a', '#b77bff', '#ff9b2f'];
  const ROPE_Z = 0.42;

  const sphereGeo = new T.SphereGeometry(1, 30, 22);
  const planeGeo = new T.PlaneGeometry(1, 1);
  const boxGeo = new T.BoxGeometry(1, 1, 1);
  const knotGeo = new T.ConeGeometry(0.12, 0.16, 10);
  const stringGeo = new T.CylinderGeometry(0.012, 0.012, 1, 5);
  const ropeGeo = new T.CylinderGeometry(0.1, 0.1, 1, 10, 1, true);
  const flat = (map, o) => new T.MeshBasicMaterial(Object.assign({ map, transparent: true, depthWrite: false }, o));
  const MATS = {};
  function balloonMat(c, frozen) {
    const key = c + (frozen ? 'f' : '');
    if (MATS[key]) return MATS[key];
    const col = new T.Color(BP.COLORS[c % BP.COLORS.length]);
    if (frozen) col.lerp(new T.Color('#d8f6ff'), 0.62);
    return (MATS[key] = new T.MeshPhysicalMaterial({ color: col, roughness: frozen ? 0.45 : 0.18, clearcoat: 1, clearcoatRoughness: frozen ? 0.4 : 0.08 }));
  }
  const FACE = {};
  const faceMat = (kind) => FACE[kind] || (FACE[kind] = flat(A.face(kind)));
  const shineMat = flat(G.glowTexture(), { opacity: 0.85 });
  const stringMat = new T.MeshStandardMaterial({ color: '#f4f0ff', roughness: 0.8 });
  const WORDS = new Map();
  const wordTex = (text, col) => {
    const k = text + col;
    if (!WORDS.has(k)) WORDS.set(k, A.word(text, col));
    return WORDS.get(k);
  };

  function sprite(tex, w, h = w, o = {}) {
    const s = new T.Sprite(new T.SpriteMaterial(Object.assign({ map: tex, transparent: true, depthWrite: false }, o)));
    s.scale.set(w, h, 1);
    return s;
  }
  const lerpAngle = (a, b, k) => { let d = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; return a + d * k; };
  const ease = (o, prop, v, k) => { o[prop] += (v - o[prop]) * k; };

  // poses on top of Kit.people.pose: 'climb' (hand over hand), 'stand', 'hi5' (one hand up high), 'throw'
  function pose(p, ph, mode, k) {
    if (mode === 'climb') {
      Kit.people.pose(p, ph, 'idle', k);
      const s = Math.sin(ph);
      ease(p.armL.rotation, 'x', 2.7 + s * 0.35, k);
      ease(p.armR.rotation, 'x', 2.7 - s * 0.35, k);
      ease(p.armL.rotation, 'z', -0.25, k);
      ease(p.armR.rotation, 'z', 0.25, k);
      ease(p.legL.rotation, 'x', 0.5 + s * 0.45, k);
      ease(p.legR.rotation, 'x', 0.5 - s * 0.45, k);
      return;
    }
    if (mode === 'hi5') {
      Kit.people.pose(p, ph, 'idle', k);
      ease(p.armR.rotation, 'x', 3.0, k);
      ease(p.armR.rotation, 'z', 0.5, k);
      ease(p.armL.rotation, 'z', -0.2, k);
      return;
    }
    if (mode === 'throw') { Kit.people.pose(p, ph, 'jumpshot', k); return; }
    Kit.people.pose(p, ph, mode, k);
    if (mode === 'peace' || mode === 'wave' || mode === 'give') {
      p.legL.rotation.x *= 0.25;
      p.legR.rotation.x *= 0.25;
      p.hips.position.y = p.hipY + Math.abs(Math.sin(ph)) * 0.03;
    }
  }
  const signature = (who, t) => {
    const sig = (Kit.roster.get(who) || {}).signature || ['wave'];
    return sig[Math.floor(t / SIG_T) % sig.length];
  };

  function View(canvas) {
    const r = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    r.outputEncoding = T.sRGBEncoding;
    r.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    r.shadowMap.enabled = true;
    r.shadowMap.type = T.PCFSoftShadowMap;
    this.renderer = r;
    this.canvas = canvas;
    this.scene = new T.Scene();
    this.scene.background = new T.Color('#ffcf5a');
    this.camera = new T.PerspectiveCamera(22, 1, 1, 900);
    this.scene.add(new T.HemisphereLight('#ffffff', '#b08a6a', 0.95));
    const sun = new T.DirectionalLight('#fff4e2', 0.9);
    sun.position.set(W / 2 - 8, H + 16, 26);
    sun.target.position.set(W / 2, H / 2 - 2, 0);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 12, bottom: -12, near: 1, far: 80 });
    sun.shadow.bias = -0.0015;
    this.scene.add(sun, sun.target);
    this.margins = { top: 64, bottom: 8, left: 8, right: 8 };
    this.size = [0, 0];
    this.box = { x0: -1.25, x1: W + 1.25, y0: -1.1, y1: H + 1.05 };
    this.t = 0;
    this.shake = 0;
    this.balloons = new Map();
    this.kids = [];
    this.items = new Map();
    this.ropes = [];
    this.fx = [];
    this.buddy = null;
    this.level = -1;
    this.bounced = [];
    this.makeStage();
    this.makeConfetti();
  }

  // ---------------------------------------------------------------- the toy box (built once)
  View.prototype.makeStage = function () {
    const sc = this.scene;
    // the playroom wall behind everything
    const [wc, wg] = G.makeCanvas(256, 256);
    wg.fillStyle = '#ffd56b';
    wg.fillRect(0, 0, 256, 256);
    wg.fillStyle = '#ffc94a';
    for (let x = 0; x < 256; x += 64) wg.fillRect(x, 0, 32, 256);
    const wall = new T.Mesh(new T.PlaneGeometry(240, 140), new T.MeshBasicMaterial({ map: G.toTexture(wc, [30, 18]) }));
    wall.position.set(W / 2, H / 2, -4);
    sc.add(wall);
    // the landmark
    this.back = new T.Mesh(new T.PlaneGeometry(W, H), new T.MeshBasicMaterial({ map: A.backdrop(0, 0) }));
    this.back.position.set(W / 2, H / 2, -1.6);
    sc.add(this.back);
    // the floor boards
    const floor = new T.Mesh(boxGeo, new T.MeshStandardMaterial({ map: A.floor(), roughness: 0.7 }));
    floor.scale.set(W + 2.4, 1.1, 3.6);
    floor.position.set(W / 2, -0.55, -0.2);
    floor.receiveShadow = true;
    sc.add(floor);
    // pillars and a top beam of stacked toy blocks
    const tex = A.toyBlock();
    const mats = FRAME_COLS.map((c) => new T.MeshStandardMaterial({ color: c, map: tex, roughness: 0.55 }));
    let n = 0;
    const cube = (x, y, w, h) => {
      const m = new T.Mesh(boxGeo, mats[n++ % mats.length]);
      m.scale.set(w, h, 1.8);
      m.position.set(x, y, -0.4);
      m.castShadow = m.receiveShadow = true;
      sc.add(m);
    };
    for (let y = -1.1, k = 0; y < H + 1.0; y += 1.05, k++) { cube(-0.6, y + 0.52, 1.2, 1.05); cube(W + 0.6, y + 0.52, 1.2, 1.05); }
    for (let x = 0; x < W; x += 1.6) cube(x + 0.8, H + 0.5, 1.6, 1.0);
    this.blockMats = BLOCK_COLS.map((c) => new T.MeshStandardMaterial({ color: c, map: tex, roughness: 0.5 }));
    this.glassMat = new T.MeshPhysicalMaterial({ map: A.glass(), color: '#ffffff', roughness: 0.08, clearcoat: 1, transparent: true, opacity: 0.86 });
    this.ladderMat = new T.MeshStandardMaterial({ color: '#d99a52', roughness: 0.7 });
    this.levelG = new T.Group();
    sc.add(this.levelG);
    this.dyn = new T.Group();
    sc.add(this.dyn);
    // the freeze glow over the whole field
    this.frost = new T.Mesh(new T.PlaneGeometry(W, H), new T.MeshBasicMaterial({ color: '#bff0ff', transparent: true, opacity: 0, depthWrite: false }));
    this.frost.position.set(W / 2, H / 2, 1.8);
    sc.add(this.frost);
  };

  // ---------------------------------------------------------------- a level's blocks and ladders, the kids
  View.prototype.setGame = function (sim) {
    this.sim = sim;
    for (const v of this.balloons.values()) this.dyn.remove(v.g);
    this.balloons.clear();
    for (const v of this.items.values()) this.dyn.remove(v.s);
    this.items.clear();
    for (const k of this.kids) this.dyn.remove(k.root);
    this.kids = sim.players.map((p) => this.makeKid(p.who, 1));
    for (const k of this.kids) this.dyn.add(k.root);
    if (this.buddy) { this.dyn.remove(this.buddy.root); this.buddy = null; }
    for (const f of this.fx) this.dyn.remove(f.obj);
    this.fx = [];
    this.level = -1;
    this.buildLevel(sim);
  };

  View.prototype.buildLevel = function (sim) {
    if (this.level === sim.level && this.levelSim === sim) return;
    this.level = sim.level;
    this.levelSim = sim;
    this.levelG.clear();
    this.back.material.map = A.backdrop(sim.def.place, sim.def.tod);
    this.back.material.needsUpdate = true;
    this.blockMeshes = sim.blocks.map((k, i) => {
      const m = new T.Mesh(boxGeo, k.brk ? this.glassMat : this.blockMats[i % this.blockMats.length]);
      m.scale.set(k.x1 - k.x0, k.y1 - k.y0, 1.2);
      m.position.set((k.x0 + k.x1) / 2, (k.y0 + k.y1) / 2, 0);
      m.castShadow = m.receiveShadow = true;
      this.levelG.add(m);
      return m;
    });
    for (const l of sim.ladders) {
      const g = new T.Group();
      const len = l.y1 - l.y0;
      for (const sx of [-0.33, 0.33]) {
        const rail = new T.Mesh(boxGeo, this.ladderMat);
        rail.scale.set(0.1, len + 0.25, 0.1);
        rail.position.set(sx, len / 2 + 0.1, 0);
        g.add(rail);
      }
      for (let y = 0.3; y < len; y += 0.42) {
        const rung = new T.Mesh(boxGeo, this.ladderMat);
        rung.scale.set(0.66, 0.08, 0.08);
        rung.position.set(0, y, 0);
        g.add(rung);
      }
      g.position.set(l.x, l.y0, -0.72);
      this.levelG.add(g);
    }
  };

  View.prototype.makeKid = function (who, scale) {
    const entry = Kit.roster.get(who);
    const p = Kit.people.build(entry.look);
    const root = new T.Group();
    p.root.scale.setScalar(KID_S * scale);
    p.root.rotation.y = Math.PI;
    root.add(p.root);
    p.root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    const stars = new T.Group();
    for (let k = 0; k < 3; k++) { const s = sprite(A.star(), 0.32); stars.add(s); }
    stars.position.y = KID_H * scale + 0.2;
    stars.visible = false;
    root.add(stars);
    const power = sprite(A.badge('double'), 0.42);
    power.position.set(0, KID_H * scale + 0.42, 0);
    power.visible = false;
    root.add(power);
    // Teddy's jump shot: the game adds the hop and the ball
    const ball = sprite(G.emojiTexture('🏀'), 0.4);
    ball.visible = false;
    root.add(ball);
    return { who, p, root, stars, power, ball, ph: Math.random() * 6, rot: Math.PI, scale, lastPose: '' };
  };

  // ---------------------------------------------------------------- confetti (one instanced mesh)
  View.prototype.makeConfetti = function () {
    const N = 700;
    const mesh = new T.InstancedMesh(new T.PlaneGeometry(0.16, 0.1), new T.MeshBasicMaterial({ side: T.DoubleSide }), N);
    mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
    mesh.frustumCulled = false;
    const col = new T.Color('#ffffff');
    for (let i = 0; i < N; i++) mesh.setColorAt(i, col);
    this.scene.add(mesh);
    this.conf = { mesh, N, parts: [], free: [] };
    for (let i = N - 1; i >= 0; i--) this.conf.free.push(i);
    this.hideAll();
  };
  View.prototype.hideAll = function () {
    const m = new T.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < this.conf.N; i++) this.conf.mesh.setMatrixAt(i, m);
    this.conf.mesh.instanceMatrix.needsUpdate = true;
  };
  View.prototype.burst = function (x, y, n, cols, o = {}) {
    const C = this.conf, col = new T.Color();
    for (let k = 0; k < n && C.free.length; k++) {
      const i = C.free.pop();
      const a = Math.random() * Math.PI * 2, sp = (o.speed || 4) * (0.4 + Math.random());
      col.set(cols[k % cols.length]);
      C.mesh.setColorAt(i, col);
      C.parts.push({ i, x: x + (o.w ? (Math.random() - 0.5) * o.w : 0), y, z: 0.6 + Math.random() * 0.6, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp + (o.up || 2), vz: (Math.random() - 0.5) * 2,
        rx: Math.random() * 6, ry: Math.random() * 6, spin: (Math.random() - 0.5) * 14, life: o.life || 1.6 + Math.random() * 0.8, t: 0 });
    }
    if (C.mesh.instanceColor) C.mesh.instanceColor.needsUpdate = true;
  };
  View.prototype.stepConfetti = function (dt) {
    const C = this.conf, m = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), v = new T.Vector3(), s = new T.Vector3();
    const keep = [];
    for (const p of C.parts) {
      p.t += dt;
      if (p.t >= p.life) { m.makeScale(0, 0, 0); C.mesh.setMatrixAt(p.i, m); C.free.push(p.i); continue; }
      p.vy -= 7 * dt;
      p.vx *= 1 - 1.6 * dt;
      p.vy = Math.max(p.vy, -2.2);
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      p.rx += p.spin * dt; p.ry += p.spin * 0.7 * dt;
      e.set(p.rx, p.ry, 0);
      q.setFromEuler(e);
      const f = Math.min(1, (p.life - p.t) * 3);
      m.compose(v.set(p.x, p.y, p.z), q, s.set(f, f, f));
      C.mesh.setMatrixAt(p.i, m);
      keep.push(p);
    }
    C.parts = keep;
    C.mesh.instanceMatrix.needsUpdate = true;
  };

  // ---------------------------------------------------------------- one-off effects
  View.prototype.addFx = function (obj, life, fn) {
    this.dyn.add(obj);
    this.fx.push({ obj, life, t: 0, fn });
  };
  View.prototype.floatWord = function (text, x, y, col = '#ffffff', size = 1) {
    const s = sprite(wordTex(text, col), 2.4 * size, 0.6 * size);
    s.position.set(x, y, 1.4);
    this.addFx(s, 1.0, (f, t) => { s.position.y = y + t * 1.1; s.material.opacity = Math.min(1, (1 - t) * 3); const k = 1 + Math.max(0, 0.25 - t) * 2; s.scale.set(2.4 * size * k, 0.6 * size * k, 1); });
  };
  View.prototype.puff = function (x, y, r, col = '#ffffff') {
    const s = sprite(G.glowTexture(), r * 2, r * 2, { color: col, opacity: 0.9 });
    s.position.set(x, y, 0.9);
    this.addFx(s, 0.35, (f, t) => { const k = 1 + t * 2.4; s.scale.set(r * 2 * k, r * 2 * k, 1); s.material.opacity = 0.9 * (1 - t); });
  };
  View.prototype.ring = function (x, y, col, big) {
    const m = new T.Mesh(new T.RingGeometry(0.8, 1, 48), new T.MeshBasicMaterial({ color: col, transparent: true, depthWrite: false, side: T.DoubleSide }));
    m.position.set(x, y, 1.5);
    this.addFx(m, big ? 0.9 : 0.5, (f, t) => { const k = 0.3 + t * (big ? 16 : 3); m.scale.set(k, k, 1); m.material.opacity = 1 - t; });
  };
  View.prototype.toss = function (emoji, from, to) {
    const s = sprite(G.emojiTexture(emoji), 0.8);
    this.addFx(s, 0.8, (f, t) => {
      const [x0, y0] = from(), [x1, y1] = to();
      s.position.set(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t + Math.sin(t * Math.PI) * 2, 1.4);
      s.material.rotation = t * 8;
    });
  };

  View.prototype.onEvent = function (ev, sim) {
    const kid = (i) => sim.players[i];
    switch (ev.type) {
      case 'pop': {
        const r = RADIUS[ev.s], col = BP.COLORS[ev.c % BP.COLORS.length];
        this.puff(ev.x, ev.y, r, col);
        this.burst(ev.x, ev.y, ev.s === 0 ? 46 : 18 + ev.s * 4, [col, '#ffffff', '#ffd23f', '#ff7ad1', '#5fb8ff'], { speed: 3 + ev.s, up: 1.5 });
        this.floatWord(`+${ev.pts}`, ev.x, ev.y + r * 0.6, '#ffffff', 0.8);
        if (ev.s === 0) this.floatWord(Kit.lang.t('POP!'), ev.x, ev.y + 0.9, '#ffd23f', 0.9);
        break;
      }
      case 'brick':
        this.burst(ev.x, ev.y, 26, ['#e9fbff', '#9fe6ff', '#ffffff'], { speed: 3, up: 1 });
        this.floatWord(`+${ev.pts}`, ev.x, ev.y + 0.5, '#9fe8ff', 0.7);
        break;
      case 'bonk': this.floatWord(Kit.lang.t('BOING!'), ev.x, ev.y + KID_H + 0.6, '#ff7ad1', 1); this.shake = 0.25; break;
      case 'take': {
        const p = kid(ev.i);
        this.ring(ev.x, ev.y + 0.4, ev.kind === 'freeze' ? '#bff0ff' : '#ffd23f', ev.kind === 'freeze');
        if (ev.pts) this.floatWord(`+${ev.pts}`, ev.x, ev.y + 1.2, '#ffd23f', 0.8);
        if (p) this.burst(p.x, p.y + 1, 14, ['#ffd23f', '#ffffff'], { speed: 2 });
        break;
      }
      case 'freeze': {
        const B = this.buddy;
        if (ev.by === 'clock' || !B) this.ring(W / 2, H / 2, '#bff0ff', true);
        else this.ring(B.root.position.x, B.root.position.y + 0.6, '#bff0ff', true);
        break;
      }
      case 'gift': {
        const B = this.buddy, p = sim.players[0];
        if (B) this.toss(ev.emoji, () => [B.root.position.x, B.root.position.y + 0.8], () => [p.x, p.y + 1.3]);
        break;
      }
      case 'clear':
        for (let k = 0; k < 5; k++) this.burst(2 + k * 3, H - 0.5, 40, ['#ff4f6d', '#ffd23f', '#3fb3ff', '#5fd35a', '#ff7ad1', '#b77bff'], { speed: 2, up: 0, w: 2, life: 3 });
        break;
      case 'done':
        for (let k = 0; k < 8; k++) this.burst(1 + k * 2, H - 0.3, 50, ['#ff4f6d', '#ffd23f', '#3fb3ff', '#5fd35a', '#ff7ad1', '#b77bff'], { speed: 2, up: 0, w: 2, life: 4 });
        break;
      case 'highfive':
        for (const p of sim.players) this.burst(p.x, p.y + 1.6, 20, ['#ffd23f', '#ffffff', '#ff7ad1'], { speed: 3 });
        break;
      case 'level': this.buildLevel(sim); break;
    }
  };

  // ---------------------------------------------------------------- every frame
  View.prototype.update = function (sim, dt) {
    this.t += dt;
    this.sim = sim;
    this.bounced = [];
    if (this.level !== sim.level || this.levelSim !== sim) this.buildLevel(sim);
    const frozen = sim.freezeT > 0;
    // blocks
    sim.blocks.forEach((k, i) => { if (this.blockMeshes[i]) this.blockMeshes[i].visible = !k.gone; });
    // balloons
    const seen = new Set();
    for (const b of sim.balloons) {
      seen.add(b.id);
      let v = this.balloons.get(b.id);
      if (!v) { v = this.makeBalloon(b); this.balloons.set(b.id, v); this.dyn.add(v.g); }
      const r = RADIUS[b.s];
      if (v.vy < 0 && b.vy > 0) { v.squash = 0.16; this.bounced.push(b.s); }
      v.vy = b.vy;
      v.squash = Math.max(0, v.squash - dt);
      const sq = v.squash > 0 ? Math.sin((v.squash / 0.16) * Math.PI) * 0.16 : 0;
      v.age += dt;
      const grow = Math.min(1, 0.55 + v.age * 4);
      v.body.scale.set(r * (1 + sq * 0.6) * grow, r * (1.06 - sq) * grow, r * grow);
      v.g.position.set(b.x, b.y - sq * r * 0.4, 0);
      if (v.frozen !== frozen) {
        v.frozen = frozen;
        v.body.material = balloonMat(b.c, frozen);
        v.face.material = faceMat(frozen ? 'frozen' : 'happy');
      }
      v.flake.visible = frozen;
      if (frozen) { v.flake.material.rotation = this.t * 1.5 + b.id; v.flake.position.set(r * 0.55, r * 0.6, r + 0.1); }
      v.face.position.z = r * 1.0 + 0.02;
      v.face.scale.setScalar(r * 1.25 * grow);
      v.face.position.x = frozen ? Math.sin(this.t * 40) * 0.02 : 0;
      v.knot.position.y = -r * 1.06 * grow;
      v.string.position.y = -r * 1.06 * grow - 0.08 - r * 0.45;
      v.string.scale.y = r * 0.9;
      v.string.rotation.z = Math.sin(this.t * 3 + b.id) * 0.25 - b.vx * 0.04;
      v.shine.position.set(-r * 0.38, r * 0.45, r * 0.8);
      v.shine.scale.setScalar(r * 0.55);
    }
    for (const [id, v] of this.balloons) if (!seen.has(id)) { this.dyn.remove(v.g); this.balloons.delete(id); }
    // ropes
    sim.ropes.forEach((rope, i) => {
      let v = this.ropes[i];
      if (!v) { v = this.makeRope(); this.ropes.push(v); this.dyn.add(v.g); }
      v.g.visible = true;
      const y0 = rope.base + 0.35, len = Math.max(0.05, rope.tip - y0);
      v.line.scale.set(1, len, 1);
      v.line.position.set(rope.x, y0 + len / 2, ROPE_Z);
      v.line.material = rope.sticky ? v.mats[1] : v.mats[0];
      v.line.material.map.repeat.set(1, len * 3);
      v.line.material.map.offset.y = -this.t * 2;
      v.head.position.set(rope.x, rope.tip, ROPE_Z);
      v.head.material = rope.sticky ? v.headMats[1] : v.headMats[0];
      v.head.scale.set(rope.stuck ? 1.5 : 1, rope.stuck ? 0.6 : 1, 1);
      if (rope.stuck && rope.t > BP.STICK_T - 1) v.g.visible = Math.floor(this.t * 10) % 2 === 0;
    });
    for (let i = sim.ropes.length; i < this.ropes.length; i++) this.ropes[i].g.visible = false;
    // power-ups
    const seenI = new Set();
    for (const it of sim.items) {
      seenI.add(it.id);
      let v = this.items.get(it.id);
      if (!v) { v = { s: sprite(A.badge(it.kind), 0.85) }; this.items.set(it.id, v); this.dyn.add(v.s); }
      v.s.position.set(it.x, it.y + 0.45 + (it.rest ? Math.abs(Math.sin(this.t * 4 + it.id)) * 0.15 : 0), 0.7);
      v.s.visible = !(it.t > 5 && Math.floor(this.t * 8) % 2);
    }
    for (const [id, v] of this.items) if (!seenI.has(id)) { this.dyn.remove(v.s); this.items.delete(id); }
    // kids
    sim.players.forEach((pl, i) => this.updateKid(this.kids[i], pl, sim, dt));
    this.updateBuddy(sim, dt);
    // the freeze glow
    this.frost.material.opacity += ((frozen ? 0.16 + Math.sin(this.t * 4) * 0.03 : 0) - this.frost.material.opacity) * Math.min(1, dt * 8);
    // effects
    for (const f of this.fx) { f.t += dt; f.fn(f, Math.min(1, f.t / f.life)); }
    this.fx = this.fx.filter((f) => { if (f.t >= f.life) { this.dyn.remove(f.obj); return false; } return true; });
    this.stepConfetti(dt);
    if ((sim.state === 'clear' || sim.state === 'done') && Math.random() < dt * 5) this.burst(1 + Math.random() * (W - 2), H - 0.2, 8, ['#ff4f6d', '#ffd23f', '#3fb3ff', '#5fd35a', '#ff7ad1'], { speed: 1, up: 0, life: 3 });
    // camera shake
    this.shake = Math.max(0, this.shake - dt);
    const s = this.shake * 0.5;
    this.camera.position.x = this.camX + (s ? (Math.random() - 0.5) * s : 0);
    this.camera.position.y = this.camY + (s ? (Math.random() - 0.5) * s : 0);
  };

  View.prototype.makeBalloon = function (b) {
    const g = new T.Group();
    const body = new T.Mesh(sphereGeo, balloonMat(b.c, false));
    body.castShadow = true;
    g.add(body);
    const face = new T.Mesh(planeGeo, faceMat('happy'));
    g.add(face);
    const shine = new T.Mesh(planeGeo, shineMat);
    g.add(shine);
    const knot = new T.Mesh(knotGeo, balloonMat(b.c, false));
    knot.rotation.x = Math.PI;
    g.add(knot);
    const string = new T.Mesh(stringGeo, stringMat);
    g.add(string);
    const flake = sprite(A.flake(), 0.5);
    flake.visible = false;
    g.add(flake);
    return { g, body, face, shine, knot, string, flake, squash: 0, vy: b.vy, frozen: false, age: 0 };
  };

  View.prototype.makeRope = function () {
    const g = new T.Group();
    const mats = [false, true].map((s) => new T.MeshStandardMaterial({ map: A.rope(s).clone(), roughness: 0.8 }));
    for (const m of mats) { m.map.needsUpdate = true; m.map.wrapS = m.map.wrapT = T.RepeatWrapping; }
    const line = new T.Mesh(ropeGeo, mats[0]);
    g.add(line);
    const headMats = [new T.MeshStandardMaterial({ color: '#ff4f6d', roughness: 0.4 }), new T.MeshStandardMaterial({ color: '#ffb3d9', roughness: 0.3 })];
    const head = new T.Mesh(new T.SphereGeometry(0.22, 14, 10, 0, Math.PI * 2, 0, Math.PI / 1.6), headMats[0]);
    g.add(head);
    return { g, line, head, mats, headMats };
  };

  View.prototype.updateKid = function (K, pl, sim, dt) {
    if (!K) return;
    const k = 1 - Math.exp(-16 * dt);
    K.root.position.set(pl.x, pl.y, 0.2);
    let mode = 'stand', rot = Math.PI;
    if (sim.state === 'clear' || sim.state === 'done') { mode = signature(pl.who, this.t); rot = Math.PI; }
    else if (pl.st === 'bonk') { mode = 'fall'; rot = K.rot + dt * 9; }
    else if (pl.st === 'climb') { mode = 'climb'; rot = 0; }
    else if (pl.st === 'fall') { mode = 'jump'; rot = pl.face > 0 ? -Math.PI / 2 - 0.45 : pl.face < 0 ? Math.PI / 2 + 0.45 : Math.PI; }
    else if (pl.poseT > 0 && pl.pose === 'throw') { mode = 'throw'; rot = Math.PI; }
    else if (pl.poseT > 0 && pl.pose === 'hi5') { mode = 'hi5'; rot = Math.PI; }
    else if (pl.moving) { mode = 'walk'; rot = pl.moving > 0 ? -Math.PI / 2 - 0.45 : Math.PI / 2 + 0.45; }
    if (pl.st === 'bonk') K.rot = rot;
    else K.rot = lerpAngle(K.rot, rot, 1 - Math.exp(-14 * dt));
    K.p.root.rotation.y = K.rot;
    if (mode === 'walk') K.ph += dt * 11;
    else if (mode === 'climb') K.ph += dt * (pl.climbing ? 9 : 0);
    else K.ph += dt * 6;
    pose(K.p, K.ph, mode, k);
    K.ball.visible = mode === 'jumpshot';
    if (K.ball.visible) {
      const hop = Math.abs(Math.sin(this.t * 3.2));
      K.root.position.y = pl.y + hop * 0.45;
      K.ball.position.set(0.05, KID_H + 0.25 + hop * 0.6, 0.2);
    }
    // stars spin over a bonked kid's head
    K.stars.visible = pl.st === 'bonk';
    if (K.stars.visible) K.stars.children.forEach((s, j) => { const a = this.t * 6 + (j * Math.PI * 2) / 3; s.position.set(Math.cos(a) * 0.45, Math.sin(a * 2) * 0.06, Math.sin(a) * 0.3); });
    // blinking while safe after a bump
    K.root.visible = !(pl.safe > 0 && pl.st !== 'bonk' && Math.floor(this.t * 12) % 2 === 0);
    K.power.visible = !!pl.power;
    if (pl.power && K.powerKind !== pl.power) { K.powerKind = pl.power; K.power.material.map = A.badge(pl.power); K.power.material.needsUpdate = true; }
    if (K.power.visible) K.power.position.y = KID_H + 0.42 + Math.sin(this.t * 5) * 0.06;
  };

  // the brother on his cloud in a top corner
  View.prototype.updateBuddy = function (sim, dt) {
    const B = sim.buddy;
    if (!B) { if (this.buddy) { this.dyn.remove(this.buddy.root); this.buddy = null; } return; }
    if (!this.buddy || this.buddy.who !== B.id) {
      if (this.buddy) this.dyn.remove(this.buddy.root);
      const K = this.makeKid(B.id, Kit.roster.get(B.id).buddyScale || 0.75);
      const cloud = new T.Group();
      const cm = new T.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9 });
      for (const [x, y, r] of [[-0.55, 0, 0.42], [0, 0.1, 0.55], [0.55, 0, 0.42], [0.2, -0.15, 0.4], [-0.25, -0.15, 0.4]]) {
        const m = new T.Mesh(sphereGeo, cm);
        m.scale.setScalar(r);
        m.position.set(x, y - 0.25, 0);
        cloud.add(m);
      }
      K.root.add(cloud);
      K.cloud = cloud;
      this.dyn.add(K.root);
      this.buddy = K;
    }
    const K = this.buddy;
    const x = B.side > 0 ? W - 1.5 : 1.5, y = H - 2.75;
    let sc = 1;
    if (B.state === 'enter') sc = Math.min(1, B.t / 0.4) * (1 + Math.sin(Math.min(1, B.t / 0.5) * Math.PI) * 0.25);
    if (B.state === 'leave') sc = Math.max(0, 1 - B.t / 0.4);
    K.root.scale.setScalar(Math.max(0.001, sc));
    K.root.position.set(x, y + Math.sin(this.t * 2) * 0.08, 0.6);
    const mode = B.state === 'hello' ? signature(B.id, B.t + (B.id === 'teddy' ? 0 : 0)) : B.state === 'give' ? 'give' : B.state === 'cast' ? 'jumpshot' : B.state === 'bye' ? 'wave' : 'stand';
    K.ph += dt * 6;
    K.p.root.rotation.y = lerpAngle(K.p.root.rotation.y, Math.PI, 0.2);
    pose(K.p, K.ph, mode, 1 - Math.exp(-14 * dt));
    K.stars.visible = false;
  };

  // ---------------------------------------------------------------- camera
  View.prototype.fit = function (force) {
    const c = this.canvas, w = c.clientWidth || window.innerWidth, h = c.clientHeight || window.innerHeight;
    const key = JSON.stringify(this.margins);
    if (!force && w === this.size[0] && h === this.size[1] && this.marginKey === key) return;
    this.size = [w, h];
    this.marginKey = key;
    this.renderer.setSize(w, h, false);
    const mg = this.margins, B = this.box;
    const bw = B.x1 - B.x0, bh = B.y1 - B.y0;
    const availW = Math.max(100, w - mg.left - mg.right), availH = Math.max(100, h - mg.top - mg.bottom);
    const ppu = Math.min(availW / bw, availH / bh);
    let cx = mg.left + availW / 2;
    if (Math.abs(cx - w / 2) > 1 && w / 2 - (bw * ppu) / 2 >= mg.left && w / 2 + (bw * ppu) / 2 <= w - mg.right) cx = w / 2;
    const cy = mg.top + availH / 2;
    const vh = h / ppu;
    const d = vh / 2 / Math.tan(T.MathUtils.degToRad(this.camera.fov / 2));
    this.camX = (B.x0 + B.x1) / 2 - (cx - w / 2) / ppu;
    this.camY = (B.y0 + B.y1) / 2 + (cy - h / 2) / ppu;
    this.camera.aspect = w / h;
    this.camera.position.set(this.camX, this.camY, d);
    this.camera.lookAt(this.camX, this.camY, 0);
    this.camera.updateProjectionMatrix();
    this.ppu = ppu;
    this.screenW = w;
    this.screenH = h;
  };
  View.prototype.screenX = function (x) { return this.screenW / 2 + (x - this.camX) * this.ppu; };
  View.prototype.screenY = function (y) { return this.screenH / 2 - (y - this.camY) * this.ppu; };
  // where a 3D object really is on the screen (through the camera, as drawn): the play check uses this
  View.prototype.project = function (obj) {
    obj.updateWorldMatrix(true, false);
    const p = new T.Vector3().setFromMatrixPosition(obj.matrixWorld).project(this.camera);
    return { x: ((p.x + 1) / 2) * this.screenW, y: ((1 - p.y) / 2) * this.screenH };
  };
  View.prototype.kidOnScreen = function (i) { const K = this.kids[i]; return K && this.project(K.p.head); };
  View.prototype.render = function () { this.renderer.render(this.scene, this.camera); };

  BP.View = View;
})();
