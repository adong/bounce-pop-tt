/* 中文 for TT Bounce Pop: the words on the page, the toasts, the places and tips in the level banner, the ? panel, and
   the canvas text in the 3D scene (POP!, BOING!, wrapped in Kit.lang.t in js/view.js). The 中文 logo is BP.TITLE_ZH (弹弹球).
   Words from the brief: 气球, 分裂, 绳子, 弹跳, 冻住.
   Stays in English on purpose: the kids' names and the CPU friends' (TEDDY, TOMMY, FROGGY, FOXY), the game's name in
   the tab and the ? panel, and key labels. */
(function () {
  const L = Kit.lang;
  L.keep(['TEDDY', 'TOMMY', 'FROGGY', 'FOXY', 'Teddy', 'Tommy', BP.TITLE, 'Esc', '❚❚', 'W S', 'A D']);

  const PLACES = {
    'THE GREAT WALL': '长城', 'THE EIFFEL TOWER': '埃菲尔铁塔', 'THE PYRAMIDS': '金字塔', 'BIG BEN': '大本钟',
    'THE SYDNEY OPERA HOUSE': '悉尼歌剧院', 'THE LEANING TOWER OF PISA': '比萨斜塔', 'THE TAJ MAHAL': '泰姬陵',
    'MOUNT FUJI': '富士山', 'THE GOLDEN GATE BRIDGE': '金门大桥', 'THE STATUE OF LIBERTY': '自由女神像',
  };
  const TIPS = {
    'Walk with ← →. Space throws your rope up!': '按 ← → 走路，按空格把绳子往上扔！',
    'Big balloons split into two smaller ones!': '大气球会分裂成两个小一点的气球！',
    'Tiny balloons pop into confetti!': '最小的气球一戳就变成彩纸！',
    'Ropes break the glass blocks!': '绳子能打碎玻璃方块！',
    'Grab ⏰ to freeze every balloon!': '捡到 ⏰ 就能把所有气球冻住！',
    'Climb the ladder with ↑ ↓!': '按 ↑ ↓ 爬梯子！',
    'Call your brother: he freezes every balloon!': '叫兄弟来帮忙：他会把所有气球冻住！',
    'Grab 🍯 for a sticky rope!': '捡到 🍯，绳子就会粘在上面！',
    'Grab 🔗 for two ropes at once!': '捡到 🔗，一次能扔两根绳子！',
    'Pop them all before the time runs out!': '时间用完前把弹跳的气球全部戳破！',
  };
  const TREAT = { 'ICE CREAM': '冰淇淋', WATER: '水', JUICE: '果汁', COOKIE: '饼干', WATERMELON: '西瓜', BANANA: '香蕉' };

  L.add(Object.assign({}, PLACES, TIPS, {
    // title screen
    'Teddy & Tommy pop the bouncy balloons!': 'Teddy 和 Tommy 来戳弹跳的气球！',
    '1 PLAYER': '单人', '2 PLAYERS': '双人', 'Teddy and Tommy pop together': 'Teddy 和 Tommy 一起戳气球',
    '🐣 EASY': '🐣 简单', '🔥 NORMAL': '🔥 普通', 'START AT LEVEL': '起始关卡',
    // HUD and touch pads
    LEVEL: '关卡', 'HI-SCORE': '最高分', 'Pause (P)': '暂停 (P)', 'Sound (M)': '声音 (M)', FIRE: '扔绳子',
    'press T': '按 T', 'tap to freeze again': '再点一下，再冻住一次', 'HIGH FIVE! ✋': '击掌！✋',
    // toasts
    'OUT OF LIVES! 💔': '没有生命了！💔', "TIME'S UP! THE CLOCK STARTS AGAIN ⏱️": '时间到！时钟重新开始 ⏱️',
    '🍓 YUM! +500': '🍓 好吃！+500', '⏰ FREEZE CLOCK! ❄️': '⏰ 冻住时钟！❄️', 'KEEP GOING! ❤️': '继续加油！❤️', '✋ HIGH FIVE!': '✋ 击掌！',
    // screens
    PAUSED: '暂停', '▶ PLAY': '▶ 继续', '↻ START THIS LEVEL AGAIN': '↻ 这一关重新开始', '🏠 MENU': '🏠 菜单',
    'OH NO!': '哎呀！', 'KEEP GOING!': '继续加油！', 'YOU DID IT!': '你做到了！', 'PLAY AGAIN': '再玩一次',
    // in the 3D scene (canvas text)
    'POP!': '啪！', 'BOING!': '嘣！',
    // the ? panel
    walk: '走路', 'throw the rope up': '把绳子往上扔', Space: '空格', 'climb a ladder (no ladder: throw)': '爬梯子（没有梯子时：扔绳子）',
    'call your brother · high five': '叫兄弟 · 击掌', 'T or Enter': 'T 或 回车', 'pause · sound': '暂停 · 声音', 'P or Esc · M': 'P 或 Esc · M',
    '1 player: either set of keys works, and Space, X or Z throws the rope.': '单人时两套按键都能用，空格、X 或 Z 都能扔绳子。',
    'Bottom left: ◀ ▶ to walk. Bottom right: FIRE throws the rope, ▲ ▼ climb ladders. 2 players: Teddy has the left pad, Tommy the right. The round face button (top right) calls your brother.':
      '左下角：◀ ▶ 走路。右下角：按“扔绳子”把绳子往上扔，▲ ▼ 爬梯子。双人时 Teddy 用左边的按钮，Tommy 用右边的。右上角的圆形头像按钮可以叫兄弟来帮忙。',
  }));

  const N = '(TEDDY|TOMMY|FROGGY|FOXY)';
  L.rule(new RegExp(`^CALL ${N}$`), '叫 $1');
  L.rule(new RegExp(`^${N} IS HERE!$`), '$1 来啦！');
  L.rule(new RegExp(`^${N} IS COMING TO HELP!$`), '$1 来帮忙啦！');
  L.rule(new RegExp(`^${N} SAYS: FREEZE! ❄️$`), '$1 说：冻住！❄️');
  L.rule(new RegExp(`^BYE BYE, ${N}! 👋$`), '$1 拜拜！👋');
  L.rule(new RegExp(`^(\\S+) (ICE CREAM|WATER|JUICE|COOKIE|WATERMELON|BANANA) FROM ${N}!$`), (m, e, item, who) => `${e} ${who} 送来的${TREAT[item]}！`);
  L.rule(new RegExp(`^BOING! ${N} SEES STARS! ⭐$`), '嘣！$1 眼冒金星！⭐');
  L.rule(new RegExp(`^🔗 DOUBLE ROPE FOR ${N}!$`), '🔗 $1 能一次扔两根绳子啦！');
  L.rule(new RegExp(`^🍯 STICKY ROPE FOR ${N}!$`), '🍯 $1 的绳子变黏啦！');
  L.rule(new RegExp(`^PLAY WITH ${N} (\\S+)$`), '和 $1 一起玩 $2');
  L.rule(/^❄️ FROZEN (\d+)$/, '❄️ 冻住 $1');
  L.rule(/^(.+) popped every balloon at all (\d+) places!$/, (m, who, n) => `${who.replace(' and ', ' 和 ')} 在全部 ${n} 个地方把气球都戳破啦！`);
  L.rule(/^Out of lives on level (\d+)\. Keep going: the balloons you popped stay popped!$/, '第 $1 关没有生命了。继续加油：戳破的气球不会回来！');
  L.rule(/^HIGH FIVE IN (\d+)…$/, '$1 秒后可以击掌…');
  L.rule(/^LEVEL (\d+) OF (\d+)$/, '第 $1 关（共 $2 关）');
  L.rule(/^LEVEL (\d+) CLEAR! \+([\d,]+) 🎉$/, '第 $1 关通过！+$2 🎉');
  L.rule(/^ALL (\d+) LEVELS! 🎉$/, '$1 关全部通过！🎉');
  L.rule(/^HI-SCORE ([\d,]+)$/, '最高分 $1');
  L.rule(/^NEW HI-SCORE! ([\d,]+)$/, '新的最高分！$1');
  L.rule(/^SCORE ([\d,]+)$/, '得分 $1');
})();
