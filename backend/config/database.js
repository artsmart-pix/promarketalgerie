const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = process.env.SQLITE_PATH || path.join(__dirname, '..', 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening SQLite database:', err);
  } else {
    console.log('✅ Connected to SQLite database');
  }
});

// Enable foreign keys (async)
run('PRAGMA foreign_keys = ON').catch(err => console.error('Failed to enable foreign keys:', err));
// Wait instead of failing immediately when the database is briefly locked.
run('PRAGMA busy_timeout = 5000').catch(() => {});
// Ensure the full-text search index exists and is in sync (idempotent). These
// statements queue on this connection before any request is served.
require('../db/fts').ensureFts(run).catch(err => console.error('FTS setup failed:', err.message));

// Promisify query method (returns all rows)
function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve({ rows });
    });
  });
}

// Promisify run method (for INSERT, UPDATE, DELETE)
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

// Serialized transactions. All app code shares a single sqlite3 connection, and
// a connection holds at most one transaction — so two requests issuing
// BEGIN/COMMIT concurrently would interleave (or throw "cannot start a
// transaction within a transaction"). This helper chains transactions so only
// one runs at a time: BEGIN → work() → COMMIT, with automatic ROLLBACK on error.
let txTail = Promise.resolve();
function transaction(work) {
  const exec = async () => {
    await run('BEGIN');
    try {
      const result = await work();
      await run('COMMIT');
      return result;
    } catch (err) {
      await run('ROLLBACK').catch(() => {});
      throw err;
    }
  };
  const p = txTail.then(exec, exec);
  // Keep the chain alive regardless of this transaction's outcome.
  txTail = p.then(() => {}, () => {});
  return p;
}

module.exports = {
  query,
  run,
  transaction,
  db,
  getClient: () => db
};
