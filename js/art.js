/* TT Bounce Pop: everything drawn on a canvas (no image files). Our own kid-style drawings of ten world landmarks,
   each at four times of day (morning, daytime, sunset, night with a smiling moon), the balloons' googly faces, toy and
   glass blocks, wooden floor boards, the rope and the power-up badges. Exposes BP.art. */
(function () {
  'use strict';
  const BP = (window.BP = window.BP || {});
  const G = Kit.gfx;
  const INK = '#2a2340';
  const CW = 1024, CH = 640, GY = 560;  // the backdrop canvas; GY: where the ground meets the field's floor

  // ---------------------------------------------------------------- helpers
  function path(g, pts, close = true) {
    g.beginPath();
    g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
    if (close) g.closePath();
  }
  function fillLine(g, fill, lw = 5) {
    g.fillStyle = fill;
    g.fill();
    g.lineWidth = lw;
    g.strokeStyle = INK;
    g.stroke();
  }
  function rect(g, x, y, w, h, fill, lw = 5) { g.beginPath(); g.rect(x, y, w, h); fillLine(g, fill, lw); }
  function circle(g, x, y, r, fill, lw = 5) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); fillLine(g, fill, lw); }
  function cloud(g, x, y, s, col) {
    g.fillStyle = col;
    for (const [dx, dy, r] of [[0, 0, 34], [38, -14, 42], [80, 0, 32], [40, 12, 34]]) { g.beginPath(); g.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2); g.fill(); }
  }
  function hills(g, y, h, col, seed) {
    g.beginPath();
    g.moveTo(0, CH);
    for (let x = 0; x <= CW; x += 16) g.lineTo(x, y - Math.sin(x / 140 + seed) * h - Math.sin(x / 61 + seed * 2) * h * 0.25);
    g.lineTo(CW, CH);
    g.closePath();
    g.fillStyle = col;
    g.fill();
  }
  function tree(g, x, y, s, col = '#4fbf5a') {
    rect(g, x - 5 * s, y - 26 * s, 10 * s, 26 * s, '#9a6a3f', 3);
    circle(g, x, y - 40 * s, 22 * s, col, 3);
  }
  function water(g, y, col) {
    g.fillStyle = col;
    g.fillRect(0, y, CW, CH - y);
    g.strokeStyle = 'rgba(255,255,255,0.55)';
    g.lineWidth = 4;
    g.lineCap = 'round';
    for (let k = 0; k < 14; k++) {
      const x = (k * 157) % CW, yy = y + 18 + ((k * 37) % Math.max(20, CH - y - 30));
      g.beginPath();
      g.moveTo(x, yy);
      g.quadraticCurveTo(x + 15, yy - 7, x + 30, yy);
      g.stroke();
    }
  }

  // ---------------------------------------------------------------- times of day
  const TOD = [
    { sky: ['#8fd3ff', '#ffe0ee'], sun: '#ffe680', sx: 170, sy: 210, cloud: '#ffffff', hill: ['#a6e58c', '#6fcf6a'] },          // morning
    { sky: ['#43b9ff', '#c4efff'], sun: '#fff27a', sx: 860, sy: 110, cloud: '#ffffff', hill: ['#98e07e', '#55c260'] },          // daytime
    { sky: ['#7d63e8', '#ff8f6b', '#ffd27a'], sun: '#ff6b4f', sx: 780, sy: 330, cloud: '#ffd0e8', hill: ['#c79b6b', '#a77e58'], tint: 'rgba(255,140,90,0.22)' },
    { sky: ['#101a52', '#33479f'], moon: true, sx: 820, sy: 120, cloud: 'rgba(200,210,255,0.25)', hill: ['#3b5f8e', '#2b4a75'], tint: 'rgba(40,50,140,0.42)' },
  ];

  function sky(g, P) {
    const gr = g.createLinearGradient(0, 0, 0, GY);
    P.sky.forEach((c, i) => gr.addColorStop(i / (P.sky.length - 1), c));
    g.fillStyle = gr;
    g.fillRect(0, 0, CW, CH);
    if (!P.moon) {
      const glow = g.createRadialGradient(P.sx, P.sy, 10, P.sx, P.sy, 130);
      glow.addColorStop(0, 'rgba(255,255,220,0.7)');
      glow.addColorStop(1, 'rgba(255,255,220,0)');
      g.fillStyle = glow;
      g.fillRect(P.sx - 140, P.sy - 140, 280, 280);
      circle(g, P.sx, P.sy, 52, P.sun, 0.01);
      // a sleepy happy sun face
      g.strokeStyle = 'rgba(160,80,20,0.75)';
      g.lineWidth = 5;
      g.lineCap = 'round';
      for (const dx of [-17, 17]) { g.beginPath(); g.arc(P.sx + dx, P.sy - 6, 7, Math.PI * 0.1, Math.PI * 0.9); g.stroke(); }
      g.beginPath();
      g.arc(P.sx, P.sy + 8, 16, Math.PI * 0.15, Math.PI * 0.85);
      g.stroke();
    }
    for (let k = 0; k < 4; k++) cloud(g, 60 + k * 260 + (k % 2) * 60, 90 + (k % 3) * 55, 0.9 + (k % 2) * 0.3, P.cloud);
  }

  function night(g, P) {
    if (!P.moon) return;
    // stars that twinkle in a friendly way, and a smiling moon
    g.fillStyle = '#fff6c8';
    for (let k = 0; k < 60; k++) {
      const x = (k * 173) % CW, y = (k * 97) % 330 + 10, r = 1.5 + (k % 3);
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
    const glow = g.createRadialGradient(P.sx, P.sy, 20, P.sx, P.sy, 140);
    glow.addColorStop(0, 'rgba(255,250,200,0.5)');
    glow.addColorStop(1, 'rgba(255,250,200,0)');
    g.fillStyle = glow;
    g.fillRect(P.sx - 150, P.sy - 150, 300, 300);
    circle(g, P.sx, P.sy, 50, '#fff3b0', 0.01);
    g.strokeStyle = 'rgba(150,120,40,0.8)';
    g.lineWidth = 5;
    g.lineCap = 'round';
    for (const dx of [-16, 16]) { g.beginPath(); g.arc(P.sx + dx, P.sy - 6, 7, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
    g.beginPath();
    g.arc(P.sx, P.sy + 6, 15, Math.PI * 0.15, Math.PI * 0.85);
    g.stroke();
    g.fillStyle = 'rgba(255,150,170,0.6)';
    for (const dx of [-28, 28]) { g.beginPath(); g.arc(P.sx + dx, P.sy + 10, 7, 0, Math.PI * 2); g.fill(); }
  }

  // ---------------------------------------------------------------- the ten places
  const PLACES = [
    // the Great Wall: green hills and the wall snaking over them, with watchtowers
    function wall(g, P) {
      hills(g, 400, 60, P.hill[0], 1);
      hills(g, 470, 50, P.hill[1], 3);
      const pts = [[-20, 500], [140, 430], [290, 470], [450, 350], [600, 410], [770, 310], [900, 380], [1050, 340]];
      g.lineJoin = 'round';
      g.lineCap = 'round';
      path(g, pts, false);
      g.strokeStyle = INK;
      g.lineWidth = 50;
      g.stroke();
      g.strokeStyle = '#dcc08f';
      g.lineWidth = 40;
      g.stroke();
      // the battlements along its top
      for (let i = 0; i < pts.length - 1; i++) {
        const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
        const len = Math.hypot(x1 - x0, y1 - y0), n = Math.floor(len / 30);
        for (let k = 0; k < n; k++) {
          const t = (k + 0.5) / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
          if (k % 2 === 0) rect(g, x - 8, y - 34, 16, 16, '#dcc08f', 3);
        }
      }
      for (const [x, y] of [pts[3], pts[5], pts[1]]) {
        rect(g, x - 40, y - 80, 80, 70, '#e6cc9a');
        path(g, [[x - 52, y - 80], [x, y - 116], [x + 52, y - 80]]);
        fillLine(g, '#c0503a');
        rect(g, x - 12, y - 52, 24, 30, '#5b4636', 3);
      }
      hills(g, 560, 18, P.hill[1], 5);
    },
    // the Eiffel Tower over Paris roofs
    function eiffel(g, P) {
      hills(g, 520, 12, P.hill[0], 2);
      for (let k = 0; k < 9; k++) {
        const x = k * 120 - 20, h = 60 + (k % 3) * 25;
        if (x > 330 && x < 640) continue;
        rect(g, x, GY - h, 100, h, '#f2e3c8', 4);
        path(g, [[x - 6, GY - h], [x + 50, GY - h - 34], [x + 106, GY - h]]);
        fillLine(g, '#6c7fb0', 4);
        for (let w = 0; w < 3; w++) rect(g, x + 14 + w * 28, GY - h + 18, 14, 18, '#ffe9a0', 3);
      }
      const L = [[372, GY], [440, 420], [482, 260], [500, 140], [506, 70]];
      const pts = L.concat(L.slice().reverse().map(([x, y]) => [1024 - x, y]));
      path(g, pts);
      fillLine(g, '#b06a43', 6);
      g.save();
      path(g, pts);
      g.clip();
      g.strokeStyle = 'rgba(70,35,20,0.55)';
      g.lineWidth = 3;
      for (let k = -40; k < 40; k++) { g.beginPath(); g.moveTo(512 + k * 22, 60); g.lineTo(512 + k * 22 + 520, GY); g.stroke(); g.beginPath(); g.moveTo(512 + k * 22, 60); g.lineTo(512 + k * 22 - 520, GY); g.stroke(); }
      g.restore();
      // the big arch between its legs
      g.beginPath();
      g.moveTo(420, GY);
      g.quadraticCurveTo(512, 400, 604, GY);
      g.closePath();
      fillLine(g, P.hill[0], 5);
      rect(g, 410, 412, 204, 18, '#8a4e30');
      rect(g, 462, 262, 100, 14, '#8a4e30');
      rect(g, 494, 140, 36, 12, '#8a4e30');
      rect(g, 509, 40, 6, 34, '#8a4e30', 3);
      tree(g, 330, GY, 1.4);
      tree(g, 700, GY, 1.3);
    },
    // the pyramids in the desert, with a palm tree
    function pyramids(g, P) {
      hills(g, 500, 26, P.tint ? '#e3b46c' : '#f3d27e', 1);
      const pyr = (x0, x1, top, ax) => {
        path(g, [[x0, GY], [ax, top], [ax, GY]]);
        fillLine(g, '#f6cf74');
        path(g, [[ax, top], [x1, GY], [ax, GY]]);
        fillLine(g, '#d79a45');
        g.save();
        path(g, [[x0, GY], [ax, top], [x1, GY]]);
        g.clip();
        g.strokeStyle = 'rgba(120,70,20,0.35)';
        g.lineWidth = 3;
        for (let y = top + 30; y < GY; y += 30) { g.beginPath(); g.moveTo(0, y); g.lineTo(CW, y); g.stroke(); }
        g.restore();
      };
      pyr(80, 340, 340, 210);
      pyr(620, 960, 270, 790);
      pyr(290, 730, 150, 510);
      hills(g, 575, 10, '#f0c66d', 4);
      // a palm tree
      g.lineWidth = 16;
      g.strokeStyle = INK;
      g.beginPath(); g.moveTo(930, GY); g.quadraticCurveTo(905, 470, 930, 400); g.stroke();
      g.lineWidth = 10;
      g.strokeStyle = '#a0703f';
      g.stroke();
      for (const a of [-2.6, -1.9, -1.2, -0.5, 0.2]) {
        g.beginPath();
        g.ellipse(930 + Math.cos(a) * 46, 400 + Math.sin(a) * 26, 50, 13, a, 0, Math.PI * 2);
        fillLine(g, '#4fbf5a', 3);
      }
    },
    // Big Ben by the river
    function bigben(g, P) {
      water(g, 520, '#4a8fd6');
      rect(g, 40, 400, 500, 120, '#e8cf98');
      for (let x = 60; x < 540; x += 44) {
        rect(g, x, 430, 20, 34, '#7a6a55', 3);
        path(g, [[x - 4, 400], [x + 10, 360], [x + 24, 400]]);
        fillLine(g, '#e8cf98', 3);
      }
      rect(g, 560, 170, 110, 350, '#e8cf98');
      for (let y = 300; y < 500; y += 40) rect(g, 590, y, 50, 22, '#7a6a55', 3);
      rect(g, 548, 150, 134, 30, '#d9b878');
      circle(g, 615, 230, 44, '#fff8e6', 6);
      g.strokeStyle = INK;
      g.lineWidth = 6;
      g.lineCap = 'round';
      g.beginPath(); g.moveTo(615, 230); g.lineTo(615, 198); g.moveTo(615, 230); g.lineTo(638, 236); g.stroke();
      for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; g.beginPath(); g.moveTo(615 + Math.cos(a) * 34, 230 + Math.sin(a) * 34); g.lineTo(615 + Math.cos(a) * 39, 230 + Math.sin(a) * 39); g.lineWidth = 3; g.stroke(); }
      path(g, [[560, 150], [615, 40], [670, 150]]);
      fillLine(g, '#5b6f9a');
      rect(g, 611, 14, 8, 30, '#ffd23f', 3);
      tree(g, 760, 520, 1.6);
      tree(g, 860, 520, 1.3);
    },
    // the opera house's white shells by the harbour, a bridge far away
    function opera(g, P) {
      water(g, 470, '#3f8fe0');
      g.strokeStyle = 'rgba(60,60,90,0.7)';
      g.lineWidth = 12;
      g.beginPath(); g.moveTo(-20, 450); g.quadraticCurveTo(160, 300, 340, 450); g.stroke();
      g.lineWidth = 6;
      g.beginPath(); g.moveTo(-20, 430); g.lineTo(340, 430); g.stroke();
      rect(g, 300, 470, 520, 60, '#f0dcc0');
      const shell = (x, w, h, lean) => {
        g.beginPath();
        g.moveTo(x, 472);
        g.quadraticCurveTo(x + lean, 472 - h * 0.9, x + w * 0.6 + lean, 472 - h);
        g.quadraticCurveTo(x + w * 0.8, 472 - h * 0.45, x + w, 472);
        g.closePath();
        fillLine(g, '#fbfbf6');
        g.save();
        g.clip();
        g.strokeStyle = 'rgba(120,130,160,0.45)';
        g.lineWidth = 3;
        for (let k = 1; k < 6; k++) { g.beginPath(); g.moveTo(x + (w * k) / 6, 472); g.lineTo(x + w * 0.6 + lean, 472 - h); g.stroke(); }
        g.restore();
      };
      shell(330, 150, 150, -30);
      shell(420, 170, 200, -20);
      shell(530, 170, 230, -10);
      shell(640, 150, 170, 10);
      shell(720, 110, 110, 10);
    },
    // the leaning tower on its lawn, a little church beside it
    function pisa(g, P) {
      hills(g, 520, 10, P.hill[0], 1);
      rect(g, 80, 420, 260, 140, '#f6eedb');
      g.beginPath(); g.arc(210, 420, 64, Math.PI, 0); fillLine(g, '#e9dcc0');
      for (let x = 100; x < 330; x += 36) { g.beginPath(); g.arc(x + 12, 470, 12, Math.PI, 0); g.lineTo(x + 24, 500); g.lineTo(x, 500); g.closePath(); fillLine(g, '#b3a58a', 3); }
      g.save();
      g.translate(600, GY);
      g.rotate(0.14);
      rect(g, -70, -400, 140, 400, '#f7f0de');
      for (let k = 0; k < 7; k++) {
        const y = -60 - k * 50;
        g.strokeStyle = INK;
        g.lineWidth = 4;
        g.beginPath(); g.moveTo(-74, y); g.lineTo(74, y); g.stroke();
        for (let a = -56; a <= 56; a += 28) { g.beginPath(); g.arc(a, y - 22, 9, Math.PI, 0); g.lineTo(a + 9, y - 6); g.lineTo(a - 9, y - 6); g.closePath(); fillLine(g, '#c9bd9f', 2.5); }
      }
      rect(g, -48, -455, 96, 55, '#f7f0de');
      g.beginPath(); g.arc(0, -455, 30, Math.PI, 0); fillLine(g, '#e2d6bb');
      g.restore();
      tree(g, 860, GY, 1.4);
      tree(g, 940, GY, 1.1);
    },
    // the Taj Mahal with its big round dome, towers and the long pool
    function taj(g, P) {
      hills(g, 520, 6, P.hill[1], 2);
      rect(g, 240, 480, 544, 40, '#f4f0ea');
      for (const x of [270, 754]) {
        rect(g, x - 14, 240, 28, 240, '#fbf8f2');
        g.beginPath(); g.arc(x, 240, 20, Math.PI, 0); fillLine(g, '#fbf8f2');
        rect(g, x - 2, 202, 4, 18, '#ffd23f', 2);
      }
      rect(g, 360, 320, 304, 160, '#fbf8f2');
      g.beginPath();
      g.moveTo(470, 480); g.lineTo(470, 390); g.quadraticCurveTo(512, 330, 554, 390); g.lineTo(554, 480); g.closePath();
      fillLine(g, '#d7e3f0');
      for (const x of [390, 610]) { g.beginPath(); g.moveTo(x, 470); g.lineTo(x, 420); g.quadraticCurveTo(x + 12, 398, x + 24, 420); g.lineTo(x + 24, 470); g.closePath(); fillLine(g, '#d7e3f0', 3); }
      rect(g, 470, 290, 84, 34, '#fbf8f2');
      g.beginPath();
      g.moveTo(452, 300);
      g.bezierCurveTo(400, 230, 470, 180, 512, 120);
      g.bezierCurveTo(554, 180, 624, 230, 572, 300);
      g.closePath();
      fillLine(g, '#ffffff', 6);
      rect(g, 509, 92, 6, 30, '#ffd23f', 3);
      for (const x of [380, 644]) { g.beginPath(); g.arc(x, 320, 26, Math.PI, 0); fillLine(g, '#ffffff'); }
      g.fillStyle = '#6fb6ff';
      g.fillRect(440, 520, 144, 120);
      g.strokeStyle = INK;
      g.lineWidth = 4;
      g.strokeRect(440, 520, 144, 120);
      for (const x of [400, 340, 624, 684]) { g.beginPath(); g.ellipse(x, 520, 14, 42, 0, 0, Math.PI * 2); fillLine(g, '#2f8f4a', 3); }
    },
    // Mount Fuji with its snowy top, a pagoda and cherry trees
    function fuji(g, P) {
      path(g, [[60, GY], [420, 190], [604, 190], [964, GY]]);
      fillLine(g, '#6f86dd', 6);
      path(g, [[420, 190], [604, 190], [680, 270], [640, 255], [600, 290], [560, 250], [520, 295], [480, 250], [440, 290], [400, 255], [350, 275]]);
      fillLine(g, '#ffffff', 5);
      water(g, 520, '#5aa8ef');
      const pg = 170;
      for (let k = 0; k < 5; k++) {
        const y = GY - 40 - k * 62, w = 120 - k * 16;
        rect(g, pg - w / 2 + 14, y - 34, w - 28, 40, '#e8553a', 4);
        path(g, [[pg - w / 2 - 12, y - 30], [pg, y - 62], [pg + w / 2 + 12, y - 30]]);
        fillLine(g, '#5b4636', 4);
      }
      rect(g, pg - 3, GY - 380, 6, 40, '#ffd23f', 3);
      for (const [x, y, s] of [[820, 560, 1.6], [900, 560, 1.2], [740, 560, 1.1]]) tree(g, x, y, s, '#ffb3d1');
    },
    // the big orange bridge over the bay
    function bridge(g, P) {
      hills(g, 430, 50, P.hill[1], 2);
      water(g, 450, '#3f86d6');
      const red = '#e8553a';
      g.strokeStyle = INK;
      g.lineWidth = 9;
      g.beginPath(); g.moveTo(-20, 330); g.quadraticCurveTo(140, 330, 290, 150); g.quadraticCurveTo(512, 520, 734, 150); g.quadraticCurveTo(884, 330, 1044, 330); g.stroke();
      g.strokeStyle = red;
      g.lineWidth = 5;
      g.stroke();
      g.lineWidth = 3;
      for (let x = 10; x < 1024; x += 34) {
        let y;
        if (x < 290) y = 330 - (180 * (x + 20)) / 310 * ((x + 20) / 310);
        else if (x < 734) { const t = (x - 290) / 444; y = (1 - t) * (1 - t) * 150 + 2 * (1 - t) * t * 520 + t * t * 150; } else y = 150 + (180 * (x - 734)) / 310 * ((x - 734) / 310);
        g.beginPath(); g.moveTo(x, y); g.lineTo(x, 410); g.stroke();
      }
      rect(g, -10, 404, 1044, 22, red, 5);
      for (const x of [290, 734]) {
        rect(g, x - 34, 140, 18, 400, red, 4);
        rect(g, x + 16, 140, 18, 400, red, 4);
        for (const y of [160, 240, 330]) rect(g, x - 34, y, 68, 14, red, 3);
      }
      cloud(g, 820, 400, 0.9, 'rgba(255,255,255,0.75)');
    },
    // the big green statue with her torch, on her island
    function liberty(g, P) {
      water(g, 480, '#3f86d6');
      path(g, [[300, 520], [340, 470], [690, 470], [730, 520]]);
      fillLine(g, '#7cc56a');
      rect(g, 440, 330, 144, 160, '#d9c7a6');
      rect(g, 425, 320, 174, 22, '#cbb894');
      const green = '#6fd0a8';
      path(g, [[470, 322], [490, 190], [536, 190], [556, 322]]);
      fillLine(g, green);
      g.strokeStyle = INK;
      g.lineWidth = 18;
      g.lineCap = 'round';
      g.beginPath(); g.moveTo(530, 205); g.lineTo(574, 98); g.stroke();
      g.strokeStyle = green;
      g.lineWidth = 11;
      g.stroke();
      rect(g, 560, 78, 30, 20, '#ffd23f', 4);
      g.beginPath(); g.moveTo(560, 80); g.quadraticCurveTo(575, 30, 590, 80); fillLine(g, '#ff9b2f', 4);
      rect(g, 456, 230, 30, 46, green, 4);
      circle(g, 513, 172, 24, green);
      for (let k = -3; k <= 3; k++) {
        const a = -Math.PI / 2 + k * 0.38;
        path(g, [[513 + Math.cos(a - 0.12) * 22, 172 + Math.sin(a - 0.12) * 22], [513 + Math.cos(a) * 48, 172 + Math.sin(a) * 48], [513 + Math.cos(a + 0.12) * 22, 172 + Math.sin(a + 0.12) * 22]]);
        fillLine(g, green, 3);
      }
      g.fillStyle = INK;
      for (const dx of [-8, 8]) { g.beginPath(); g.arc(513 + dx, 172, 3, 0, Math.PI * 2); g.fill(); }
      g.strokeStyle = INK;
      g.lineWidth = 3;
      g.beginPath(); g.arc(513, 178, 8, 0.2, Math.PI - 0.2); g.stroke();
    },
  ];

  const cache = new Map();
  // the backdrop for a place and a time of day (0 morning .. 3 night), as a texture; the last few are kept
  function backdrop(place, tod) {
    const key = place * 4 + tod;
    if (cache.has(key)) return cache.get(key);
    const [c, g] = G.makeCanvas(CW, CH);
    const P = TOD[tod];
    sky(g, P);
    if (P.moon) hills(g, 500, 30, P.hill[0], 4);
    g.lineJoin = 'round';
    PLACES[place](g, P);
    if (P.tint) {
      g.globalCompositeOperation = 'multiply';
      g.fillStyle = P.tint.replace(/rgba\((\d+),(\d+),(\d+),[\d.]+\)/, 'rgb($1,$2,$3)');
      g.globalAlpha = +P.tint.match(/([\d.]+)\)$/)[1] * 2.2;
      g.fillRect(0, 0, CW, CH);
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
    }
    night(g, P);
    // windows light up at night
    const tex = G.toTexture(c);
    cache.set(key, tex);
    if (cache.size > 6) {
      const old = cache.keys().next().value;
      cache.get(old).dispose();
      cache.delete(old);
    }
    return tex;
  }

  // ---------------------------------------------------------------- balloon faces: googly eyes and a smile
  const faces = {};
  function face(kind) {
    if (faces[kind]) return faces[kind];
    const [c, g] = G.makeCanvas(256, 256);
    g.lineCap = 'round';
    const eye = (x, y, r, look) => {
      g.fillStyle = '#ffffff';
      g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
      g.lineWidth = 6; g.strokeStyle = INK; g.stroke();
      g.fillStyle = INK;
      g.beginPath(); g.arc(x + look[0] * r * 0.38, y + look[1] * r * 0.38, r * 0.5, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#ffffff';
      g.beginPath(); g.arc(x + look[0] * r * 0.38 - r * 0.16, y + look[1] * r * 0.38 - r * 0.18, r * 0.15, 0, Math.PI * 2); g.fill();
    };
    if (kind === 'frozen') {
      eye(92, 104, 30, [0, 0.3]);
      eye(164, 104, 30, [0, 0.3]);
      // chattering teeth: brr!
      g.fillStyle = '#ffffff';
      g.strokeStyle = INK;
      g.lineWidth = 6;
      g.beginPath(); g.rect(88, 158, 80, 28); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(88, 172); for (let x = 88; x <= 168; x += 10) g.lineTo(x, x % 20 ? 166 : 178); g.stroke();
    } else {
      eye(92, 100, 30, kind === 'oops' ? [0, -0.6] : [0.2, 0.1]);
      eye(164, 100, 30, kind === 'oops' ? [0, -0.6] : [0.2, 0.1]);
      g.strokeStyle = INK;
      g.lineWidth = 9;
      g.beginPath();
      if (kind === 'oops') { g.arc(128, 172, 16, 0, Math.PI * 2); g.stroke(); }
      else { g.arc(128, 150, 40, Math.PI * 0.2, Math.PI * 0.8); g.stroke(); }
      g.fillStyle = 'rgba(255,120,150,0.55)';
      for (const x of [62, 194]) { g.beginPath(); g.arc(x, 150, 16, 0, Math.PI * 2); g.fill(); }
    }
    return (faces[kind] = G.toTexture(c));
  }

  // ---------------------------------------------------------------- blocks, floor, rope
  let toyTex = null;
  function toyBlock() {
    if (toyTex) return toyTex;
    const [c, g] = G.makeCanvas(128, 128);
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, 128, 128);
    g.strokeStyle = 'rgba(0,0,0,0.18)';
    g.lineWidth = 10;
    g.strokeRect(5, 5, 118, 118);
    g.fillStyle = 'rgba(255,255,255,0.0)';
    g.font = `bold 70px ${G.FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = 'rgba(0,0,0,0.16)';
    g.fillText('★', 64, 68);
    return (toyTex = G.toTexture(c));
  }
  let glassTex = null;
  function glass() {
    if (glassTex) return glassTex;
    const [c, g] = G.makeCanvas(128, 128);
    const gr = g.createLinearGradient(0, 0, 128, 128);
    gr.addColorStop(0, '#e9fbff');
    gr.addColorStop(1, '#9fe6ff');
    g.fillStyle = gr;
    g.fillRect(0, 0, 128, 128);
    g.strokeStyle = '#ffffff';
    g.lineWidth = 8;
    g.strokeRect(4, 4, 120, 120);
    g.lineWidth = 6;
    g.lineCap = 'round';
    g.beginPath(); g.moveTo(24, 40); g.lineTo(44, 20); g.moveTo(24, 64); g.lineTo(66, 22); g.stroke();
    return (glassTex = G.toTexture(c));
  }
  let floorTex = null;
  function floor() {
    if (floorTex) return floorTex;
    const [c, g] = G.makeCanvas(256, 64);
    const cols = ['#f2b45c', '#e9a04a', '#f6c26e', '#e39a44'];
    for (let k = 0; k < 4; k++) { g.fillStyle = cols[k]; g.fillRect(k * 64, 0, 64, 64); }
    g.strokeStyle = 'rgba(120,60,20,0.45)';
    g.lineWidth = 4;
    for (let k = 0; k <= 4; k++) { g.beginPath(); g.moveTo(k * 64, 0); g.lineTo(k * 64, 64); g.stroke(); }
    g.lineWidth = 2;
    for (let k = 0; k < 8; k++) { g.beginPath(); g.moveTo(k * 32 + 8, 20 + (k % 3) * 10); g.quadraticCurveTo(k * 32 + 20, 14, k * 32 + 28, 24 + (k % 2) * 8); g.stroke(); }
    return (floorTex = G.toTexture(c, [8, 1]));
  }
  const ropeTex = {};
  function rope(sticky) {
    const k = sticky ? 's' : 'n';
    if (ropeTex[k]) return ropeTex[k];
    const [c, g] = G.makeCanvas(32, 64);
    g.fillStyle = sticky ? '#ff8fc8' : '#f7e3b5';
    g.fillRect(0, 0, 32, 64);
    g.strokeStyle = sticky ? '#e0569a' : '#c9995a';
    g.lineWidth = 8;
    for (let y = -32; y < 96; y += 22) { g.beginPath(); g.moveTo(0, y); g.lineTo(32, y + 26); g.stroke(); }
    const t = G.toTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return (ropeTex[k] = t);
  }

  // ---------------------------------------------------------------- power-up badges (a coloured coin with an emoji)
  const ITEM = { double: ['🔗', '#5fb8ff'], sticky: ['🍯', '#ff8fc8'], freeze: ['⏰', '#9fe8ff'], fruit: ['🍓', '#ffd23f'] };
  const badges = {};
  function badge(kind) {
    if (badges[kind]) return badges[kind];
    const [c, g] = G.makeCanvas(128, 128);
    const [emoji, col] = ITEM[kind];
    g.beginPath(); g.arc(64, 64, 58, 0, Math.PI * 2);
    g.fillStyle = col; g.fill();
    g.lineWidth = 8; g.strokeStyle = '#ffffff'; g.stroke();
    g.font = `68px ${G.EMOJI_FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(emoji, 64, 70);
    return (badges[kind] = G.toTexture(c));
  }

  // a floating word ("POP!", "+200") on a canvas, as a texture
  function word(text, col = '#ffffff', size = 64) {
    const [c, g] = G.makeCanvas(512, 128);
    g.font = `${size}px ${G.FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineWidth = 12;
    g.lineJoin = 'round';
    g.strokeStyle = INK;
    g.strokeText(text, 256, 66);
    g.fillStyle = col;
    g.fillText(text, 256, 66);
    return G.toTexture(c);
  }

  // stars that spin over a bonked kid's head, and a snowflake for frozen balloons
  let starTex = null;
  function star() {
    if (starTex) return starTex;
    const [c, g] = G.makeCanvas(64, 64);
    g.beginPath();
    for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + (k * Math.PI) / 5, r = k % 2 ? 12 : 28; g.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r); }
    g.closePath();
    g.fillStyle = '#ffd23f'; g.fill();
    g.lineWidth = 4; g.strokeStyle = INK; g.stroke();
    return (starTex = G.toTexture(c));
  }
  let flakeTex = null;
  function flake() {
    if (flakeTex) return flakeTex;
    const [c, g] = G.makeCanvas(64, 64);
    g.strokeStyle = '#ffffff';
    g.lineWidth = 5;
    g.lineCap = 'round';
    for (let k = 0; k < 3; k++) {
      const a = (k * Math.PI) / 3;
      g.beginPath(); g.moveTo(32 - Math.cos(a) * 26, 32 - Math.sin(a) * 26); g.lineTo(32 + Math.cos(a) * 26, 32 + Math.sin(a) * 26); g.stroke();
    }
    return (flakeTex = G.toTexture(c));
  }

  BP.art = { backdrop, face, toyBlock, glass, floor, rope, badge, word, star, flake, ITEM, CW, CH };
})();
