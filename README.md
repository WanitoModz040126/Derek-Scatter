# RuneGate — Scatter of the Ancients

A single-game scatter slot with tumbling/cascading reels, username+password
login/signup, and an admin panel for manually assigning virtual credits.

**Important:** This is a virtual-credit game for entertainment only.
There is no payment gateway anywhere in this codebase, no way to buy
credits, and no way to cash them out. Credits only move because an admin
assigns them through the admin panel. Keep it that way — do not wire in
any payment processor, as that would turn this into a real-money
gambling product, which requires a government license (e.g. PAGCOR in
the Philippines) and is illegal to run without one.

---

## 1. What's inside

```
scatter-game/
├── server.js              # Express app entry point
├── db.js                  # SQLite schema (users, spins, credit_log)
├── config/
│   ├── paytable.js         # Symbol tiers, weights, pay values, scatter rules
│   └── gameEngine.js        # RNG + scatter-pay matching + tumble/cascade logic
├── middleware/auth.js       # Session guards (requireAuth, requireAdmin)
├── routes/
│   ├── auth.js              # /api/auth/signup, /login, /logout, /me
│   ├── game.js               # /api/game/config, /spin
│   └── admin.js               # /api/admin/users, /credit, /ban, /stats
├── public/
│   ├── index.html + js/game.js     # the game itself
│   ├── login.html + js/login.js
│   ├── signup.html + js/signup.js
│   ├── admin.html + js/admin.js    # admin console
│   └── css/                        # dark, gold/cyan "rune gate" theme
├── assets/icons/            # 1.png … 133.png  (REPLACE WITH YOUR OWN ART)
└── scripts/
    ├── create-admin.js               # promote/create an admin account
    └── gen_placeholder_icons.py      # regenerates placeholder icons (optional)
```

## 2. How the game logic works (so you can verify it's "real")

- Grid is **6 columns × 5 rows = 30 tiles** (matches the layout you referenced).
- This is a **scatter-pay** model, not paylines: a symbol pays if it appears
  **8, 10, or 12+ times anywhere** on the grid at once — see `config/paytable.js`.
- After a win, the winning tiles are removed and the rest **tumble down**;
  new symbols drop in from the top and the grid is re-checked. This repeats
  (cascading) until a spin produces no new win — see `tumble()` and
  `resolveSpin()` in `config/gameEngine.js`.
- Each cascade step multiplies its win (1x, 2x, 3x, 5x, 8x, 13x…) so long
  cascades pay progressively more, same idea as the reference game.
- `1.png` is the **scatter** symbol. Landing 3+ scatters on the initial
  drop awards free spins (8/10/12/15 spins for 3/4/5/6 scatters), which are
  resolved automatically server-side with a doubled cascade multiplier and
  returned to the client as a round-by-round log for animation.
- All RNG, matching, and payout math happens **server-side only**
  (`config/gameEngine.js`), inside a DB transaction with the bet deduction —
  the client just animates whatever the server already decided. This is
  what makes it "accurate": nothing about the outcome can be faked or
  altered from the browser.
- Simulated RTP (return-to-player) at current settings is roughly **~90%**
  over tens of thousands of spins — tune weights/pays in
  `config/paytable.js` to taste, then re-check with the snippet in
  section 6 below.

## 3. Replacing the 133 icons with your own art

Drop your own files into `assets/icons/`, using **these exact filenames**:

- `1.png` → the **scatter** symbol
- `2.png` through `13.png` → the 12 symbols that actually pay (tiers are
  defined in `config/paytable.js` — low/mid/high/premium)
- `14.png` through `133.png` → decorative filler (used for the idle
  preview grid on first load; not part of win-matching by default)

Recommended: square PNGs, at least 256×256, transparent background — the
CSS already clips every tile into a circle with a gold/red stroke ring, so
your source art doesn't need to be pre-cropped into a circle.

Want more than 12 icons to actually pay? Add more entries to the
`PAYTABLE` array in `config/paytable.js` (copy an existing entry, change
`icon`, `name`, `weight`, and `pays`).

## 4. Running it locally

Requires Node.js 18+.

```bash
npm install
npm run seed-admin -- youradminname yourpassword
npm start
```

Then open `http://localhost:3000`. Log in with the admin account you just
created, go to **Admin Console** (top right, or visit `/admin`), and assign
credits to any player accounts that sign up.

Players sign up at `/signup.html` — they start at **0 credits** by design,
exactly as you asked, until an admin tops them up.

## 5. Deploying to Railway

1. Push this project to a GitHub repository (see section 7 below).
2. In Railway: **New Project → Deploy from GitHub repo** → select this repo.
3. Railway auto-detects Node.js via Nixpacks and uses `railway.json` /
   `Procfile` to run `node server.js`. No extra build step is needed.
4. Add environment variables in Railway's **Variables** tab:
   - `SESSION_SECRET` — any long random string
   - `NODE_ENV` = `production`
   - (Railway sets `PORT` automatically; `server.js` already reads it.)
5. SQLite writes to the `data/` folder. On Railway, add a **Volume**
   mounted at `/app/data` so your database persists across redeploys
   (Settings → Volumes → New Volume → mount path `/data`, then set
   an env var pointing `db.js` there if you rename the mount — by default
   it's fine as-is for a single always-on instance, but a Volume protects
   you from data loss on redeploy).
6. Once deployed, run the admin-seed script once via Railway's shell
   (Railway dashboard → your service → "..." menu → shell), or temporarily
   set a one-off start command to `node scripts/create-admin.js you pass`.

## 6. Re-checking RTP after you change the paytable

```bash
node -e "
const { resolveSpin } = require('./config/gameEngine');
const bet = 10;
let totalBet=0, totalWin=0, spins=50000;
for (let i=0;i<spins;i++){ const r=resolveSpin(bet); totalBet+=bet; totalWin+=r.grandTotalWin; }
console.log('RTP:', ((totalWin/totalBet)*100).toFixed(2)+'%');
"
```

## 7. Pushing to GitHub

```bash
cd scatter-game
git init
git add .
git commit -m "Initial commit: RuneGate scatter game"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

`.gitignore` already excludes `node_modules/` and the local SQLite files in
`data/`, so your repo stays clean.

## 8. Design notes

Dark "rune gate" theme (deep near-black background, gold epic-rarity
accent, cyan secondary accent) with a hexagonal frame around the reel grid
as the signature visual element, Cinzel for display headers and Rajdhani
for HUD/numeric text. Every icon tile is circular with a double stroke
ring, matching your spec. The theme is an original fantasy-arena identity
— it deliberately does not reproduce any specific game's logos, character
art, or trademarks, so you're free to publish and deploy it.

## 9. Security notes

- Passwords are hashed with bcrypt, never stored in plain text.
- Sessions are httpOnly cookies backed by a SQLite session store.
- All balance changes happen inside DB transactions.
- Admin routes are guarded by `requireAdmin` middleware — a non-admin
  hitting `/admin` or any `/api/admin/*` route gets redirected/blocked.
- Before going live, change `SESSION_SECRET` in your environment and never
  commit a real `.env` file (it's already git-ignored).
