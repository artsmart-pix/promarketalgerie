/**
 * Pro Market Algérie — SQLite Database Initializer
 * Run: node db/init-sqlite.js
 */
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

const dbPath = process.env.SQLITE_PATH || path.join(__dirname, '..', 'database.sqlite');

// Supprimer l'ancienne DB si elle existe (pour réinitialiser)
// Commenter cette ligne si tu veux garder les données
// if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);

const db = new sqlite3.Database(dbPath);

async function init() {
  console.log('🔧 Initializing Pro Market Algérie SQLite database...\n');
  
  const sql = fs.readFileSync(path.join(__dirname, 'schema-sqlite.sql'), 'utf-8');
  
  // Exécuter le schéma
  await new Promise((resolve, reject) => {
    db.exec(sql, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
  
  console.log('✅  Schema created successfully.');

  // Vérifier si l'admin existe déjà
  const adminExists = await new Promise((resolve, reject) => {
    db.get('SELECT id FROM users WHERE email = ?', ['promarketalgerie@gmail.com'], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });

  const adminPass = 'Admin@123!';
  const hash = await bcrypt.hash(adminPass, 12);
  
  if (!adminExists) {
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO users (id, email, password_hash, full_name, role, is_active)
         VALUES (lower(hex(randomblob(16))), ?, ?, ?, 'admin', 1)`,
        ['promarketalgerie@gmail.com', hash, 'Administrateur'],
        function(err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });
    console.log('✅  Admin user created: promarketalgerie@gmail.com');
  } else {
    // Met à jour le mot de passe si l'admin existe déjà
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE users SET password_hash = ? WHERE email = ?',
        [hash, 'promarketalgerie@gmail.com'],
        function(err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });
    console.log('✅  Admin password updated: promarketalgerie@gmail.com');
  }
  console.log('   🔑 Password: ' + adminPass);

  console.log('\n🚀  Database ready. Run "npm run dev" to start the API.\n');
  db.close();
}

init().catch(err => {
  console.error('❌  Error:', err.message);
  process.exit(1);
});
