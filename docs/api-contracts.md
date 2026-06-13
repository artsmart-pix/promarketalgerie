# Contrats d'API — Pro Market Algérie

Base : `/api`. Auth : header `Authorization: Bearer <JWT>`. Réponses JSON UTF-8. Validation via `express-validator` (422 sur échec).

## Auth (`/api/auth`)
| Méthode | Chemin | Auth | Description |
|---------|--------|------|-------------|
| POST | `/register` | public | email, password(≥8), full_name, [phone, account_type, company_name, wilaya_id] → `{user, token}` |
| POST | `/login` | public | email, password → `{user, token}` |
| GET | `/me` | user | profil courant |
| PUT | `/profile` | user | maj champs profil |

## Listings (`/api/listings`)
| Méthode | Chemin | Auth | Description |
|---------|--------|------|-------------|
| GET | `/` | public | recherche à facettes : `q, category, wilaya, min_price, max_price, currency, condition, is_boosted, attr_*, sort, page, limit` → `{data, pagination}` |
| GET | `/carousel` | public | 8 annonces premium aléatoires |
| GET | `/user/mine` | user | mes annonces |
| GET | `/:id` | public | détail (incr. view_count) |
| POST | `/` | user | création (quota selon pack) → status pending |
| PUT | `/:id` | propriétaire/admin | édition → repasse en pending |
| DELETE | `/:id` | propriétaire/admin | suppression + médias (transaction) |
| POST | `/:id/reveal-phone` | **public** (rate-limit 5/h/IP) | renvoie le téléphone du vendeur |

## Media (`/api/media`)
| POST | `/listings/:id` | propriétaire/admin | upload ≤10 images (WebP+thumb) |
| DELETE | `/:mediaId` | propriétaire/admin | supprime une image |
| POST | `/profile` | user | upload logo |

## Messages (`/api/messages`)
| GET | `/conversations` | user | mes conversations |
| GET | `/conversations/:id` | participant | messages d'un fil (marque lus) |
| POST | `/start` | user | démarre/récupère une conversation |
| POST | `/conversations/:id/send` | participant | envoie un message (+ pièce jointe image) |

## Favorites (`/api/favorites`)
GET `/` · POST `/:listingId` · DELETE `/:listingId` · GET `/check/:listingId` — tous authentifiés.

## Alerts (`/api/alerts`)
GET `/` · POST `/` · DELETE `/:id` · PATCH `/:id/toggle` — tous authentifiés.

## Subscriptions (`/api/subscriptions`)
GET `/packs` (public) · GET `/boosts` (public) · POST `/order` (user, +reçu) · POST `/boost` (user) · GET `/my-orders` (user).

## Advertisements (`/api/advertisements`)
GET `/` (public) · POST `/:id/click` (public) · GET `/admin` + POST `/` + PUT `/:id` + DELETE `/:id` + PATCH `/:id/toggle` (admin).

## Admin (`/api/admin`) — tout le routeur exige `admin`
- Modération : GET `/listings/pending`, PATCH `/listings/:id/approve|reject|boost`, DELETE `/listings/:id`.
- Utilisateurs : GET `/users`, PATCH `/users/:id/certify|toggle-active|set-pack`.
- Commandes : GET `/orders`, PATCH `/orders/:id/validate`.
- Publication déléguée : POST `/listings/create` (crée/réutilise un vendeur via téléphone).
- Stats : GET `/stats`.

## Exa (`/api/exa`) — ⚠️ public, voir audit
POST `/search`, POST `/search-with-contents`, GET `/example` — proxy vers l'API Exa (clé serveur).

## Health
GET `/api/health` → `{status, db}`.

## WebSocket
`ws://<host>/ws?token=<JWT>` — message `{type:'new_message', recipient_id, ...}` relayé au destinataire connecté.
