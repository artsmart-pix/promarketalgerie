const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(__dirname, 'database.sqlite');
if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);

const db = new sqlite3.Database(dbPath);

async function init() {
  const sql = fs.readFileSync(path.join(__dirname, 'schema-sqlite.sql'), 'utf8');
  await new Promise((resolve, reject) => {
    db.exec(sql, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
  console.log('Base de donnees SQLite initialisee avec encodage UTF-8');
  db.close();
}

init().catch(err => {
  console.error('Erreur:', err.message);
  process.exit(1);
});
