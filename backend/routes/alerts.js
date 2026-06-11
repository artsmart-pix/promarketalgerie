const express = require('express');
const crypto  = require('crypto');
const db      = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/alerts — my saved search alerts
router.get('/', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM alerts WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// POST /api/alerts — create a new alert
router.post('/', authenticate, async (req, res) => {
  const { label, filters, notify_email, notify_sms } = req.body;
  if (!filters || typeof filters !== 'object') {
    return res.status(422).json({ error: 'Filtres requis.' });
  }
  try {
    const alertId = crypto.randomUUID();
    await db.run(
      `INSERT INTO alerts (id, user_id, label, filters, notify_email, notify_sms)
       VALUES (?,?,?,?,?,?)`,
      [alertId, req.user.id, label || 'Alerte sans nom', JSON.stringify(filters), notify_email !== 0 ? 1 : 0, notify_sms ? 1 : 0]
    );
    const { rows } = await db.query('SELECT * FROM alerts WHERE id = ?', [alertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// DELETE /api/alerts/:id — delete an alert
router.delete('/:id', authenticate, async (req, res) => {
  try {
    await db.run('DELETE FROM alerts WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ message: 'Alerte supprimée.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// PATCH /api/alerts/:id/toggle — enable/disable alert
router.patch('/:id/toggle', authenticate, async (req, res) => {
  try {
    await db.run(
      'UPDATE alerts SET is_active = NOT is_active WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    const { rows } = await db.query(
      'SELECT id, is_active FROM alerts WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Alerte introuvable.' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

module.exports = router;
