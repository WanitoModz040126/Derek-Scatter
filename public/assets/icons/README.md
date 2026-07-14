# Replacing the icons

This folder currently has 10 generated placeholder circle icons so the game
runs out of the box:

```
sym_01.svg  sym_02.svg  sym_03.svg  sym_04.svg  sym_05.svg
sym_06.svg  sym_07.svg  sym_08.svg  sym_09.svg  sym_scatter.svg
```

## To use your own icons

1. Drop your image files into this folder (`public/assets/icons/`).
   PNG, WEBP, or SVG all work — any size, the game scales them into
   circular medallion frames automatically.
2. Open `server/symbols.json` and change the `"file"` value for each
   symbol to match your filename, e.g.:
   ```json
   { "id": "circle_gold", "file": "hero_portrait_12.png", "tier": "high", "weight": 6, "name": "Gold Emblem" }
   ```
3. Restart the server. No other code changes are needed — the client
   fetches this mapping from `/api/config` automatically.

## About the 133 icons

The paytable is built around **9 paying symbols + 1 scatter symbol**
(that's the standard shape for this genre — with 30 grid cells and an
8-symbol minimum match, more than ~10-12 symbol types makes matches
almost impossible to hit). If you have 133 icons total, good places to
use the rest:

- Swap the whole 10-icon set for a different "theme" later (just re-edit
  `symbols.json` — keeps the game easy to re-skin)
- Player avatars / profile icons (not wired up yet, but the same circular
  medallion CSS class in `public/css/style.css` works for any image)
- Loading screen, background art, logo mark, spin button icon
- A future "collection" or cosmetics screen

If you do want more than 9 paying symbols, you can add entries to the
`"symbols"` array in `server/symbols.json` — just also add a matching
payout entry under `"payouts"` for whichever `tier` you assign it.
