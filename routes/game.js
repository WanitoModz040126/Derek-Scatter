// routes/game.js
const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { resolveSpin } = require('../config/gameEngine');
const { GRID_COLS, GRID_ROWS, SCATTER, PAYTABLE } = require('../config/paytable');

const router = express.Router();

const MIN_BET = 1;
const MAX_BET = 1000;

router.get('/config', requireAuth, (req, res) => {
  res.json({
    cols: GRID_COLS,
    rows: GRID_ROWS,
    scatterIcon: SCATTER.icon,
    paytable: PAYTABLE.map((p) => ({
      icon: p.icon, name: p.name, tier: p.tier, pays: p.pays,
    })),
    minBet: MIN_BET,
    maxBet: MAX_BET,
  });
});

router.post('/spin', requireAuth, (req, res) => {
  try {
    const bet = parseInt(req.body && req.body.bet, 10);
    if (!Number.isFinite(bet) || bet < MIN_BET || bet > MAX_BET) {
      return res.status(400).json({ error: `Bet must be between ${MIN_BET} and ${MAX_BET}.` });
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    if (user.credits < bet) {
      return res.status(400).json({ error: 'Not enough credits. Ask an admin to top you up.' });
    }

    // Deduct bet, resolve spin, credit winnings -- all in one transaction
    // so credits can never desync from game outcomes.
    const result = resolveSpin(bet);

    const tx = db.transaction(() => {
      db.prepare('UPDATE users SET credits = credits - ? WHERE id = ?').run(bet, user.id);
      if (result.grandTotalWin > 0) {
        db.prepare('UPDATE users SET credits = credits + ? WHERE id = ?').run(result.grandTotalWin, user.id);
      }
      db.prepare(
        'INSERT INTO spins (user_id, bet, win, scatter_count, free_spins) VALUES (?, ?, ?, ?, ?)'
      ).run(user.id, bet, result.grandTotalWin, result.scatterCount, result.freeSpinsAwarded);
    });
    tx();

    const updated = db.prepare('SELECT credits FROM users WHERE id = ?').get(user.id);

    return res.json({
      ok: true,
      bet,
      ...result,
      credits: updated.credits,
    });
  } catch (err) {
    console.error('spin error', err);
    return res.status(500).json({ error: 'Something went wrong resolving the spin.' });
  }
});

module.exports = router;
