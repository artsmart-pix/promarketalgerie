# Guide de développement & déploiement — Pro Market Algérie

## Prérequis
- Node.js ≥ 18 (testé en 22.x), npm ≥ 10.

## Installation & lancement local

```bash
# Backend
cd backend
npm install
cp .env.example .env          # puis renseigner JWT_SECRET, SMTP, etc.
npm run db:init               # crée database.sqlite + seed + compte admin
npm run dev                   # nodemon, http://localhost:3001 (+ ws://localhost:3001/ws)

# Frontend (statique)
cd frontend
npm run dev                   # npx serve -l 3000  → http://localhost:3000
```
Le backend sert aussi le frontend : ouvrir directement `http://localhost:3001`.

## Scripts npm (backend)
| Script | Effet |
|--------|-------|
| `npm start` | `node server.js` |
| `npm run dev` | `nodemon server.js` |
| `npm run db:init` | initialise la base SQLite |
| `npm run db:reset` | réinitialise la base |

## Variables d'environnement clés (`backend/.env`)
`PORT`, `NODE_ENV`, `FRONTEND_URL` (origines CORS séparées par virgule), `JWT_SECRET`, `JWT_EXPIRES_IN`, `UPLOAD_DIR`, `MAX_FILE_SIZE`, `ALLOWED_MIME_TYPES`, `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX`, SMTP_*, AWS_* (optionnel), `EXA_API_KEY` (optionnel).

## Compte admin de démo
`admin@promarketalgerie.com` / `Admin@123!` (créé par `db:init`). **À supprimer/changer avant production.**

## Qualité
- Lint backend : `eslint.config.mjs` (flat config) — `npx eslint .`
- Pas de suite de tests automatisés à ce jour (voir audit : recommandation d'ajout).

## Déploiement (Docker — non commité)
`Dockerfile`, `docker-compose.yml`, `docker-entrypoint.sh`, `.dockerignore` présents à la racine. Le conteneur build le backend, initialise SQLite et expose l'API + le frontend statique.

> ⚠️ Avant tout déploiement, traiter les points de [audit-report.md](./audit-report.md), notamment : retrait du `.env` du suivi git + rotation du `JWT_SECRET`, durcissement CORS en production, `trust proxy` pour le rate-limiting derrière reverse proxy.
