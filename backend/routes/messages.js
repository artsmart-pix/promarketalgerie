const express = require('express');
const crypto  = require('crypto');
const db      = require('../config/database');
const upload  = require('../middleware/upload');
const { authenticate } = require('../middleware/auth');
const { notifyUser } = require('../services/realtime');

const router = express.Router();

// ── GET /api/messages/conversations — list my conversations ──
router.get('/conversations', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT c.id, c.created_at,
              l.id AS listing_id, l.title_fr AS listing_title,
              (SELECT url FROM listing_media lm WHERE lm.listing_id = l.id AND lm.is_cover = 1 LIMIT 1) AS listing_image,
              buyer.full_name  AS buyer_name,
              seller.full_name AS seller_name,
              (SELECT body FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message,
              (SELECT created_at FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message_at,
              (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.is_read = 0 AND m.sender_id != ?) AS unread_count
       FROM conversations c
       JOIN listings l ON l.id = c.listing_id
       JOIN users buyer  ON buyer.id  = c.buyer_id
       JOIN users seller ON seller.id = c.seller_id
       WHERE c.buyer_id = ? OR c.seller_id = ?
       ORDER BY last_message_at DESC`,
      [req.user.id, req.user.id, req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ── GET /api/messages/conversations/:id — messages in a thread
router.get('/conversations/:id', authenticate, async (req, res) => {
  try {
    const convQ = await db.query(
      `SELECT c.*,
              buyer.full_name  AS buyer_name,
              seller.full_name AS seller_name
       FROM conversations c
       JOIN users buyer  ON buyer.id  = c.buyer_id
       JOIN users seller ON seller.id = c.seller_id
       WHERE c.id = ?`,
      [req.params.id]
    );
    if (!convQ.rows.length) return res.status(404).json({ error: 'Conversation introuvable.' });
    const conv = convQ.rows[0];
    if (conv.buyer_id !== req.user.id && conv.seller_id !== req.user.id) {
      return res.status(403).json({ error: 'Non autorisé.' });
    }

    await db.run(
      'UPDATE messages SET is_read = 1 WHERE conversation_id = ? AND sender_id != ?',
      [req.params.id, req.user.id]
    );

    const { rows } = await db.query(
      `SELECT m.*, u.full_name AS sender_name, u.logo_url AS sender_avatar
       FROM messages m JOIN users u ON u.id = m.sender_id
       WHERE m.conversation_id = ? ORDER BY m.created_at ASC`,
      [req.params.id]
    );
    res.json({ conversation: conv, messages: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ── POST /api/messages/start — start or get conversation ─────
router.post('/start', authenticate, async (req, res) => {
  const { listing_id, seller_id, initial_message } = req.body;
  if (!listing_id || !seller_id || !initial_message?.trim()) {
    return res.status(422).json({ error: 'listing_id, seller_id, et message requis.' });
  }
  if (seller_id === req.user.id) {
    return res.status(400).json({ error: 'Vous ne pouvez pas vous contacter vous-même.' });
  }
  try {
    const listingQ = await db.query('SELECT user_id FROM listings WHERE id = ?', [listing_id]);
    if (!listingQ.rows.length) return res.status(404).json({ error: 'Annonce introuvable.' });
    if (listingQ.rows[0].user_id !== seller_id) {
      return res.status(400).json({ error: 'Le vendeur ne correspond pas à cette annonce.' });
    }
    const conv = await db.query(
      'SELECT id FROM conversations WHERE listing_id=? AND buyer_id=? AND seller_id=?',
      [listing_id, req.user.id, seller_id]
    );
    let convId;
    if (conv.rows.length) {
      convId = conv.rows[0].id;
    } else {
      convId = crypto.randomUUID();
      await db.run(
        'INSERT INTO conversations (id, listing_id, buyer_id, seller_id) VALUES (?,?,?,?)',
        [convId, listing_id, req.user.id, seller_id]
      );
    }

    const msgId = crypto.randomUUID();
    await db.run(
      'INSERT INTO messages (id, conversation_id, sender_id, body) VALUES (?,?,?,?)',
      [msgId, convId, req.user.id, initial_message.trim()]
    );
    const { rows } = await db.query('SELECT * FROM messages WHERE id = ?', [msgId]);
    notifyUser(seller_id, { type: 'new_message', conversation_id: convId, sender_id: req.user.id });
    res.status(201).json({ conversation_id: convId, message: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ── POST /api/messages/conversations/:id/send — send message ─
router.post('/conversations/:id/send', authenticate, upload.single('attachment'), async (req, res) => {
  const { body: msgBody } = req.body;
  if (!msgBody?.trim() && !req.file) {
    return res.status(422).json({ error: 'Message ou pièce jointe requis.' });
  }
  try {
    const convQ = await db.query('SELECT * FROM conversations WHERE id = ?', [req.params.id]);
    if (!convQ.rows.length) return res.status(404).json({ error: 'Conversation introuvable.' });
    const conv = convQ.rows[0];
    if (conv.buyer_id !== req.user.id && conv.seller_id !== req.user.id) {
      return res.status(403).json({ error: 'Non autorisé.' });
    }

    let attachUrl = null, attachType = null;
    if (req.file) {
      attachUrl  = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
      attachType = req.file.mimetype;
    }

    const msgId = crypto.randomUUID();
    await db.run(
      `INSERT INTO messages (id, conversation_id, sender_id, body, attachment_url, attachment_type)
       VALUES (?,?,?,?,?,?)`,
      [msgId, req.params.id, req.user.id, msgBody?.trim() || null, attachUrl, attachType]
    );
    const { rows } = await db.query('SELECT * FROM messages WHERE id = ?', [msgId]);
    const recipientId = conv.buyer_id === req.user.id ? conv.seller_id : conv.buyer_id;
    notifyUser(recipientId, { type: 'new_message', conversation_id: req.params.id, sender_id: req.user.id });
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

module.exports = router;
