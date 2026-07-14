# Scatter Medallions

A free-to-play, no-cash scatter-pays slot game with account login and a
read-only admin dashboard. Built for fun — there is no payment, cash-in,
or cash-out anywhere in this codebase.

## What's inside

- **Login / Sign up** — username + password. New accounts automatically
  receive a fixed starting balance (`STARTING_CREDITS`, default 1000).
  There is no admin action involved in granting a new account its credits.
- **Scatter-pays slot game** — 6×5 grid, matches of 8+ identical symbols
  anywhere on the grid pay out, winning symbols clear and the grid
  cascades (tumbles) with a rising multiplier per cascade, and a scatter
  symbol triggers free spins. All randomness and payout math run
  server-side (`server/gameEngine.js`) so nothing can be manipulated from
  the browser.
- **Self-serve daily bonus** — if a player's balance drops at/under
  `BONUS_THRESHOLD` (default 100), they can claim `BONUS_AMOUNT` (default
  500) credits once every 24 hours, on their own, with one click.
- **Admin dashboard** (`/admin.html`) — a **read-only** table of every
  player: username, current balance, spins, total wagered, total won, and
  signup date. There is intentionally no button to set or add credits to
  a specific player — see "Design note" below.
- 133-icon-ready — swap in your own art any time, see
  `public/assets/icons/README.md`.

## Design note: why there's no "set credits" button

A login system paired with an admin panel that can assign or top up a
specific player's balance on request is, structurally, how gambling
platforms run — regardless of whether real money changes hands inside the
app itself. To keep this squarely a casual/for-fun project, credits only
ever move through two fixed, non-discretionary paths:

1. A fixed amount automatically on signup.
2. A fixed amount through the player's own self-serve daily bonus,
   rate-limited to once per 24 hours.

The admin view is there so you can see who's playing and how the game's
balanced — not to hand out balances.

## Project structure

```
server/
  server.js         Express app: auth, spin, bonus, admin API
  gameEngine.js      Server-authoritative RNG + cascade + payout logic
  symbols.json       Symbol → icon file mapping, weights, paytable
  db.js              Tiny JSON-file datastore (no native deps to install)
public/
  index.html / js/game.js     The game screen
  login.html / js/auth.js     Login & sign up
  admin.html / js/admin.js    Read-only player dashboard
  assets/icons/                Your icon files go here
  css/style.css                 Shared dark medallion theme
data/
  db.json            Created automatically on first run
```

## Running locally

Requires Node.js 18+.

```bash
npm install
cp .env.example .env    # edit values, especially ADMIN_PASSWORD
npm start
```

Then open http://localhost:3000 — you'll land on the game, which
redirects to `/login.html` if you're not signed in yet. Sign up a normal
player account, and separately log in with your `ADMIN_USERNAME` /
`ADMIN_PASSWORD` (from `.env`) to see `/admin.html`.

## Replacing the icons

See `public/assets/icons/README.md` — drop your files in, update
`server/symbols.json`, restart.

## Deploying to Railway

1. Push this project to a GitHub repo (see below).
2. In Railway: **New Project → Deploy from GitHub repo** → pick the repo.
3. Railway auto-detects Node.js and runs `npm install` then `npm start`
   (from `package.json`). No extra build config needed.
4. Under your Railway service → **Variables**, add:
   - `SESSION_SECRET` — any long random string
   - `ADMIN_USERNAME` / `ADMIN_PASSWORD` — your real admin login
   - optionally `STARTING_CREDITS`, `BONUS_THRESHOLD`, `BONUS_AMOUNT`
5. Railway assigns a public URL automatically (Settings → Networking →
   Generate Domain).

**Note on data persistence:** this project stores accounts in a JSON file
(`data/db.json`) for simplicity — no database server to configure. On
Railway's free tier, the filesystem is ephemeral, so a redeploy can reset
player data. For a casual/for-fun project this is usually fine; if you
want accounts to survive redeploys, attach a **Railway Volume** to the
service and set `DB_PATH` (env var) to a file path inside that volume.

## Pushing to GitHub

```bash
cd scatter-medallions
git init
git add .
git commit -m "Initial commit: Scatter Medallions"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

`node_modules/`, `.env`, and `data/db.json` are already excluded via
`.gitignore`.

## Changing the paytable / odds

Everything about how often symbols appear and how much they pay lives in
`server/symbols.json` — `weight` controls rarity, `payouts` controls the
credit multiplier per match-count tier, and `scatter` controls the
free-spin trigger. Restart the server after editing.
