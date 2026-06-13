# ─────────────────────────────────────────────────────────────
# Pro Market Algérie — Single-container image
# The Express backend (port 3001) serves BOTH the REST API and
# the static frontend (../frontend), so one image is enough.
# ─────────────────────────────────────────────────────────────

# ── Stage 1: build native modules (sqlite3, sharp) ───────────
FROM node:20-bookworm-slim AS builder

WORKDIR /app/backend

# Toolchain needed to compile native addons if no prebuilt binary
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 make g++ ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY backend/package.json backend/package-lock.json ./
# sqlite3's prebuilt binary targets a newer glibc than Debian bookworm,
# so recompile it from source against this image's glibc.
RUN npm ci --omit=dev \
    && npm rebuild sqlite3 --build-from-source

# ── Stage 2: lean runtime ────────────────────────────────────
FROM node:20-bookworm-slim AS runtime

ENV NODE_ENV=production \
    PORT=3001 \
    SQLITE_PATH=/data/database.sqlite \
    UPLOAD_DIR=/data/uploads

WORKDIR /app

# Pre-built dependencies
COPY --from=builder /app/backend/node_modules ./backend/node_modules

# Application code
COPY backend ./backend
COPY frontend ./frontend
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

# Persistent data dir (SQLite + uploads) owned by the runtime user
RUN chmod +x /usr/local/bin/docker-entrypoint.sh \
    && mkdir -p /data/uploads \
    && chown -R node:node /data /app

USER node
WORKDIR /app/backend

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.PORT||3001)+'/api/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "server.js"]
