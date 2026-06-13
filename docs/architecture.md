# Architecture — Pro Market Algérie

## 1. Backend (`backend/`)

### Pattern
Pipeline de middlewares Express avec routeurs modulaires par ressource. Couche d'accès données minimaliste (`config/database.js`) qui promisifie l'API callback de `sqlite3` en exposant `query()` (SELECT → `{rows}`) et `run()` (INSERT/UPDATE/DELETE → `{lastID, changes}`).

### Bootstrap (`server.js`)
1. Helmet (CSP personnalisée, frameguard deny, cross-origin resource policy).
2. Forçage `Content-Type: application/json; charset=utf-8` sur `/api` (UTF-8 arabe).
3. CORS basé sur `FRONTEND_URL` (liste blanche d'origines ; permissif hors production).
4. `express.json({ limit: '5mb' })` + urlencoded.
5. Rate-limit global sur `/api` (`RATE_LIMIT_MAX`, fenêtre `RATE_LIMIT_WINDOW_MS`).
6. Statique : `/uploads` (médias) + `frontend/` (site).
7. Montage des routeurs `/api/*`.
8. Health check `/api/health`.
9. Serveur HTTP partagé + serveur WebSocket sur `/ws`.
10. Fallback SPA (sert `index.html` pour les routes non-API) + handler d'erreurs.

### Routeurs (`routes/`)
| Routeur | Préfixe | Auth |
|---------|---------|------|
| auth | `/api/auth` | mixte |
| categories | `/api/categories` | public |
| listings | `/api/listings` | mixte (lecture publique, écriture authentifiée) |
| media | `/api/media` | authentifié |
| messages | `/api/messages` | authentifié |
| favorites | `/api/favorites` | authentifié |
| alerts | `/api/alerts` | authentifié |
| subscriptions | `/api/subscriptions` | mixte |
| admin | `/api/admin` | `authenticate + requireRole('admin')` (au niveau du routeur) |
| advertisements | `/api/advertisements` | mixte (lecture publique, gestion admin) |
| exa | `/api/exa` | **public** (route exemple — voir audit) |

### Middlewares (`middleware/`)
- **`auth.js`** — `authenticate` : vérifie `Authorization: Bearer`, décode le JWT, recharge l'utilisateur (id, email, role, pack, is_active) à chaque requête et rejette les comptes désactivés. `requireRole(...roles)` : contrôle d'autorisation par rôle.
- **`upload.js`** — Multer disque, noms aléatoires, filtre extension+MIME (jpg/png/webp), limite `MAX_FILE_SIZE` (10 Mo).

### Configuration base de données
- `config/database.js` → wrapper SQLite **actif** (importé partout).
- `config/database-sqlite.js`, `config/database-pg.js` → variantes/alternatives.
- `db/schema-sqlite.sql` → schéma + seed wilayas/catégories. `db/init-sqlite.js` → init + création admin.

## 2. Frontend (`frontend/`)

### Pattern
Multi-page application statique. Chaque page HTML embarque un `<script>` inline qui consomme les clients API exposés globalement par `js/api.js`. `js/main.js` fournit l'UI partagée (header, toasts, skeletons, rendu des cartes d'annonces, i18n FR/AR, helper `escapeHtml`).

### Modules JS
- **`js/api.js`** — `API_BASE` auto-détecté ; objet `Auth` (token/user en `localStorage` sous `pm_token`/`pm_user`) ; `apiFetch`/`apiFormData` (timeout 10s, auto-logout sur 401) ; clients par ressource (`AuthAPI`, `ListingsAPI`, `MediaAPI`, `MessagesAPI`, `AdminAPI`, …) ; client WebSocket avec reconnexion.
- **`js/main.js`** — bootstrap header/footer, toasts, gestion langue, rendu cartes (échappées), compteurs animés.

### Pages (`frontend/pages/`)
`login`, `register`, `dashboard`, `create-listing`, `listing-detail`, `category`, `subscriptions`, `admin`, `admin-publish`.

### Styles
`css/main.css` (charte), `css/animations.css`, `css/rtl.css` (arabe RTL).

## 3. Intégration frontend ↔ backend

| De | Vers | Type | Détails |
|----|------|------|---------|
| frontend | backend | REST/JSON | Toutes les ressources via `API_BASE` (`/api` si servi par :3001, sinon `http://localhost:3001/api`) |
| frontend | backend | WebSocket | `/ws?token=<JWT>` — diffusion temps réel des messages |
| frontend | backend | Statique | `/uploads/*` (images WebP) servies par Express |

**Auth :** JWT stocké en `localStorage`, envoyé en header `Authorization: Bearer` par `fetch` (jamais en cookie → pas de CSRF, mais exposition XSS du token). Le WebSocket transporte le token en query string.

**Flux de modération :** création annonce → `status = 'pending'` → admin approuve/rejette → `active`/`rejected`. Toute édition vendeur repasse l'annonce en `pending`.

**Flux de paiement :** commande pack/boost → reçu uploadé → `payment_status = 'pending'` → admin valide → pack appliqué (`pack_expires = now + N jours`).
