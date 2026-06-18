/**
 * Migrations de colonnes idempotentes.
 *
 * SQLite ne supporte pas "ADD COLUMN IF NOT EXISTS", donc on inspecte d'abord
 * le schéma via PRAGMA table_info puis on ajoute les colonnes manquantes. Sûr à
 * exécuter à chaque démarrage : met à niveau les bases existantes (volume Docker)
 * sans toucher aux données.
 */

// table -> { colonne: "définition SQL" }
const REQUIRED = {
  users: {
    reset_token_hash:    'TEXT',
    reset_token_expires: 'TEXT',
  },
  listings: {
    publication_fee: 'REAL DEFAULT 0', // frais de publication facturés au client (0 = gratuit)
    activated_at:    'TEXT',           // date de passage en ligne (pending -> active)
  },
};

async function ensureColumns(query, run) {
  for (const [table, cols] of Object.entries(REQUIRED)) {
    const { rows } = await query(`PRAGMA table_info(${table})`);
    const existing = new Set(rows.map(r => r.name));
    for (const [col, def] of Object.entries(cols)) {
      if (!existing.has(col)) {
        await run(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`);
        console.log(`🛠️  Migration: colonne ${table}.${col} ajoutée`);
      }
    }
  }
}

module.exports = { ensureColumns };
