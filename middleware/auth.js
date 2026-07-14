// middleware/auth.js
const db = require('../db');

function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    if (req.path.startsWith('/api/')) {
      return res.status(401).json({ error: 'Not logged in.' });
    }
    return res.redirect('/login.html');
  }
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
  if (!user || user.is_banned) {
    req.session.destroy(() => {});
    if (req.path.startsWith('/api/')) {
      return res.status(401).json({ error: 'Session invalid.' });
    }
    return res.redirect('/login.html');
  }
  req.user = user;
  next();
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (!req.user.is_admin) {
      if (req.path.startsWith('/api/')) {
        return res.status(403).json({ error: 'Admins only.' });
      }
      return res.redirect('/');
    }
    next();
  });
}

module.exports = { requireAuth, requireAdmin };
