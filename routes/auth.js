// routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

router.post('/signup', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }
    if (!USERNAME_RE.test(username)) {
      return res.status(400).json({
        error: 'Username must be 3-20 characters: letters, numbers, underscore only.',
      });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existing) {
      return res.status(409).json({ error: 'That username is already taken.' });
    }

    const hash = await bcrypt.hash(password, 10);
    // New accounts start at 0 credits by design -- an admin assigns credits afterward.
    const info = db
      .prepare('INSERT INTO users (username, password_hash, credits, is_admin) VALUES (?, ?, 0, 0)')
      .run(username, hash);

    req.session.userId = info.lastInsertRowid;
    return res.json({
      ok: true,
      user: { id: info.lastInsertRowid, username, credits: 0, is_admin: false },
    });
  } catch (err) {
    console.error('signup error', err);
    return res.status(500).json({ error: 'Something went wrong creating your account.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }
    if (user.is_banned) {
      return res.status(403).json({ error: 'This account has been suspended.' });
    }
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }
    req.session.userId = user.id;
    return res.json({
      ok: true,
      user: {
        id: user.id,
        username: user.username,
        credits: user.credits,
        is_admin: !!user.is_admin,
      },
    });
  } catch (err) {
    console.error('login error', err);
    return res.status(500).json({ error: 'Something went wrong logging in.' });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ ok: true });
  });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      username: req.user.username,
      credits: req.user.credits,
      is_admin: !!req.user.is_admin,
    },
  });
});

module.exports = router;
