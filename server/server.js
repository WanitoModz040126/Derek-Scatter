require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const db = require('./db');
const { runSpin, config: gameConfig } = require('./gameEngine');

const app = express();
const PORT = process.env.PORT || 3000;

const STARTING_CREDITS = Number(process.env.STARTING_CREDITS || 1000);
const BONUS_THRESHOLD = Number(process.env.BONUS_THRESHOLD || 100);
const BONUS_AMOUNT = Number(process.env.BONUS_AMOUNT || 500);
const BONUS_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24h

app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'change-me-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  })
);
app.use(express.static(path.join(__dirname, '..', 'public')));

// ---------- helpers ----------
function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Not logged in' });
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Not logged in' });
  const user = db.findUserById(req.session.userId);
  if (!user || !user.isAdmin) return res.status(403).json({ error: 'Admins only' });
  next();
}

function publicUser(u) {
  return {
    id: u.id,
    username: u.username,
    credits: Math.round(u.credits * 100) / 100,
    isAdmin: u.isAdmin,
    freeSpinsRemaining: u.freeSpinsRemaining || 0,
  };
}

// ---------- public game config (symbol -> icon mapping, grid size) ----------
app.get('/api/config', (req, res) => {
  res.json({
    grid: gameConfig.grid,
    symbols: gameConfig.symbols.map((s) => ({ id: s.id, file: s.file, tier: s.tier, name: s.name })),
  });
});

// ---------- auth ----------
app.post('/api/signup', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }
  const cleanUsername = String(username).trim();
  if (cleanUsername.length < 3 || cleanUsername.length > 24 || !/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
    return res.status(400).json({ error: 'Username must be 3-24 characters: letters, numbers, underscore.' });
  }
  if (String(password).length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }
  if (db.findUserByUsername(cleanUsername)) {
    return res.status(409).json({ error: 'That username is already taken.' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = db.createUser({
    username: cleanUsername,
    passwordHash,
    credits: STARTING_CREDITS, // fixed, automatic starting balance — not admin-assigned
    isAdmin: false,
  });

  req.session.userId = user.id;
  res.json({ user: publicUser(user) });
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body || {};
  const user = db.findUserByUsername(username || '');
  if (!user) return res.status(401).json({ error: 'Invalid username or password.' });

  const ok = await bcrypt.compare(password || '', user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Invalid username or password.' });

  req.session.userId = user.id;
  res.json({ user: publicUser(user) });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get('/api/me', requireAuth, (req, res) => {
  const user = db.findUserById(req.session.userId);
  if (!user) return res.status(401).json({ error: 'Not logged in' });
  res.json({ user: publicUser(user) });
});

// ---------- self-serve bonus (no admin involvement) ----------
app.post('/api/bonus/claim', requireAuth, (req, res) => {
  const user = db.findUserById(req.session.userId);
  if (!user) return res.status(401).json({ error: 'Not logged in' });

  if (user.credits > BONUS_THRESHOLD) {
    return res.status(400).json({ error: `Bonus only available under ${BONUS_THRESHOLD} credits.` });
  }
  const now = Date.now();
  if (user.lastBonusAt && now - new Date(user.lastBonusAt).getTime() < BONUS_COOLDOWN_MS) {
    const msLeft = BONUS_COOLDOWN_MS - (now - new Date(user.lastBonusAt).getTime());
    return res.status(400).json({ error: 'Bonus already claimed today.', msLeft });
  }

  const updated = db.updateUser(user.id, {
    credits: user.credits + BONUS_AMOUNT,
    lastBonusAt: new Date().toISOString(),
  });
  res.json({ user: publicUser(updated) });
});

// ---------- spin ----------
app.post('/api/spin', requireAuth, (req, res) => {
  const user = db.findUserById(req.session.userId);
  if (!user) return res.status(401).json({ error: 'Not logged in' });

  let bet = Number(req.body?.bet);
  if (!Number.isFinite(bet) || bet <= 0) bet = 1;
  bet = Math.min(bet, 100); // sane upper bound for a for-fun game

  const isFreeSpin = (user.freeSpinsRemaining || 0) > 0;

  if (!isFreeSpin && user.credits < bet) {
    return res.status(400).json({ error: 'Not enough credits. Claim your bonus or wait for the daily refill.' });
  }

  const result = runSpin(bet);

  let credits = user.credits;
  let freeSpinsRemaining = user.freeSpinsRemaining || 0;

  if (!isFreeSpin) {
    credits -= bet;
  } else {
    freeSpinsRemaining -= 1;
  }

  credits += result.totalWin;

  // scatter trigger / retrigger
  let scatterAwarded = 0;
  if (result.scatter.hit) {
    credits += result.scatter.hit.pay * bet;
    scatterAwarded = result.scatter.hit.pay * bet;
    freeSpinsRemaining += result.scatter.hit.freeSpins;
  }

  const stats = user.stats || { spins: 0, totalWagered: 0, totalWon: 0 };
  stats.spins += 1;
  stats.totalWagered += isFreeSpin ? 0 : bet;
  stats.totalWon += result.totalWin + scatterAwarded;

  const updated = db.updateUser(user.id, { credits, freeSpinsRemaining, stats });

  res.json({
    steps: result.steps,
    totalWin: Number((result.totalWin + scatterAwarded).toFixed(4)),
    scatter: result.scatter,
    isFreeSpin,
    user: publicUser(updated),
  });
});

// ---------- admin: read-only dashboard ----------
// Admins can VIEW players and stats. There is intentionally no endpoint
// to set/add credits to a specific user — starting credits are automatic
// on signup, and top-ups only happen through the player's own daily bonus.
app.get('/api/admin/users', requireAdmin, (req, res) => {
  const users = db
    .listUsers()
    .filter((u) => !u.isAdmin)
    .map((u) => ({
      id: u.id,
      username: u.username,
      credits: Math.round(u.credits * 100) / 100,
      spins: u.stats?.spins || 0,
      totalWagered: Math.round((u.stats?.totalWagered || 0) * 100) / 100,
      totalWon: Math.round((u.stats?.totalWon || 0) * 100) / 100,
      createdAt: u.createdAt,
    }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ users });
});

// ---------- bootstrap default admin account ----------
async function seedAdmin() {
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'ChangeMe123!';
  if (!db.findUserByUsername(adminUsername)) {
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    db.createUser({ username: adminUsername, passwordHash, credits: 0, isAdmin: true });
    console.log(`Seeded admin account "${adminUsername}". Set ADMIN_USERNAME/ADMIN_PASSWORD env vars to change it.`);
  }
}

seedAdmin().then(() => {
  app.listen(PORT, () => console.log(`Scatter Medallions running on port ${PORT}`));
});
