## What this is
Hexashift — a browser puzzle game. Arrange 24 colored triangles in a flat-top
hexagon so each of the 6 big sector-triangles is one solid color.

## Run / verify
No build, no dependencies, no framework. Everything is inline in `index.html` (HTML + CSS + JS).
- Open `index.html` in a browser, or serve the folder statically.
- For Playwright MCP tests: run `http-server -p 15373 .` (Node) to serve the folder, then navigate to `http://127.0.0.1:15373`.
- Verify changes with the Playwright MCP browser tools (load the file, click controls, screenshot).
- `window.__hx` exposes internals (`state`, `isSolved`, `solvedCount`, `scramble`, `doMove`) for self-tests.

## Architecture (all in the `index.html` `<script>`, numbered sections)
1. **Build triangles** — 24 triangles from 5 horizontal grid lines of a side-2 hexagon. Each gets
   `id`, centroid `cx/cy`, and `sector` 0..5 (60° wedge from centroid angle). SVG is y-up; the
   `<g transform="scale(1,-1)">` flips y.
2. **Axes / halves** — 3 axes (0/60/120°). Rotating verts by `-theta` groups triangles into 4 rows
   (sizes 5,7,7,5). A **half** = two rows; 6 halves total.
3. **State + moves** — `state` = `Array(24)` of color index, keyed by triangle `id`. A move cyclically
   rotates colors along each row of a half (wrap-around). `isSolved` = every sector uniform.
4. **Render** — one `<polygon>` per triangle in `polys[]`; `refresh()` repaints from `state`.
5. **Controls** — buttons built per half; hover previews (`highlight`), click runs the move.

## Conventions
- Keep it dependency-free, vanilla JS.
- Triangle `id` is the stable key linking geometry, `state`, and `polys[]`.
