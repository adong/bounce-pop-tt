#!/usr/bin/env node
/* TT Bounce Pop: the headless check. Loads the same rules the game uses (js/rules.js, no Three.js) and runs js/checks.js.
   node tools/check.js            every check; the autopilot plays all 40 levels on EASY and NORMAL
   node tools/check.js --quick    every 4th level only
   node tools/check.js --prove    the fail variant: each rule broken on purpose; passes only if every one is caught */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ctx = { console, Date, Math };
ctx.window = ctx;
vm.createContext(ctx);
for (const f of ['title.js', 'rules.js', 'checks.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'), ctx, { filename: f });
const t0 = Date.now();
if (process.argv.includes('--prove')) {
  const res = ctx.BP.checks.prove();
  console.log(res.lines.join('\n'));
  console.log(res.ok ? `\nEVERY BROKEN RULE WAS CAUGHT (${((Date.now() - t0) / 1000).toFixed(1)} s)` : `\n${res.missed.length} BROKEN RULE(S) NOT CAUGHT: ${res.missed.join(', ')}`);
  process.exit(res.ok ? 0 : 1);
}
const res = ctx.BP.checks.run({ quick: process.argv.includes('--quick') });
console.log(res.lines.join('\n'));
console.log(res.ok ? `\nALL CHECKS PASS (${((Date.now() - t0) / 1000).toFixed(1)} s)` : `\n${res.fails.length} CHECK(S) FAILED: ${res.fails.join(', ')}`);
process.exit(res.ok ? 0 : 1);
