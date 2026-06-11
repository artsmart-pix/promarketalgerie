const express = require('express');
const { CATEGORIES } = require('../config/categories');
const db = require('../config/database');

const router = express.Router();

// GET /api/categories — all 10 main categories
router.get('/', (req, res) => {
  res.json(CATEGORIES.map(c => ({
    id: c.id, slug: c.slug,
    name_fr: c.name_fr, name_ar: c.name_ar,
    icon: c.icon,
    subcategory_count: c.subcategories.length,
  })));
});

// GET /api/categories/:slug — category detail with filters & subcategories
router.get('/:slug', (req, res) => {
  const cat = CATEGORIES.find(c => c.slug === req.params.slug);
  if (!cat) return res.status(404).json({ error: 'Rubrique introuvable.' });
  res.json(cat);
});

// GET /api/categories/:slug/stats — listing count per category
router.get('/:slug/stats', async (req, res) => {
  const cat = CATEGORIES.find(c => c.slug === req.params.slug);
  if (!cat) return res.status(404).json({ error: 'Rubrique introuvable.' });
  try {
    const { rows } = await db.query(
      `SELECT COUNT(*) AS total FROM listings
       WHERE category_id = ? AND status = 'active'`,
      [cat.id]
    );
    res.json({ category: cat.slug, total: parseInt(rows[0].total) });
  } catch {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// GET /api/wilayas — all 58 Algerian wilayas
router.get('/geo/wilayas', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM wilayas ORDER BY id');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// GET /api/wilayas/:id/communes
router.get('/geo/wilayas/:id/communes', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM communes WHERE wilaya_id = ? ORDER BY name_fr',
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

module.exports = router;
