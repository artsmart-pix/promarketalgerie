const jwt = require('jsonwebtoken');
const db  = require('../config/database');

async function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token manquant ou invalide.' });
  }
  const token = header.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const { rows } = await db.query(
      'SELECT id, email, role, pack, is_active FROM users WHERE id = ?',
      [payload.userId]
    );
    if (!rows.length || !rows[0].is_active) {
      return res.status(401).json({ error: 'Compte introuvable ou désactivé.' });
    }
    req.user = rows[0];
    next();
  } catch {
    return res.status(401).json({ error: 'Token expiré ou invalide.' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Accès refusé.' });
    }
    next();
  };
}

module.exports = { authenticate, requireRole };
