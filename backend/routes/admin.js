const express = require('express');
const crypto  = require('crypto');
const bcrypt  = require('bcryptjs');
const fs      = require('fs').promises;
const path    = require('path');
const { param, body, validationResult } = require('express-validator');
const db      = require('../config/database');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate, requireRole('admin'));

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });
  next();
};

// ── MODERATION ───────────────────────────────────────────────

// GET /api/admin/listings/pending — list pending listings
router.get('/listings/pending', async (req, res) => {
  try {
    const { page = 1, limit = 30 } = req.query;
    const parsedLimit = Math.min(parseInt(limit) || 30, 100);
    const offset = (parseInt(page) - 1) * parsedLimit;
    const { rows } = await db.query(
      `SELECT l.id, l.title_fr, l.price, l.currency, l.created_at,
              u.full_name AS seller_name, u.email AS seller_email, u.phone AS seller_phone,
              c.name_fr AS category_name
       FROM listings l
       JOIN users u ON u.id = l.user_id
       LEFT JOIN categories c ON c.id = l.category_id
       WHERE l.status = 'pending'
       ORDER BY l.created_at ASC
       LIMIT ? OFFSET ?`,
      [parsedLimit, offset]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// PATCH /api/admin/listings/:id/approve — approve a listing
router.patch('/listings/:id/approve', param('id').isUUID(), handleValidationErrors, async (req, res) => {
  try {
    await db.run(
      `UPDATE listings SET status='active', moderated_by=?, moderated_at=datetime('now') WHERE id=?`,
      [req.user.id, req.params.id]
    );
    res.json({ message: 'Annonce approuvée.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// PATCH /api/admin/listings/:id/reject — reject a listing
router.patch('/listings/:id/reject', param('id').isUUID(), handleValidationErrors, async (req, res) => {
  const { reason } = req.body;
  if (!reason?.trim()) return res.status(422).json({ error: 'Raison de rejet obligatoire.' });
  try {
    await db.run(
      `UPDATE listings SET status='rejected', rejection_reason=?, moderated_by=?, moderated_at=datetime('now') WHERE id=?`,
      [reason.trim(), req.user.id, req.params.id]
    );
    res.json({ message: 'Annonce rejetée.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// PATCH /api/admin/listings/:id/boost — manually activate a boost
router.patch('/listings/:id/boost', param('id').isUUID(), handleValidationErrors, async (req, res) => {
  const { days = 7, is_carousel = 0, is_premium = 0 } = req.body;
  try {
    await db.run(
      `UPDATE listings SET is_boosted=1, boost_until=datetime('now', '+' || ? || ' days'),
       is_carousel=?, is_premium=? WHERE id=?`,
      [parseInt(days), is_carousel ? 1 : 0, is_premium ? 1 : 0, req.params.id]
    );
    res.json({ message: 'Boost activé.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// DELETE /api/admin/listings/:id — delete a listing (admin only)
router.delete('/listings/:id', param('id').isUUID(), handleValidationErrors, async (req, res) => {
  const listingId = req.params.id;
  const uploadDir = path.resolve(process.env.UPLOAD_DIR || './uploads');

  try {
    await db.run('BEGIN TRANSACTION');

    // 1. Get media files to delete from disk
    const mediaQ = await db.query('SELECT url, url_thumb FROM listing_media WHERE listing_id = ?', [listingId]);
    const mediaFiles = mediaQ.rows || [];

    // 2. Delete related records (order matters for FK constraints if any)
    await db.run('DELETE FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE listing_id = ?)', [listingId]);
    await db.run('DELETE FROM conversations WHERE listing_id = ?', [listingId]);
    await db.run('DELETE FROM favorites WHERE listing_id = ?', [listingId]);
    await db.run('DELETE FROM listing_media WHERE listing_id = ?', [listingId]);
    await db.run('DELETE FROM boost_orders WHERE listing_id = ?', [listingId]);

    // 3. Delete the listing
    const result = await db.run('DELETE FROM listings WHERE id = ?', [listingId]);

    if (result.changes === 0) {
      await db.run('ROLLBACK');
      return res.status(404).json({ error: 'Annonce introuvable.' });
    }

    await db.run('COMMIT');

    // 4. Delete physical files (best effort, don't fail if missing)
    for (const m of mediaFiles) {
      try {
        if (m.url) await fs.unlink(path.join(uploadDir, path.basename(m.url)));
        if (m.url_thumb) await fs.unlink(path.join(uploadDir, path.basename(m.url_thumb)));
      } catch (fileErr) {
        console.warn('Could not delete file:', fileErr.message);
      }
    }

    res.json({ message: 'Annonce supprimée définitivement.' });
  } catch (err) {
    await db.run('ROLLBACK').catch(() => {});
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur lors de la suppression.' });
  }
});

// ── USERS ────────────────────────────────────────────────────

// GET /api/admin/users — list all users
router.get('/users', async (req, res) => {
  const { page = 1, limit = 50, search, role } = req.query;
  const parsedLimit = Math.min(parseInt(limit) || 50, 100);
  const offset = (parseInt(page) - 1) * parsedLimit;
  const params = [];
  let where = 'WHERE 1=1';
  if (search) {
    const term = '%' + search + '%';
    params.push(term, term);
    where += ' AND (email LIKE ? OR full_name LIKE ?)';
  }
  if (role) {
    params.push(role);
    where += ' AND role = ?';
  }
  params.push(parsedLimit, offset);
  try {
    const { rows } = await db.query(
      `SELECT id, email, full_name, role, pack, is_certified, is_active, created_at
       FROM users ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// PATCH /api/admin/users/:id/certify — grant "Vendeur Certifié" badge
router.patch('/users/:id/certify', param('id').isUUID(), handleValidationErrors, async (req, res) => {
  try {
    await db.run('UPDATE users SET is_certified = 1 WHERE id = ?', [req.params.id]);
    res.json({ message: 'Badge "Vendeur Certifié" octroyé.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// PATCH /api/admin/users/:id/toggle-active — ban / unban user
router.patch('/users/:id/toggle-active', param('id').isUUID(), handleValidationErrors, async (req, res) => {
  try {
    await db.run(
      'UPDATE users SET is_active = NOT is_active WHERE id = ?',
      [req.params.id]
    );
    const { rows } = await db.query(
      'SELECT id, is_active FROM users WHERE id = ?',
      [req.params.id]
    );
    res.json({ is_active: rows[0].is_active, message: rows[0].is_active ? 'Compte activé.' : 'Compte suspendu.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// PATCH /api/admin/users/:id/set-pack — manually assign a subscription pack
router.patch('/users/:id/set-pack', param('id').isUUID(), handleValidationErrors, async (req, res) => {
  const { pack, days = 30 } = req.body;
  const validPacks = ['free','starter_pro','business_pro','concessionnaire_elite'];
  if (!validPacks.includes(pack)) return res.status(422).json({ error: 'Pack invalide.' });
  try {
    await db.run(
      `UPDATE users SET pack=?, pack_expires=datetime('now', '+' || ? || ' days') WHERE id=?`,
      [pack, parseInt(days), req.params.id]
    );
    res.json({ message: `Pack "${pack}" activé pour ${days} jours.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ── SUBSCRIPTION ORDERS ──────────────────────────────────────

// GET /api/admin/orders — pending subscription orders
router.get('/orders', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT so.*, u.full_name, u.email FROM subscription_orders so
       JOIN users u ON u.id = so.user_id
       WHERE so.payment_status = 'pending'
       ORDER BY so.created_at ASC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// PATCH /api/admin/orders/:id/validate — validate a payment
router.patch('/orders/:id/validate', param('id').isUUID(), handleValidationErrors, async (req, res) => {
  try {
    const orderQ = await db.query('SELECT * FROM subscription_orders WHERE id = ?', [req.params.id]);
    if (!orderQ.rows.length) return res.status(404).json({ error: 'Commande introuvable.' });
    const order = orderQ.rows[0];

    await db.run(
      "UPDATE subscription_orders SET payment_status=?, validated_by=?, validated_at=datetime('now') WHERE id=?",
      ['validated', req.user.id, req.params.id]
    );

    const packDurations = { starter_pro: 30, business_pro: 30, concessionnaire_elite: 30 };
    const days = packDurations[order.pack] || 30;
    await db.run(
      `UPDATE users SET pack=?, pack_expires=datetime('now', '+' || ? || ' days') WHERE id=?`,
      [order.pack, days, order.user_id]
    );

    res.json({ message: 'Paiement validé et pack activé.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ── CREATE LISTING (Admin on behalf of client) ──────────────
router.post('/listings/create', [
  body('title_fr').trim().notEmpty().isLength({ max: 300 }),
  body('category_id').isInt({ min: 1, max: 13 }),
  body('price').optional({ nullable: true }).isFloat({ min: 0 }),
  body('wilaya_id').isInt({ min: 1, max: 58 }),
], handleValidationErrors, async (req, res) => {
  const {
    category_id, title_fr, price, currency, wilaya_id,
    brand, year, condition, description_fr,
    seller_name, seller_phone, is_premium, is_boosted, is_carousel
  } = req.body;

  if (!category_id || !title_fr || !wilaya_id || !seller_name || !seller_phone) {
    return res.status(422).json({ error: 'Champs obligatoires manquants.' });
  }

  try {
    await db.run('BEGIN TRANSACTION');
    let sellerId;
    const existing = await db.query('SELECT id FROM users WHERE phone = ?', [seller_phone]);
    if (existing.rows.length) {
      sellerId = existing.rows[0].id;
    } else {
      const tempEmail = `seller_${Date.now()}@temp.promarket.dz`;
      const tempPass = crypto.randomBytes(16).toString('hex');
      const hash = await bcrypt.hash(tempPass, 12);
      const newId = crypto.randomUUID();
      await db.run(
        `INSERT INTO users (id, email, password_hash, full_name, phone, role, account_type)
         VALUES (?,?,?,?,?,'seller','individual')`,
        [newId, tempEmail, hash, seller_name, seller_phone]
      );
      sellerId = newId;
    }

    let fullDescription = description_fr || '';
    if (seller_name || seller_phone) {
      fullDescription += `\n\n--- Contact ---\nVendeur: ${seller_name}\nTéléphone: ${seller_phone}`;
    }

    const listingId = crypto.randomUUID();
    await db.run(
      `INSERT INTO listings
       (id, user_id, category_id, title_fr, description_fr, price, currency,
        wilaya_id, condition, brand, year, status, is_premium, is_boosted, is_carousel,
        moderated_by, moderated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,'active',?,?,?,?,datetime('now'))`,
      [
        listingId, sellerId, category_id, title_fr, fullDescription,
        price || null, currency || 'DZD', wilaya_id,
        condition || null, brand || null, year || null,
        is_premium ? 1 : 0, is_boosted ? 1 : 0, is_carousel ? 1 : 0, req.user.id
      ]
    );
    await db.run('COMMIT');

    res.status(201).json({
      id: listingId,
      title_fr,
      status: 'active',
      message: 'Annonce créée et publiée avec succès.'
    });
  } catch (err) {
    await db.run('ROLLBACK').catch(() => {});
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ── STATS DASHBOARD ──────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const [listings, users, pending, revenue] = await Promise.all([
      db.query("SELECT COUNT(*) AS count FROM listings WHERE status='active'"),
      db.query('SELECT COUNT(*) AS count FROM users'),
      db.query("SELECT COUNT(*) AS count FROM listings WHERE status='pending'"),
      db.query("SELECT COALESCE(SUM(amount),0) AS total FROM subscription_orders WHERE payment_status='validated'"),
    ]);
    res.json({
      active_listings:  parseInt(listings.rows[0].count),
      total_users:      parseInt(users.rows[0].count),
      pending_listings: parseInt(pending.rows[0].count),
      total_revenue:    parseFloat(revenue.rows[0].total),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

module.exports = router;
