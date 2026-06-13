/**
 * Test DB bootstrap. Creates a fresh SQLite database at process.env.SQLITE_PATH
 * (schema + a known admin user). MUST run before requiring the app, because
 * config/database.js opens the connection at import time.
 */
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

const ADMIN = { email: 'admin@test.local', password: 'Admin@123!' };

function setupTestDb(dbPath) {
  fs.rmSync(dbPath, { force: true });
  const schema = fs.readFileSync(path.join(__dirname, '..', 'db', 'schema-sqlite.sql'), 'utf-8');
  const db = new sqlite3.Database(dbPath);

  return new Promise((resolve, reject) => {
    db.exec(schema, async (err) => {
      if (err) return reject(err);
      try {
        const hash = await bcrypt.hash(ADMIN.password, 10);
        db.run(
          `INSERT INTO users (id, email, password_hash, full_name, role, is_active)
           VALUES (lower(hex(randomblob(16))), ?, ?, 'Admin Test', 'admin', 1)`,
          [ADMIN.email, hash],
          (e) => (e ? reject(e) : db.close(() => resolve(ADMIN)))
        );
      } catch (e) { reject(e); }
    });
  });
}

module.exports = { setupTestDb, ADMIN };
