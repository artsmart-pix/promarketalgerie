const express    = require('express');
const crypto     = require('crypto');
const fs         = require('fs');
const path       = require('path');
const rateLimit  = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const db         = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { CATEGORIES } = require('../config/categories');

const router = express.Router();

// ── GET /api/listings — search with faceted filters ──────────
router.get('/', async (req, res) => {
  try {
    const {
      q, category, wilaya, min_price, max_price,
      currency, condition, is_boosted,
      sort = 'recent', page = 1, limit = 24,
    } = req.query;

    // Bound pagination to avoid unbounded scans from `?limit=100000`.
    const parsedLimit = Math.min(Math.max(parseInt(limit) || 24, 1), 50);
    const parsedPage  = Math.max(parseInt(page) || 1, 1);
    const offset = (parsedPage - 1) * parsedLimit;
    const params = [];
    let whereClause = "WHERE l.status = 'active'";

    const addParam = (val) => { params.push(val); return '?'; };

    if (q) {
      whereClause += ` AND (l.title_fr LIKE ${addParam('%' + q + '%')} OR l.description_fr LIKE ?)`;
      params.push('%' + q + '%');
    }
    if (category) {
      const cat = CATEGORIES.find(c => c.slug === category || c.id === parseInt(category));
      if (cat) whereClause += ` AND l.category_id = ${addParam(cat.id)}`;
    }
    if (wilaya)     whereClause += ` AND l.wilaya_id = ${addParam(parseInt(wilaya))}`;
    if (min_price)  whereClause += ` AND l.price >= ${addParam(parseFloat(min_price))}`;
    if (max_price)  whereClause += ` AND l.price <= ${addParam(parseFloat(max_price))}`;
    if (currency)   whereClause += ` AND l.currency = ${addParam(currency)}`;
    if (condition)  whereClause += ` AND l.condition = ${addParam(condition)}`;
    if (is_boosted === '1') whereClause += ` AND l.is_boosted = 1 AND l.boost_until > datetime('now')`;

    // Filtres attributs techniques dynamiques (attr_*)
    const attrFilters = Object.entries(req.query).filter(([k]) => k.startsWith('attr_'));
    for (const [key, val] of attrFilters) {
      if (val !== undefined && val !== null && val !== '') {
        const attrName = key.replace('attr_', '').replace(/[^a-zA-Z0-9_]/g, '');
        if (!attrName) continue;
        whereClause += ` AND json_extract(l.attributes, '$.${attrName}') = ${addParam(val)}`;
      }
    }

    const orderMap = {
      recent:     'l.is_boosted DESC, l.created_at DESC',
      price_asc:  'l.price ASC',
      price_desc: 'l.price DESC',
      views:      'l.view_count DESC',
    };
    const orderBy = Object.hasOwn(orderMap, sort) ? orderMap[sort] : orderMap.recent;

    const countParams = [...params];
    const countQ = await db.query(
      `SELECT COUNT(*) AS count FROM listings l ${whereClause}`,
      countParams
    );
    const total = parseInt(countQ.rows[0].count) || 0;

    params.push(parsedLimit, offset);
    const dataQ = await db.query(
      `SELECT l.id, l.title_fr, l.title_ar, l.price, l.currency, l.price_on_contact,
              l.condition, l.is_boosted, l.is_premium, l.brand, l.year,
              l.wilaya_id, l.commune, l.category_id, l.created_at,
              w.name_fr AS wilaya_name,
              (SELECT url FROM listing_media lm WHERE lm.listing_id = l.id AND lm.is_cover = 1 ORDER BY lm.sort_order LIMIT 1) AS cover_image,
              u.full_name AS seller_name, u.is_certified AS seller_certified, u.company_name
       FROM listings l
       LEFT JOIN wilayas w ON w.id = l.wilaya_id
       LEFT JOIN users   u ON u.id = l.user_id
       ${whereClause}
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`,
      params
    );

    res.json({
      data: dataQ.rows,
      pagination: { total, page: parsedPage, limit: parsedLimit, pages: Math.ceil(total / parsedLimit) },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ── GET /api/listings/carousel — premium carousel listings ───
router.get('/carousel', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT l.id, l.title_fr, l.price, l.currency, l.wilaya_id, w.name_fr AS wilaya_name,
              (SELECT url FROM listing_media lm WHERE lm.listing_id = l.id AND lm.is_cover = 1 LIMIT 1) AS cover_image
       FROM listings l
       LEFT JOIN wilayas w ON w.id = l.wilaya_id
       WHERE l.status = 'active' AND l.is_carousel = 1
       ORDER BY RANDOM() LIMIT 8`
    );
    res.json(rows);
  } catch {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ── GET /api/listings/user/mine — my listings ────────────────
// Must be before /:id to avoid route conflict
router.get('/user/mine', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT l.id, l.title_fr, l.price, l.currency, l.status, l.is_boosted,
              l.view_count, l.contact_clicks, l.created_at,
              (SELECT url FROM listing_media lm WHERE lm.listing_id = l.id AND lm.is_cover = 1 LIMIT 1) AS cover_image
       FROM listings l WHERE l.user_id = ? ORDER BY l.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ── GET /api/listings/:id — single listing detail ────────────
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT l.*, w.name_fr AS wilaya_name,
              u.full_name AS seller_name, u.company_name, u.logo_url,
              u.is_certified AS seller_certified, u.account_type,
              u.created_at AS seller_since,
              (SELECT COUNT(*) FROM listings sl WHERE sl.user_id = u.id AND sl.status = 'active') AS seller_listings_count
       FROM listings l
       LEFT JOIN wilayas w ON w.id = l.wilaya_id
       LEFT JOIN users   u ON u.id = l.user_id
       WHERE l.id = ? AND l.status = 'active'`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Annonce introuvable.' });

    const listing = rows[0];

    const media = await db.query(
      'SELECT id, url, url_thumb, is_cover, sort_order FROM listing_media WHERE listing_id = ? ORDER BY sort_order',
      [req.params.id]
    );
    listing.media = media.rows;

    db.run('UPDATE listings SET view_count = view_count + 1 WHERE id = ?', [req.params.id]).catch((err) => console.error(err));

    res.json(listing);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ── POST /api/listings — create listing ──────────────────────
router.post('/', authenticate, [
  body('title_fr').trim().notEmpty().isLength({ max: 300 }),
  body('category_id').isInt({ min: 1, max: 13 }),
  body('price').optional({ nullable: true }).isFloat({ min: 0 }),
  body('currency').optional().isIn(['DZD', 'EUR']),
  body('wilaya_id').isInt({ min: 1, max: 58 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

  const {
    title_fr, title_ar, description_fr, description_ar,
    category_id, subcategory_id, price, currency, price_on_contact,
    wilaya_id, commune, attributes, condition, brand, year, reference_num,
  } = req.body;

  const packLimits = { free: 3, starter_pro: 10, business_pro: 50, concessionnaire_elite: -1 };
  const packLimit = packLimits[req.user.pack] ?? 3;
  if (packLimit !== -1) {
    const countQ = await db.query(
      "SELECT COUNT(*) AS count FROM listings WHERE user_id = ? AND status NOT IN ('expired', 'rejected')",
      [req.user.id]
    );
    if ((parseInt(countQ.rows[0].count) || 0) >= packLimit) {
      return res.status(403).json({ error: `Quota d'annonces atteint pour votre pack (${packLimit}). Passez au pack supérieur.` });
    }
  }

  try {
    const listingId = crypto.randomUUID();
    await db.run(
      `INSERT INTO listings
       (id, user_id, category_id, subcategory_id, title_fr, title_ar,
        description_fr, description_ar, price, currency, price_on_contact,
        wilaya_id, commune, attributes, condition, brand, year, reference_num)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        listingId, req.user.id, category_id, subcategory_id || null,
        title_fr, title_ar || null,
        description_fr || null, description_ar || null,
        price || null, currency || 'DZD', price_on_contact ? 1 : 0,
        wilaya_id, commune || null,
        JSON.stringify(attributes || {}),
        condition || null, brand || null, year || null, reference_num || null,
      ]
    );
    const { rows } = await db.query(
      'SELECT id, title_fr, status, created_at FROM listings WHERE id = ?',
      [listingId]
    );
    res.status(201).json({ ...rows[0], message: 'Annonce soumise — en attente de modération.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ── PUT /api/listings/:id — edit own listing ─────────────────
router.put('/:id', authenticate, [
  body('title_fr').optional().trim().notEmpty().isLength({ max: 300 }),
  body('price').optional({ nullable: true }).isFloat({ min: 0 }),
  body('currency').optional().isIn(['DZD', 'EUR']),
  body('condition').optional({ nullable: true }).isIn(['new', 'excellent', 'good', 'fair', 'for_parts']),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });
  try {
    const check = await db.query('SELECT user_id FROM listings WHERE id = ?', [req.params.id]);
    if (!check.rows.length) return res.status(404).json({ error: 'Annonce introuvable.' });
    if (check.rows[0].user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Non autorisé.' });
    }
    const { title_fr, title_ar, description_fr, description_ar, price, currency, price_on_contact, attributes, condition } = req.body;
    const updates = [];
    const values = [];
    if (title_fr !== undefined) { updates.push('title_fr=?'); values.push(title_fr); }
    if (title_ar !== undefined) { updates.push('title_ar=?'); values.push(title_ar); }
    if (description_fr !== undefined) { updates.push('description_fr=?'); values.push(description_fr); }
    if (description_ar !== undefined) { updates.push('description_ar=?'); values.push(description_ar); }
    if (price !== undefined) { updates.push('price=?'); values.push(price); }
    if (currency !== undefined) { updates.push('currency=?'); values.push(currency); }
    if (price_on_contact !== undefined) { updates.push('price_on_contact=?'); values.push(price_on_contact ? 1 : 0); }
    if (attributes !== undefined) { updates.push('attributes=?'); values.push(JSON.stringify(attributes)); }
    if (condition !== undefined) { updates.push('condition=?'); values.push(condition); }
    if (!updates.length) return res.status(422).json({ error: 'Aucun champ à mettre à jour.' });
    updates.push("status='pending'");
    updates.push("updated_at=datetime('now')");
    values.push(req.params.id);
    await db.run(
      `UPDATE listings SET ${updates.join(', ')} WHERE id=?`,
      values
    );
    res.json({ message: 'Annonce mise à jour — en attente de modération.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ── DELETE /api/listings/:id — delete own listing ────────────
router.delete('/:id', authenticate, async (req, res) => {
  const listingId = req.params.id;
  const uploadDir = path.resolve(process.env.UPLOAD_DIR || './uploads');

  try {
    const check = await db.query('SELECT user_id FROM listings WHERE id = ?', [listingId]);
    if (!check.rows.length) return res.status(404).json({ error: 'Annonce introuvable.' });
    if (check.rows[0].user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Non autorisé.' });
    }

    const mediaFiles = await db.transaction(async () => {
      const mediaQ = await db.query('SELECT url, url_thumb FROM listing_media WHERE listing_id = ?', [listingId]);

      await db.run('DELETE FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE listing_id = ?)', [listingId]);
      await db.run('DELETE FROM conversations WHERE listing_id = ?', [listingId]);
      await db.run('DELETE FROM favorites WHERE listing_id = ?', [listingId]);
      await db.run('DELETE FROM listing_media WHERE listing_id = ?', [listingId]);
      await db.run('DELETE FROM boost_orders WHERE listing_id = ?', [listingId]);

      const result = await db.run('DELETE FROM listings WHERE id = ?', [listingId]);
      if (result.changes === 0) {
        const e = new Error('Annonce introuvable.');
        e.code = 'NOT_FOUND';
        throw e;
      }
      return mediaQ.rows || [];
    });

    for (const m of mediaFiles) {
      try {
        if (m.url) fs.unlinkSync(path.join(uploadDir, path.basename(m.url)));
        if (m.url_thumb) fs.unlinkSync(path.join(uploadDir, path.basename(m.url_thumb)));
      } catch (fileErr) {
        console.warn('Could not delete file:', fileErr.message);
      }
    }

    res.json({ message: 'Annonce supprimée.' });
  } catch (err) {
    if (err.code === 'NOT_FOUND') return res.status(404).json({ error: 'Annonce introuvable.' });
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

const revealPhoneLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
});

// ── POST /api/listings/:id/reveal-phone ──────────────────────
router.post('/:id/reveal-phone', revealPhoneLimiter, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT u.phone FROM listings l JOIN users u ON u.id = l.user_id
       WHERE l.id = ? AND l.status = 'active'`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Annonce introuvable.' });

    db.run(
      'INSERT OR IGNORE INTO phone_reveals (id, listing_id, viewer_ip) VALUES (?,?,?)',
      [crypto.randomUUID(), req.params.id, req.ip]
    ).catch((err) => console.error(err));
    db.run('UPDATE listings SET contact_clicks = contact_clicks + 1 WHERE id = ?', [req.params.id]).catch((err) => console.error(err));

    res.json({ phone: rows[0].phone });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

module.exports = router;
