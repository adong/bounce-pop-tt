#!/usr/bin/env node
/* Opens the game in headless Chrome over the DevTools protocol (Node's own WebSocket, no npm), muted and as a first
   visit, runs a list of steps and lists any console errors.
     node tools/browser.js <steps.json> [width height] [url]
   Each step may have js (run in the page; it can use the window.game hooks), wait (ms), size ([w, h], touch: true for a
   phone) and shot (a file name, saved as JPEG next to the steps file unless it has a path).
   The url defaults to index.html from file://, which is what a double-click opens.
   docs/screenshot.jpg: node tools/browser.js tools/shots.json 1200 750   (from TT Bubble Shooter's, which came from TT Star Defenders' shoot.js) */
'use strict';
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const root = path.join(__dirname, '..');
const [stepsFile, W = '1200', H = '750', url = 'file://' + path.join(root, 'index.html')] = process.argv.slice(2);
const steps = JSON.parse(fs.readFileSync(stepsFile, 'utf8'));
const port = 9500 + Math.floor(Math.random() * 400);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'bounce-chrome-'));
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, `--window-size=${W},${H}`,
  '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--allow-file-access-from-files', '--hide-scrollbars', '--mute-audio',
  '--no-first-run', '--no-default-browser-check', 'about:blank',
], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  let ws;
  const errors = [];
  try {
    let targets;
    for (let k = 0; k < 60 && !targets; k++) {
      try { targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); } catch (e) { await sleep(200); }
    }
    const page = targets.find((t) => t.type === 'page');
    ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((r) => ws.addEventListener('open', r));
    let id = 0;
    const waiting = new Map();
    ws.addEventListener('message', (m) => {
      const d = JSON.parse(m.data);
      if (d.id && waiting.has(d.id)) { waiting.get(d.id)(d); waiting.delete(d.id); }
      if (d.method === 'Runtime.exceptionThrown') errors.push('EXC ' + (d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text));
      if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') errors.push('ERR ' + d.params.args.map((a) => a.value || a.description).join(' '));
    });
    const send = (method, params = {}) => new Promise((r) => { const n = ++id; waiting.set(n, r); ws.send(JSON.stringify({ id: n, method, params })); });
    const size = async (w, h, touch) => {
      await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: !!touch });
      await send('Emulation.setTouchEmulationEnabled', { enabled: !!touch, maxTouchPoints: touch ? 5 : 1 });
    };
    await send('Runtime.enable');
    await send('Page.enable');
    await size(+W, +H, false);
    // muted before the game's first script runs, and a first visit (no saved progress, English)
    await send('Page.addScriptToEvaluateOnNewDocument', { source: "try { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.removeItem('bouncePopTT.v1'); localStorage.removeItem('claudeGames.lang'); } localStorage.setItem('claudeGames.muted', '1'); } catch (e) {}" });
    await send('Page.navigate', { url });
    for (let k = 0; k < 80; k++) {
      await sleep(150);
      const r = await send('Runtime.evaluate', { expression: '!!(window.game && window.game.G)', returnByValue: true });
      if (r.result && r.result.result && r.result.result.value) break;
    }
    await sleep(800);
    for (const s of steps) {
      if (s.size) await size(s.size[0], s.size[1], s.touch);
      if (s.js) {
        const r = await send('Runtime.evaluate', { expression: s.js, awaitPromise: true, returnByValue: true });
        const res = r.result || {};
        const v = res.exceptionDetails ? 'THREW ' + (res.exceptionDetails.exception?.description || res.exceptionDetails.text) : res.result ? res.result.value : r;
        console.log((s.label || s.shot || 'js') + ':', typeof v === 'string' ? v : JSON.stringify(v, null, s.pretty ? 1 : 0));
      }
      if (s.wait) await sleep(s.wait);
      if (s.shot) {
        const r = await send('Page.captureScreenshot', { format: 'jpeg', quality: 86 });
        const out = path.isAbsolute(s.shot) || s.shot.includes('/') ? path.resolve(root, s.shot) : path.join(path.dirname(path.resolve(stepsFile)), s.shot);
        fs.writeFileSync(out.endsWith('.jpg') ? out : out + '.jpg', Buffer.from(r.result.data, 'base64'));
        console.log('saved', out.endsWith('.jpg') ? out : out + '.jpg');
      }
    }
  } catch (e) {
    console.error(e);
    process.exitCode = 1;
  } finally {
    console.log(errors.length ? `console errors: ${errors.length}\n  ${errors.slice(0, 8).join('\n  ')}` : 'console errors: none');
    try { ws && ws.close(); } catch (e) { /* closed */ }
    await new Promise((r) => { chrome.once('exit', r); chrome.kill(); setTimeout(r, 3000); });
    try { fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch (e) { /* a temp folder */ }
  }
})();
