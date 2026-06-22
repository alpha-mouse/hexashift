# Hexashift

A small browser puzzle game. Arrange 24 colored triangles in a flat-top hexagon so
that each of the six big sector-triangles is one solid color.

## What it is

The board is a flat-top hexagon split into 24 small triangles. Those triangles are
grouped into **6 big triangles** — one 60° wedge each, radiating from the center. Every
big triangle is made of 4 small ones.

The puzzle starts scrambled. **You win when all 6 big triangles are each a single solid
color** (and the colors don't have to match any particular slot — just uniform per
sector).

## How to play

The board has arrows sitting just outside its six edges. Click an arrow to **slide one
"half" of the board** (two rows of triangles) one step along one of the three axes.
Triangles that run off one end **wrap around** to the other end of the same rows.

Hovering an arrow previews exactly which triangles that move affects. Keep shifting
halves until every big triangle is one color.

### Controls

- **Arrows** (around the board) — make a move: slide a half one triangle along its axis.
- **Moves** — counts the moves you've made this game.
- **New game** — scramble a fresh board.
- **Undo / Redo** — step back and forward through your moves.
- **Difficulty** — scramble depth: *Off by 1, 2, 3, 5, 8,* or *35* (how many random
  half-moves the board is scrambled by). Default is *Off by 3*. Changing it starts a new
  game.
- **Theme** (top-right) — Light / System / Dark, remembered between visits.
- **Share this puzzle** — a link that encodes the exact starting board (via a `?g=`
  fingerprint in the URL), so anyone you send it to gets the same scramble to solve.

## Run it

No build step, no dependencies, no framework — everything is inline in `index.html`.

- **Easiest:** open `index.html` in any modern browser.
- **Or serve the folder statically**, e.g.:

  ```
  http-server .
  ```

  then visit `http://127.0.0.1:8080`.

## Developer

Developed by **Claude** (Anthropic's Claude Code, Opus).
