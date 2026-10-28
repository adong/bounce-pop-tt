/* The keys the ? panel shows. Press ? (Shift + /) in the game, or tap the round ? button.
   The panel and the freeze live in the shared kit: kit/help.js (Kit.help). */
Kit.help.setup({
  title: BP.TITLE,
  cols: ['Teddy', 'Tommy'],
  keys: [
    ['walk', 'A D', '← →'],
    ['throw the rope up', 'Space', '/'],
    ['climb a ladder (no ladder: throw)', 'W S', '↑ ↓'],
    ['call your brother · high five', 'T or Enter', 'T or Enter'],
    ['pause · sound', 'P or Esc · M', ''],
  ],
  note: '1 player: either set of keys works, and Space, X or Z throws the rope.',
  touch: 'Bottom left: ◀ ▶ to walk. Bottom right: FIRE throws the rope, ▲ ▼ climb ladders. 2 players: Teddy has the left pad, Tommy the right. The round face button (top right) calls your brother.',
});
