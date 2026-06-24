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

## Run it

No build step, no dependencies, no framework — everything is inline in `index.html`.

- **Easiest:** open `index.html` in any modern browser.
- **Or serve the folder statically**, e.g.:

  ```
  http-server .
  ```

  then visit `http://127.0.0.1:8080`.

## Translations

To add a translation:
1. **Fork** the repository.
2. **Copy** a translation file from the `i18n/` folder (such as `en.js`).
3. **Rename** the file after the language code for the language (e.g., `fr.js` for French) and translate the strings inside.
4. **Add** the language to `HX_SUPPORTED_LANGS` in `i18n.js`. Preferably in ~phonetic order, like wikipedia does that.
5. **Create a PR** with your changes.

## Developer

Developed by **Claude** (Anthropic's Claude Code, Opus / Sonnet).
Game mechanics and guiding prompts - alpha-mouse.
