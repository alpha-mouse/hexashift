"use strict";

/* English — the reference catalog. To add a language: copy this file to i18n/xx.js,
   translate the values, keep the keys, then add its <script> to index.html.
   Keys with `half.*` come from game.js DIRS labels. Values may be (params)=>string. */

window.HX_I18N = window.HX_I18N || {};
window.HX_I18N.en = {
  'app.title':'Hexashift',
  'lang.label':'Language',
  'lang.name':'English',

  /* Header */
  'header.howToPlay':'How to play',
  'theme.group':'Theme',
  'theme.light':'Light theme',
  'theme.system':'System theme',
  'theme.dark':'Dark theme',

  /* Help panel (rich markup -> data-i18n-html) */
  'help.region':'How to play',
  'help.heading':'How to play Hexashift',
  'help.goal':'<strong>Goal:</strong> Arrange all 24 colored triangles so that each of the six big sector-triangles is one solid color.',
  'help.moving':'<strong>Moving pieces:</strong> The board is divided into six <em>halves</em> (two rows each) along three axes. Click an arrow outside the hexagon to slide that half one triangle along its axis. Triangles that run off one end wrap around to the other.',
  'help.hovering':'<strong>Hovering</strong> an arrow highlights the triangles that will move.',
  'help.buttons':'<strong>Undo</strong> steps back through your moves; <strong>Hint</strong> blinks a suggested arrow. <strong>New game</strong> scrambles a fresh puzzle. To restart - <strong>refresh</strong> the page.',
  'help.difficulty':'<strong>Difficulty</strong> sets how many scramble moves are applied at the start — fewer moves means a simpler puzzle closer to the solved state.',
  'help.share':'You can also <strong>share a puzzle</strong> by copying the link at the bottom — it encodes the exact starting board so a friend can try the same scramble.',
  'help.letsPlay':"Let's play!",

  /* Board + HUD */
  'board.aria':'Hexashift board',
  'hud.moves':'Moves',
  'btn.new':'New game',
  'btn.undo':'Undo',
  'btn.hint':'Hint',
  'difficulty.label':'Difficulty',

  /* Share + footer */
  'share.label':'Share this puzzle',
  'share.copy':'Copy link',
  'share.copied':'Copied!',
  'footer.github':'GitHub',

  /* Win dialog */
  'win.heading':'Solved!',
  'win.playAgain':'Play again',
  'win.msg':(p)=>`You sorted the hexagon in ${p.moves} ${p.moves===1?'move':'moves'}.`,

  /* Arrow tooltips: half labels (game.js DIRS keys) + direction + assembled title */
  'half.Top':'top',
  'half.Bottom':'bottom',
  'half.Upper-right':'upper-right',
  'half.Upper-left':'upper-left',
  'half.Lower-left':'lower-left',
  'half.Lower-right':'lower-right',
  'arrow.dir.right':'right',
  'arrow.dir.left':'left',
  'arrow.dir.up':'up',
  'arrow.dir.down':'down',
  'arrow.title':(p)=>`Drag ${p.half} half ${p.dir}`,

  /* Difficulty options */
  'difficulty.option':(p)=>`Off by ${p.n}`,
};
