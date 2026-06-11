const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const crypto   = require('crypto');
const { body, validationResult } = require('express-validator');
const db       = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// ── POST /api/auth/register ──────────────────────────────────
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Mot de passe trop court (8 caractères min).'),
  body('full_name').trim().notEmpty(),
  body('phone').optional().isMobilePhone(),
  body('account_type').optional().isIn(['individual', 'professional']),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

  const { email, password, full_name, phone, account_type, company_name, wilaya_id } = req.body;

  try {
    const exists = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (exists.rows.length) return res.status(409).json({ error: 'Email déjà utilisé.' });

    const hash = await bcrypt.hash(password, 12);
    const userId = crypto.randomUUID();
    await db.run(
      `INSERT INTO users (id, email, password_hash, full_name, phone, account_type, company_name, wilaya_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, email, hash, full_name, phone || null, account_type || 'individual', company_name || null, wilaya_id || null]
    );
    
    const { rows } = await db.query(
      'SELECT id, email, full_name, role, pack FROM users WHERE id = ?',
      [userId]
    );

    const token = jwt.sign({ userId: rows[0].id, role: rows[0].role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
    res.status(201).json({ user: rows[0], token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ── POST /api/auth/login ─────────────────────────────────────
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

  const { email, password } = req.body;
  try {
    const { rows } = await db.query(
      'SELECT id, email, password_hash, full_name, role, pack, is_active FROM users WHERE email = ?',
      [email]
    );
    if (!rows.length) return res.status(401).json({ error: 'Identifiants incorrects.' });

    const user = rows[0];
    if (!user.is_active) return res.status(403).json({ error: 'Compte désactivé.' });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Identifiants incorrects.' });

    delete user.password_hash;
    const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
    res.json({ user, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ── GET /api/auth/me ─────────────────────────────────────────
router.get('/me', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, email, full_name, phone, role, account_type, pack, pack_expires,
              company_name, logo_url, is_certified, wilaya_id, created_at
       FROM users WHERE id = ?`,
      [req.user.id]
    );
    res.json(rows[0]);
  } catch {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ── PUT /api/auth/profile ────────────────────────────────────
router.put('/profile', authenticate, [
  body('full_name').optional().trim().notEmpty(),
  body('phone').optional().isMobilePhone('any'),
], async (req, res) => {
  const { full_name, phone, company_name, wilaya_id, commune, phone_visible } = req.body;
  try {
    const updates = [];
    const values = [];
    if (full_name !== undefined) { updates.push('full_name=?'); values.push(full_name); }
    if (phone !== undefined) { updates.push('phone=?'); values.push(phone); }
    if (company_name !== undefined) { updates.push('company_name=?'); values.push(company_name); }
    if (wilaya_id !== undefined) { updates.push('wilaya_id=?'); values.push(wilaya_id); }
    if (commune !== undefined) { updates.push('commune=?'); values.push(commune); }
    if (phone_visible !== undefined) { updates.push('phone_visible=?'); values.push(phone_visible); }
    if (!updates.length) return res.status(422).json({ error: 'Aucun champ à mettre à jour.' });
    updates.push('updated_at=datetime(\'now\')');
    values.push(req.user.id);
    await db.run(
      `UPDATE users SET ${updates.join(', ')} WHERE id=?`,
      values
    );
    const { rows } = await db.query(
      'SELECT id, email, full_name, phone, company_name FROM users WHERE id = ?',
      [req.user.id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

module.exports = router;
