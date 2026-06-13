/**
 * Full-text search for listings (SQLite FTS5).
 *
 * A standalone FTS5 table mirrors the searchable text columns of `listings`,
 * kept in sync by triggers. `id` is stored (UNINDEXED) so results map back to
 * listings by UUID. Diacritics are folded so "béton" matches "beton".
 *
 * ensureFts() is idempotent (IF NOT EXISTS + backfill), so it is safe to run on
 * every startup — it sets up fresh databases and migrates existing ones.
 */
const DDL = [
  `CREATE VIRTUAL TABLE IF NOT EXISTS listings_fts USING fts5(
     id UNINDEXED, title_fr, description_fr, title_ar, description_ar,
     tokenize = 'unicode61 remove_diacritics 1'
   )`,
  `CREATE TRIGGER IF NOT EXISTS listings_fts_ai AFTER INSERT ON listings BEGIN
     INSERT INTO listings_fts (id, title_fr, description_fr, title_ar, description_ar)
     VALUES (new.id, new.title_fr, new.description_fr, new.title_ar, new.description_ar);
   END`,
  `CREATE TRIGGER IF NOT EXISTS listings_fts_ad AFTER DELETE ON listings BEGIN
     DELETE FROM listings_fts WHERE id = old.id;
   END`,
  `CREATE TRIGGER IF NOT EXISTS listings_fts_au AFTER UPDATE ON listings BEGIN
     UPDATE listings_fts
        SET title_fr = new.title_fr, description_fr = new.description_fr,
            title_ar = new.title_ar, description_ar = new.description_ar
      WHERE id = old.id;
   END`,
  // Backfill any listing not yet indexed (existing databases).
  `INSERT INTO listings_fts (id, title_fr, description_fr, title_ar, description_ar)
     SELECT id, title_fr, description_fr, title_ar, description_ar FROM listings
      WHERE id NOT IN (SELECT id FROM listings_fts)`,
];

async function ensureFts(run) {
  for (const sql of DDL) await run(sql);
}

/**
 * Turn a free-text query into a safe FTS5 MATCH expression: keep letters/digits,
 * drop FTS5 operators, AND the terms together with prefix matching.
 * Returns null when there is nothing searchable.
 */
function buildFtsMatch(q) {
  const terms = String(q)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
  if (!terms.length) return null;
  return terms.map(t => `"${t}"*`).join(' ');
}

module.exports = { ensureFts, buildFtsMatch };
