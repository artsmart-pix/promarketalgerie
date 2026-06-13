const multer = require('multer');
const path   = require('path');
const fs     = require('fs');

// Dedicated uploader for payment receipts: accepts images AND PDF (CCP/CIB
// receipts are very often PDF, which the image-only uploader rejected silently).
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename:    (req, file, cb) => {
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    cb(null, unique + path.extname(file.originalname).toLowerCase());
  },
});

const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const allowedExts  = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowedExts.includes(ext) || !allowedMimes.includes(file.mimetype)) {
    // Flag the rejection so the route can warn the user instead of failing mute.
    req.fileRejected = true;
    return cb(null, false);
  }
  cb(null, true);
};

module.exports = multer({
  storage,
  fileFilter,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 },
});
