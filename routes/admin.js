// routes/admin.js
const express = require('express');
const db = require('../db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/users', requireAdmin, (req, res) => {
  const users = db
    .prepare(
      'SELECT id, username, credits, is_admin, is_banned, created_at FROM users ORDER BY created_at DESC'
    )
    .all();
  res.json({ users });
});

router.post('/credit', requireAdmin, (req, res) => {
  try {
    const { userId, amount, mode, reason } = req.body || {};
    const uid = parseInt(userId, 10);
    const amt = parseInt(amount, 10);
    if (!Number.isFinite(uid) || !Number.isFinite(amt)) {
      return res.status(400).json({ error: 'userId and amount are required numbers.' });
    }
    if (!['add', 'set'].includes(mode)) {
      return res.status(400).json({ error: "mode must be 'add' or 'set'." });
    }

    const target = db.prepare('SELECT * FROM users WHERE id = ?').get(uid);
    if (!target) return res.status(404).json({ error: 'User not found.' });

    let delta;
    const tx = db.transaction(() => {
      if (mode === 'set') {
        if (amt < 0) throw new Error('Credits cannot be set below 0.');
        delta = amt - target.credits;
        db.prepare('UPDATE users SET credits = ? WHERE id = ?').run(amt, uid);
      } else {
        const newBalance = target.credits + amt;
        if (newBalance < 0) throw new Error('Resulting balance cannot be negative.');
        delta = amt;
        db.prepare('UPDATE users SET credits = credits + ? WHERE id = ?').run(amt, uid);
      }
      db.prepare(
        'INSERT INTO credit_log (user_id, admin_id, delta, reason) VALUES (?, ?, ?, ?)'
      ).run(uid, req.user.id, delta, reason || null);
    });
    tx();

    const updated = db.prepare('SELECT id, username, credits FROM users WHERE id = ?').get(uid);
    res.json({ ok: true, user: updated });
  } catch (err) {
    console.error('admin credit error', err);
    res.status(400).json({ error: err.message || 'Could not update credits.' });
  }
});

router.post('/ban', requireAdmin, (req, res) => {
  const { userId, banned } = req.body || {};
  const uid = parseInt(userId, 10);
  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(uid);
  if (!target) return res.status(404).json({ error: 'User not found.' });
  if (target.id === req.user.id) {
    return res.status(400).json({ error: 'You cannot ban your own account.' });
  }
  db.prepare('UPDATE users SET is_banned = ? WHERE id = ?').run(banned ? 1 : 0, uid);
  res.json({ ok: true });
});

router.get('/stats', requireAdmin, (req, res) => {
  const totals = db
    .prepare(
      `SELECT
        (SELECT COUNT(*) FROM users) AS totalUsers,
        (SELECT COALESCE(SUM(credits),0) FROM users) AS totalCredits,
        (SELECT COUNT(*) FROM spins) AS totalSpins,
        (SELECT COALESCE(SUM(bet),0) FROM spins) AS totalWagered,
        (SELECT COALESCE(SUM(win),0) FROM spins) AS totalWon
      `
    )
    .get();
  res.json(totals);
});

router.get('/log/:userId', requireAdmin, (req, res) => {
  const uid = parseInt(req.params.userId, 10);
  const log = db
    .prepare(
      `SELECT cl.*, a.username AS admin_username FROM credit_log cl
       LEFT JOIN users a ON a.id = cl.admin_id
       WHERE cl.user_id = ? ORDER BY cl.created_at DESC LIMIT 100`
    )
    .all(uid);
  res.json({ log });
});

module.exports = router;
