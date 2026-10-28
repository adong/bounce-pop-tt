# TT Bounce Pop

[![TT Bounce Pop title screen](docs/screenshot.jpg)](https://adong.github.io/bounce-pop-tt/)

Press **?** any time (or tap the round **?** button on the left edge) to see the keys. The game waits while you look.
Tap the language button under it (the A文 icon) to switch between English and 中文; the dashboard and every game remember the choice.

**中文：** 弹弹球！左右走，把绳子往上扔。绳子碰到的气球会分裂成两个小一点的气球，最小的一戳就变成彩纸。在时间用完前把弹跳的气球全部戳破。捡道具：两根绳子、黏黏的绳子、冻住时钟。40 关，背景是世界各地的名胜。单人、双人一起玩，或者和 Froggy / Foxy 一起玩；叫兄弟来，他会把所有气球冻住 5 秒。

## Play

An arcade balloon-popping game in our own style, starring Teddy and Tommy, built with Claude Code from plain JavaScript
and Three.js. Big glossy balloons with googly eyes bounce around a toy box made of stacked star blocks, in front of our
own drawings of world landmarks. Walk left and right and throw a rope straight up: a balloon the rope touches splits in
two, and the tiniest ones pop into confetti. Nobody gets hurt: a balloon that bumps a kid just makes him see stars for
a moment. There are no image, model or audio files: the kids are the shared kit's blocky characters, every texture and
landmark is painted on a canvas, and every sound is synthesised.

- **Double-click `index.html`.** It works offline because Three.js and the kit are copied into `kit/`.
- **Send one file:** `dist/bounce-pop-tt.html` is the whole game in one page (about 850 KB). Rebuild it after any
  edit: `python3 kit/tools/bundle.py . --name bounce-pop-tt`
- The two fonts load from Google Fonts when online. Offline, the game falls back to Arial Black and the system font.
- The name lives in one place, `js/title.js` (`BP.TITLE`, and `BP.TITLE_ZH` = 弹弹球 for the 中文 logo), plus the page
  `<title>` in `index.html`.
- **Pick a brother** (1 PLAYER), **2 PLAYERS** (Teddy and Tommy pop together) or **PLAY WITH FROGGY 🐸** (on 🔥 NORMAL
  it's **PLAY WITH FOXY 🦊**); 🐣 EASY (the default) or 🔥 NORMAL; and, once you've reached later levels, START AT
  LEVEL (1, every 5th, and the furthest). Behind the title the brothers pop balloons together by themselves.

## The balloons

- **Four sizes:** big, medium, small and tiny. Each one bounces back up to its own height (the bigger, the higher)
  and drifts sideways at one steady speed, bouncing off the walls, the ceiling and the blocks. They squash a little
  when they land.
- **The rope** shoots straight up from the kid. A balloon it touches **splits into two of the next size down**, which
  hop apart left and right. A tiny one **pops into confetti**. One big balloon takes 15 ropes to clear (1 + 2 + 4 + 8).
- **Points:** big 50, medium 100, small 150, tiny 200 (the small ones are harder), a glass block 50, fruit 500, and
  10 for every second left on the clock when the level is clear.
- **Lives:** a balloon that bumps a kid costs a life. He sees stars for a second (BOING!), then blinks and can't be
  bumped for a couple of seconds. 🐣 EASY has 5 lives, 🔥 NORMAL 3. Out of lives: KEEP GOING (every balloon you popped
  stays popped).
- **The clock:** each level has time for the ropes it needs, with plenty to spare (1.8 times as long on EASY). The last
  ten seconds tick. Time's up costs a life and the clock starts again.
- **🐣 EASY:** the balloons move at 62% speed (just as high, only slower), 5 lives, a longer clock, a smaller bump box
  and more power-ups.

## Power-ups

Sometimes a popped balloon drops a badge. It falls to the floor (or a ledge) and waits 7 seconds; walk over it to grab it.

- **🔗 Double rope:** two ropes in the air at once.
- **🍯 Sticky rope:** the rope sticks to the ceiling (or under a block) for 4 seconds and pops whatever drifts into it.
- **⏰ Freeze clock:** every balloon freezes for 4 seconds. Frozen balloons go icy, chatter their teeth, and can't bump
  anyone, but a rope still pops them.
- **🍓 Fruit:** 500 points.

Double and sticky last until the kid is bumped or the level ends.

## Levels

40 levels at ten landmarks, four times of day each (morning, daytime, sunset, and night with a smiling moon): the Great
Wall, the Eiffel Tower, the Pyramids, Big Ben, the Sydney Opera House, the Leaning Tower of Pisa, the Taj Mahal, Mount
Fuji, the Golden Gate Bridge and the Statue of Liberty, all our own kid-style drawings. The banner names the place and
gives a tip.

- Levels 1 to 8: just balloons, from one medium balloon up to two big ones and a shower of tiny ones.
- From level 9: **glass blocks** (a rope breaks one, and stops there) and **toy blocks** (they stop ropes and balloons
  bounce off them): a glass row, shelves, a middle shelf, glass pillars, a glass ceiling.
- From level 17: **ledges with ladders.** Climb with ↑ ↓ and throw from up high. Letting go half way drops you to
  the floor.
- The last levels have four big balloons at once.

## 2 players and Froggy / Foxy

- **2 PLAYERS:** Teddy and Tommy share the box, the lives and the clock, each with his own rope and score.
- **PLAY WITH FROGGY 🐸 / FOXY 🦊:** the computer friend walks and throws next to you. Froggy (EASY) is slow to react
  and often holds back; Foxy (NORMAL) is quicker. You can still call your brother.

## Controls

| | 1 player | Teddy (2 players) | Tommy (2 players) |
|---|---|---|---|
| walk | ← → or A D | A D | ← → |
| throw the rope | Space, X or Z | Space | / |
| climb a ladder | ↑ ↓ or W S | W S | ↑ ↓ |
| call your brother | T or Enter | high five: T | high five: T |
| pause · sound | P or Esc · M | | |

- **↑ (and W) throw too** when there's no ladder to climb, so the arrows alone are enough to play.
- **Touch:** ◀ ▶ bottom left to walk; FIRE bottom right, with ▲ ▼ next to it on levels with ladders. In 2 players
  Teddy has the blue pad on the left and Tommy the green pad on the right.
- **Title:** 1 or Enter for 1 player, 2 for 2 players, 3 to play with Froggy / Foxy, ← → to pick a brother, E for
  EASY/NORMAL.
- The kit's round buttons on the left edge (?, A文, and the speaker on menus) stay clear of the box and the pads on
  every screen size; on a sideways phone the HUD moves to the sides of the box (in 2 players it stays across the top
  and each pad stacks up beside the box).

## Companion

In 1 player (and with Froggy / Foxy), press **T** (or Enter, or the round face button top right) to call your brother,
as often as you like. He pops in on a little cloud in the top corner at his buddy size, does his signature move (Teddy
boxes and takes a 🏀 jump shot, Tommy does his Y pose ✌️), tosses you a treat (🍦 💧 🧃 🍪 🍉 🍌, +100), and then
**TOMMY SAYS: FREEZE! ❄️**: every balloon freezes for 5 seconds. Each call is one more freeze. He waves goodbye when the
balloons start moving again. In 2 players, T is a high five: both brothers put a hand up and the confetti flies.

When a level is clear the brothers do their signature moves in the confetti; after level 40 it's YOU DID IT!, the
score, the HI-SCORE (one for each difficulty) and PLAY AGAIN.

## Checks

- `node tools/check.js` (about 2 s; `--quick` under 1 s) runs the rules without Three.js:
  - **split sizes and counts:** each size splits into two of the next size down from the same spot, moving apart; a
    tiny one leaves nothing; one balloon of each size takes 1, 3, 7 and 15 ropes and the points add up.
  - **bounce heights:** every size bounces to its own height, bounce by bounce the same at 30, 60 and 120 frames a
    second and with a jumpy frame rate, and just as high on EASY.
  - **the rope hits what it touches:** just touching on either side pops it and just missing doesn't (three sizes),
    from below it pops on the very step the tip arrives, a sticky rope pops a balloon that drifts into it, one rope
    pops one balloon, toy blocks stop it and glass blocks break.
  - **every level can be cleared:** every level is laid out fairly (no balloon starts in a block, every ladder stands
    on something and reaches a ledge, no gap that could wedge a big balloon, room to stand) and the autopilot clears
    all 40 levels on EASY and NORMAL before the clock runs out.
  - plus the brother's freeze (5 seconds, then they move; each call is one more) and a bumped kid getting up again.
- `node tools/check.js --prove` is the fail variant: each rule is broken on purpose (only one half on a split, naive
  frame-by-frame bounces, a rope that ignores a balloon's size, a balloon boxed in by toy blocks, a bump that never
  ends) and its check must fail. All five are caught.
- **In the page:** `game.check()`, `game.prove()`, `game.playCheck()`, `game.playProve()` and `game.langCheck()`.
  The play check drives the page with real `keydown`/`keyup` events on `window` and pointer events on the touch pads,
  and measures each kid's head on screen through the camera: → / D walk right and ← / A left on all 40 levels (as
  Teddy, as Tommy, with Froggy and Foxy, and in 2 players each brother's keys move only him); ↑ / W climb up the
  screen onto the ledge and ↓ / S back down on every ladder (69 climbs); Space, X, ↑ and W throw, even a tap shorter
  than a frame, and ↑ climbs instead at a ladder; the touch pads walk, throw and climb (both pads in 2 players); and
  nothing leaves a kid stuck (a bump, letting go of a ladder half way, pause with a key held, the ? panel, a lost
  window focus, a cancelled finger, keep going, the next level, the brother's freeze, a high five, time's up, a glass
  block breaking under him, a wall). `game.playProve()` runs it with the keys mirrored and with a bump that never ends:
  both are caught. `game.langCheck()` visits every screen in 中文 (`Kit.lang.untranslated()` is `[]`, and all 99
  toasts, banners and canvas words translate) and in English (no Chinese on the page).
- `node tools/browser.js <steps.json> [width height] [url]` drives headless Chrome (muted, a first visit) and lists
  console errors: `node tools/browser.js tools/checks.json 1200 750 "file://$PWD/dist/bounce-pop-tt.html"` runs all
  of the page checks on the single page; `node tools/browser.js tools/shots.json 1200 750` makes `docs/screenshot.jpg`.

## Files

- `index.html`: the page, HUD, touch pads, screens and styles; the tab and home-screen icon (🟠 on grape purple
  `#7a5cff`).
- `js/title.js`: the name. `js/rules.js`: balloons, ropes, splitting, kids, ladders, power-ups, the 40 levels, the
  brother and the autopilot (no Three.js). `js/checks.js`: the headless check.
- `js/view.js`: the 3D scene. `js/art.js`: the landmark drawings and canvas textures. `js/friends.js`: Froggy and
  Foxy (copied from TT Badminton). `js/sfx.js`: the synth sounds. `js/game.js`: screens, input, HUD, saving and
  `window.game`.
- `js/playcheck.js`: the play check and the language check. `js/keys.js`: the ? panel. `js/zh.js`: 中文.
- `kit/`: the shared kit, synced with `python3 ../kit/tools/sync.py .` (never edited here). `tools/`: the checks and
  the headless browser.

## Not verified

- Sound by ear: everything was tested muted (`BP.sfx.log` shows which sounds fired).
- Real fingers on an iPad or phone, iOS Safari, and two kids sharing one iPad; touch was tested with synthetic pointer
  events in the Browser pane and headless Chrome.
- Whether the speeds, the clock and Froggy / Foxy suit the real kids: the autopilot clears every level using at most
  55% of the clock on NORMAL and 15% on EASY; a kid will be slower.
- Finder double-click (tested from `file://` in headless Chrome), the iPad home-screen icon, and frame rate on older
  iPads.
- On a sideways phone (740 x 360) the box is small, and smaller still in 2 players.
