const express = require('express');
const crypto = require('crypto');
const db = require('../config/database');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

// ── PUBLIC: Get active advertisements ─────────────────────────
router.get('/', async (req, res) => {
  try {
    const { position = 'homepage' } = req.query;
    const { rows } = await db.query(
      `SELECT id, title, image_url, link_url, position, start_date, end_date, is_active
       FROM advertisements
       WHERE position = ? AND is_active = 1
         AND (start_date IS NULL OR start_date <= datetime('now'))
         AND (end_date IS NULL OR end_date >= datetime('now'))
       ORDER BY created_at DESC`,
      [position]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ── ADMIN: List all advertisements ────────────────────────────
router.get('/admin', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT a.*, u.full_name AS created_by_name
       FROM advertisements a
       LEFT JOIN users u ON u.id = a.created_by
       ORDER BY a.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ── ADMIN: Create advertisement ───────────────────────────────
router.post('/', authenticate, requireRole('admin'), async (req, res) => {
  const { title, image_url, link_url, position, start_date, end_date } = req.body;
  if (!title || !image_url) {
    return res.status(422).json({ error: 'Titre et image obligatoires.' });
  }
  try {
    const id = crypto.randomUUID();
    await db.run(
      `INSERT INTO advertisements (id, title, image_url, link_url, position, start_date, end_date, created_by)
       VALUES (?,?,?,?,?,?,?,?)`,
      [id, title, image_url, link_url || null, position || 'homepage', start_date || null, end_date || null, req.user.id]
    );
    res.status(201).json({ id, message: 'Publicité créée.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ── ADMIN: Update advertisement ───────────────────────────────
router.put('/:id', authenticate, requireRole('admin'), async (req, res) => {
  const { title, image_url, link_url, position, start_date, end_date, is_active } = req.body;
  try {
    await db.run(
      `UPDATE advertisements
       SET title=?, image_url=?, link_url=?, position=?, start_date=?, end_date=?, is_active=?, updated_at=datetime('now')
       WHERE id=?`,
      [title, image_url, link_url || null, position, start_date || null, end_date || null, is_active ? 1 : 0, req.params.id]
    );
    res.json({ message: 'Publicité mise à jour.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ── ADMIN: Delete advertisement ───────────────────────────────
router.delete('/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    await db.run('DELETE FROM advertisements WHERE id = ?', [req.params.id]);
    res.json({ message: 'Publicité supprimée.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ── ADMIN: Toggle active status ───────────────────────────────
router.patch('/:id/toggle', authenticate, requireRole('admin'), async (req, res) => {
  try {
    await db.run(
      'UPDATE advertisements SET is_active = NOT is_active WHERE id = ?',
      [req.params.id]
    );
    const { rows } = await db.query(
      'SELECT id, is_active FROM advertisements WHERE id = ?',
      [req.params.id]
    );
    res.json({ is_active: rows[0].is_active, message: rows[0].is_active ? 'Activée.' : 'Désactivée.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ── PUBLIC: Track click ───────────────────────────────────────
router.post('/:id/click', async (req, res) => {
  try {
    await db.run('UPDATE advertisements SET click_count = click_count + 1 WHERE id = ?', [req.params.id]);
    res.json({ message: 'Click tracked.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

module.exports = router;
