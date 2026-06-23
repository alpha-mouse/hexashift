## What this is
Hexashift — a browser puzzle game. Arrange 24 colored triangles in a flat-top
hexagon so each of the 6 big sector-triangles is one solid color.

## Run / verify
No build, no dependencies, no framework. Source split across `index.html`, `style.css`, `game.js`, `solver.js`, `ui.js`, `test-harness.js` (loaded in that order). `solver.tests.js` runs under Node.
- Open `index.html` in a browser, or serve the folder statically.
- For Playwright MCP tests serve the folder (Node), then navigate to `http://127.0.0.1:15373`.
  Use exactly one of these whitelisted commands (no `npx`, no extra flags — anything else prompts):
  - Foreground: `http-server -p 15373 -c-1 .`
  - Background w/ log: `http-server -p 15373 -c-1 . >/tmp/hx-server.log 2>&1 &`
- Verify changes with the Playwright MCP browser tools (load the file, click controls, screenshot).
- `window.__hx` exposes internals (`state`, `isSolved`, `solvedCount`, `scramble`, `doMove`) for self-tests.

## Architecture

`index.html` — HTML structure, inline theme-flash script, loads `style.css` then scripts in order.
`style.css` — all styles.
`game.js` — pure game logic (no DOM), numbered sections:
  1. **Build triangles** — 24 triangles from 5 horizontal grid lines of a side-2 hexagon. Each gets
     `id`, centroid `cx/cy`, and `sector` 0..5 (60° wedge from centroid angle). SVG is y-up; the
     `<g transform="scale(1,-1)">` flips y.
  2. **Axes / halves** — 3 axes (0/60/120°). Rotating verts by `-theta` groups triangles into 4 rows
     (sizes 5,7,7,5). A **half** = two rows; 6 halves total.
  3. **State + moves** — `state` = `Array(24)` of color index, keyed by triangle `id`. A move cyclically
     rotates colors along each row of a half (wrap-around). A move is `(halfIndex, dir)` with `dir` ±1;
     inverse = same half, negated dir. `isSolved` = every sector uniform (accepts any of the 720
     sector↔color bijections). Also: fingerprint encode/decode for shareable URLs.
`solver.js` — pure logic, no DOM. `solve(state, HALVES, maxSteps=5)` → ordered move list
  `[{halfIndex,dir}]` solving toward the canonical board, or `null` if no solution within `maxSteps`.
  Bounded bidirectional BFS; intended for shallow scrambles only (≤5). Move perms mirror
  `applyHalf`. See MODEL.md for the deep-board search-wall reasoning.
`ui.js` — DOM/rendering, depends on `game.js` + `solver.js` globals:
  4. **Render** — one `<polygon>` per triangle in `polys[]`; `refresh()` repaints from `state`.
  5. **Controls** — drag-arrows outside the hex; hover previews (`highlight`), click runs the move.
  6. **Win + buttons** — win dialog, New game, Undo, Hint.
     - **Hint** uses a `hintStack` (solve-path) kept *separate* from `userMoves` (the user-actions
       stack). Seeded in `newGame()` from the scramble's `initialSolution` (null for deep/loaded
       boards). `updateHintStack(halfIndex,dir)` runs on every applied move (`doMove`, and `undo`
       with negated dir): if the move matches the stack front the user advanced → `shift`; otherwise
       they walked away → `unshift` the inverse. `hint()` blinks `hintStack[0]`; falls back to a
       fresh `solve()` only when no stack exists. This keeps hints stable when followed (no flip).
     - Also: theme control, difficulty selector, shareable fingerprint, help panel, boot.
`test-harness.js` — exposes `window.__hx` for self-tests; loaded last.

## Conventions
- Keep it dependency-free, vanilla JS.
- Triangle `id` is the stable key linking geometry, `state`, and `polys[]`.
- `game.js` must not touch the DOM; `ui.js` owns all DOM access.
- Commit messages: one terse sentence (no body).
