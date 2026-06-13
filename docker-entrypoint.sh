#!/bin/sh
set -e

DATA_DIR="$(dirname "${SQLITE_PATH:-/data/database.sqlite}")"
mkdir -p "$DATA_DIR" "${UPLOAD_DIR:-/data/uploads}"

# ── Ensure a JWT secret ──────────────────────────────────────
# A fresh clone has no backend/.env (it is gitignored). To make
# `docker compose up` work out of the box AND stay secure, generate a
# random secret once and persist it on the data volume. For production,
# provide your own JWT_SECRET via backend/.env or the environment — it
# takes precedence and this block is skipped.
if [ -z "$JWT_SECRET" ]; then
  SECRET_FILE="$DATA_DIR/.jwt_secret"
  if [ ! -f "$SECRET_FILE" ]; then
    node -e "console.log(require('crypto').randomBytes(48).toString('hex'))" > "$SECRET_FILE"
    echo "🔐  Generated a persistent JWT secret at $SECRET_FILE (override with JWT_SECRET in production)."
  fi
  JWT_SECRET="$(cat "$SECRET_FILE")"
  export JWT_SECRET
fi

# ── Initialize the SQLite database on first boot only ────────
# init-sqlite.js is idempotent (CREATE TABLE IF NOT EXISTS) but we skip it
# when the DB already exists so a changed admin password is kept.
if [ ! -f "${SQLITE_PATH:-/data/database.sqlite}" ]; then
  echo "🔧  No database found — initializing SQLite schema + admin user..."
  node db/init-sqlite.js
else
  echo "✅  Existing database found at ${SQLITE_PATH:-/data/database.sqlite} — skipping init."
fi

exec "$@"
