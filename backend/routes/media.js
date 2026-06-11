const express = require('express');
const crypto  = require('crypto');
const path    = require('path');
const sharp   = require('sharp');
const fs      = require('fs');
const db      = require('../config/database');
const upload  = require('../middleware/upload');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// ── POST /api/media/listings/:id — upload images ─────────────
router.post('/listings/:id', authenticate, upload.array('images', 10), async (req, res) => {
  try {
    const listingId = req.params.id;

    const check = await db.query('SELECT user_id FROM listings WHERE id = ?', [listingId]);
    if (!check.rows.length) return res.status(404).json({ error: 'Annonce introuvable.' });
    if (check.rows[0].user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Non autorisé.' });
    }

    const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
    if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

    const saved = [];

    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      const thumbName = `thumb_${file.filename}`;
      const thumbPath = path.join(UPLOAD_DIR, thumbName);
      const webpName  = file.filename.replace(/\.[^.]+$/, '.webp');
      const webpPath  = path.join(UPLOAD_DIR, webpName);

      try {
        await sharp(file.path)
          .resize({ width: 1200, withoutEnlargement: true })
          .webp({ quality: 82 })
          .toFile(webpPath);

        await sharp(file.path)
          .resize(400, 300, { fit: 'cover' })
          .webp({ quality: 70 })
          .toFile(thumbPath);

        fs.unlink(file.path, () => {});

        const baseUrl = `${req.protocol}://${req.get('host')}/uploads`;
        const mediaId = crypto.randomUUID();
        const iscover = i === 0 ? 1 : 0;
        await db.run(
          'INSERT INTO listing_media (id, listing_id, url, url_thumb, sort_order, is_cover) VALUES (?,?,?,?,?,?)',
          [mediaId, listingId, `${baseUrl}/${webpName}`, `${baseUrl}/${thumbName}`, i, iscover]
        );
        const { rows } = await db.query(
          'SELECT id, url, url_thumb, sort_order, is_cover FROM listing_media WHERE id = ?',
          [mediaId]
        );
        if (rows.length) saved.push(rows[0]);
      } catch (err) {
        console.error('Image processing error:', err);
      }
    }

    res.json({ uploaded: saved.length, media: saved });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ── DELETE /api/media/:mediaId — remove image ────────────────
router.delete('/:mediaId', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT lm.*, l.user_id FROM listing_media lm JOIN listings l ON l.id = lm.listing_id
       WHERE lm.id = ?`,
      [req.params.mediaId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Image introuvable.' });
    if (rows[0].user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Non autorisé.' });
    }
    // Delete files from disk
    const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
    try {
      const urlPath = rows[0].url ? path.basename(rows[0].url.split('?')[0]) : null;
      const thumbPath = rows[0].url_thumb ? path.basename(rows[0].url_thumb.split('?')[0]) : null;
      if (urlPath) fs.unlink(path.join(UPLOAD_DIR, urlPath), () => {});
      if (thumbPath) fs.unlink(path.join(UPLOAD_DIR, thumbPath), () => {});
    } catch (fileErr) {
      console.error('Failed to delete media files:', fileErr.message);
    }

    await db.run('DELETE FROM listing_media WHERE id = ?', [req.params.mediaId]);
    res.json({ message: 'Image supprimée.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ── POST /api/media/profile — upload user logo ───────────────
router.post('/profile', authenticate, upload.single('logo'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Aucun fichier reçu.' });
  const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

  const webpName = req.file.filename.replace(/\.[^.]+$/, '.webp');
  const webpPath = path.join(UPLOAD_DIR, webpName);
  try {
    await sharp(req.file.path).resize(300, 300, { fit: 'cover' }).webp({ quality: 80 }).toFile(webpPath);
    fs.unlink(req.file.path, () => {});
    const logoUrl = `${req.protocol}://${req.get('host')}/uploads/${webpName}`;
    await db.run("UPDATE users SET logo_url = ?, updated_at = datetime('now') WHERE id = ?", [logoUrl, req.user.id]);
    res.json({ logo_url: logoUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur traitement image.' });
  }
});

module.exports = router;
