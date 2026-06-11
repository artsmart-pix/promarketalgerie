const express = require('express');
const crypto  = require('crypto');
const db      = require('../config/database');
const upload  = require('../middleware/upload');
const { authenticate } = require('../middleware/auth');
const { SUBSCRIPTION_PACKS, BOOST_TYPES } = require('../config/categories');

const router = express.Router();

// GET /api/subscriptions/packs — available plans
router.get('/packs', (req, res) => {
  res.json(SUBSCRIPTION_PACKS);
});

// GET /api/subscriptions/boosts — available boost options
router.get('/boosts', (req, res) => {
  res.json(BOOST_TYPES);
});

// POST /api/subscriptions/order — submit subscription order
router.post('/order', authenticate, upload.single('receipt'), async (req, res) => {
  const { pack, payment_method, notes } = req.body;
  const validPacks = Object.keys(SUBSCRIPTION_PACKS).filter(p => p !== 'free');
  if (!validPacks.includes(pack)) {
    return res.status(422).json({ error: 'Pack invalide.' });
  }
  const validMethods = ['ccp', 'cib', 'edahabia', 'cash'];
  if (payment_method && !validMethods.includes(payment_method)) {
    return res.status(422).json({ error: 'Méthode de paiement invalide.' });
  }
  const packInfo = SUBSCRIPTION_PACKS[pack];
  try {
    let receiptUrl = null;
    if (req.file) {
      receiptUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    }
    const orderId = crypto.randomUUID();
    await db.run(
      `INSERT INTO subscription_orders (id, user_id, pack, amount, currency, payment_method, receipt_url, notes)
       VALUES (?,?,?,?,'DZD',?,?,?)`,
      [orderId, req.user.id, pack, packInfo.price_dzd, payment_method || null, receiptUrl, notes || null]
    );
    const { rows } = await db.query(
      'SELECT id, pack, payment_status, created_at FROM subscription_orders WHERE id = ?',
      [orderId]
    );
    res.status(201).json({
      ...rows[0],
      message: 'Commande soumise. Elle sera activée après validation du paiement par notre équipe.',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// POST /api/subscriptions/boost — request a boost for a listing
router.post('/boost', authenticate, async (req, res) => {
  const { listing_id, boost_type } = req.body;
  if (!BOOST_TYPES[boost_type]) return res.status(422).json({ error: 'Type de boost invalide.' });

  const boost = BOOST_TYPES[boost_type];
  try {
    const listingQ = await db.query('SELECT user_id FROM listings WHERE id = ?', [listing_id]);
    if (!listingQ.rows.length) return res.status(404).json({ error: 'Annonce introuvable.' });
    if (listingQ.rows[0].user_id !== req.user.id) return res.status(403).json({ error: 'Non autorisé.' });

    const boostId = crypto.randomUUID();
    await db.run(
      `INSERT INTO boost_orders (id, listing_id, user_id, boost_type, duration_days, amount, payment_status)
       VALUES (?,?,?,?,?,?,'pending')`,
      [boostId, listing_id, req.user.id, boost_type, boost.duration_days, boost.price_dzd]
    );
    const { rows } = await db.query(
      'SELECT id, boost_type, amount FROM boost_orders WHERE id = ?',
      [boostId]
    );
    res.status(201).json({
      ...rows[0],
      message: 'Boost commandé. Il sera activé après validation du paiement.',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// GET /api/subscriptions/my-orders — my orders history
router.get('/my-orders', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM subscription_orders WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

module.exports = router;
