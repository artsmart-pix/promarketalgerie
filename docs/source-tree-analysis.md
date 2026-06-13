# Arborescence annotée — Pro Market Algérie

```
promarketalgerie/
├── backend/                      # API Node.js + Express (port 3001)
│   ├── server.js                 # ★ Point d'entrée : middlewares, routes, WebSocket
│   ├── config/
│   │   ├── database.js           # ★ Wrapper SQLite ACTIF (query/run promisifiés)
│   │   ├── database-sqlite.js    # variante (non importée par défaut)
│   │   ├── database-pg.js        # variante PostgreSQL (non active)
│   │   └── categories.js         # 13 rubriques + filtres + packs + boosts
│   ├── middleware/
│   │   ├── auth.js               # ★ authenticate + requireRole
│   │   └── upload.js             # Multer (images jpg/png/webp, 10 Mo)
│   ├── routes/                   # Un routeur par ressource
│   │   ├── auth.js  listings.js  media.js  messages.js
│   │   ├── favorites.js  alerts.js  subscriptions.js
│   │   ├── admin.js              # ★ Back-office (requireRole admin)
│   │   ├── advertisements.js  categories.js
│   │   └── exa-example.js        # ⚠ proxy Exa public (voir audit)
│   ├── services/exa.js           # Client Exa AI
│   ├── db/
│   │   ├── schema-sqlite.sql      # ★ Schéma + seed (wilayas, catégories)
│   │   ├── schema.sql            # Schéma PostgreSQL de référence
│   │   ├── init-sqlite.js        # ★ Init DB + création admin
│   │   └── reset-sqlite.js
│   ├── check-images.js           # utilitaire ponctuel
│   └── .env / .env.example       # ⚠ .env est suivi par git (voir audit S1)
│
├── frontend/                     # Site statique HTML/CSS/JS (port 3000)
│   ├── index.html                # ★ Accueil
│   ├── js/
│   │   ├── api.js                # ★ Client API + Auth + WebSocket
│   │   └── main.js               # ★ UI partagée, escapeHtml, i18n FR/AR
│   ├── css/  main.css  animations.css  rtl.css
│   ├── pages/                    # login, register, dashboard, create-listing,
│   │                             # listing-detail, category, subscriptions,
│   │                             # admin, admin-publish
│   └── assets/img/listings/      # images de démo
│
├── docs/                         # ★ Documentation BMAD (ce dossier)
├── Dockerfile / docker-compose.yml / docker-entrypoint.sh   # déploiement (non commité)
└── README.md
```

★ = fichier critique / point d'entrée. ⚠ = point d'attention sécurité (voir `audit-report.md`).
