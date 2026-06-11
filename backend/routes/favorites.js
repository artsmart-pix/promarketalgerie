const express = require('express');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/favorites — list my saved listings
router.get('/', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT l.id, l.title_fr, l.price, l.currency, l.condition, l.wilaya_id,
              w.name_fr AS wilaya_name, f.created_at AS saved_at,
              (SELECT url FROM listing_media lm WHERE lm.listing_id = l.id AND lm.is_cover = 1 LIMIT 1) AS cover_image,
              l.status
       FROM favorites f
       JOIN listings l ON l.id = f.listing_id
       LEFT JOIN wilayas w ON w.id = l.wilaya_id
       WHERE f.user_id = ?
       ORDER BY f.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// POST /api/favorites/:listingId — add to favorites
router.post('/:listingId', authenticate, async (req, res) => {
  try {
    await db.run(
      'INSERT OR IGNORE INTO favorites (user_id, listing_id) VALUES (?,?)',
      [req.user.id, req.params.listingId]
    );
    res.status(201).json({ message: 'Ajouté aux favoris.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// DELETE /api/favorites/:listingId — remove from favorites
router.delete('/:listingId', authenticate, async (req, res) => {
  try {
    await db.run(
      'DELETE FROM favorites WHERE user_id = ? AND listing_id = ?',
      [req.user.id, req.params.listingId]
    );
    res.json({ message: 'Retiré des favoris.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// GET /api/favorites/check/:listingId — is this listing saved?
router.get('/check/:listingId', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT id FROM favorites WHERE user_id = ? AND listing_id = ?',
      [req.user.id, req.params.listingId]
    );
    res.json({ is_favorite: rows.length > 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

module.exports = router;
