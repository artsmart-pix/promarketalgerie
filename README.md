# Pro Market Algérie — Marketplace B2B

> **Achetez, vendez, entreprenez plus facilement. Équipez votre succès.**

Marketplace B2B spécialisée dans la vente d'équipements professionnels, matériels BTP et fonds de commerce en Algérie.

---

## Structure du projet

```
ARTOFDOIND/
├── backend/               Node.js + Express REST API
│   ├── server.js          Point d'entrée + WebSocket
│   ├── config/
│   │   ├── database.js    Connexion SQLite
│   │   └── categories.js  10 rubriques + filtres + packs
│   ├── middleware/
│   │   ├── auth.js        JWT authentication
│   │   └── upload.js      Multer file upload
│   ├── routes/
│   │   ├── auth.js        Inscription / Connexion / Profil
│   │   ├── listings.js    CRUD annonces + recherche à facettes
│   │   ├── categories.js  Rubriques + Wilayas
│   │   ├── media.js       Upload images (WebP auto)
│   │   ├── messages.js    Messagerie interne
│   │   ├── favorites.js   Favoris
│   │   ├── alerts.js      Alertes de recherche
│   │   ├── subscriptions.js Packs + Boosts
│   │   └── admin.js       Back-office modération
│   └── db/
│       ├── schema.sql     Schéma PostgreSQL de référence
│       ├── schema-sqlite.sql Schéma SQLite actuel
│       └── init-sqlite.js Script d'initialisation
│
└── frontend/              HTML + CSS + JS Vanilla
    ├── index.html         Page d'accueil
    ├── css/
    │   ├── main.css       Charte graphique complète
    │   └── rtl.css        Support arabe RTL
    ├── js/
    │   ├── api.js         Client API centralisé
    │   └── main.js        Utilitaires + Header/Footer
    └── pages/
        ├── login.html
        ├── register.html
        ├── category.html       Recherche à facettes
        ├── listing-detail.html Fiche annonce + contact sticky
        ├── create-listing.html Dépôt d'annonce (wizard 4 étapes)
        ├── dashboard.html      Espace utilisateur
        ├── subscriptions.html  Packs & Boosts
        └── admin.html          Back-office administrateur
```

---

## Installation rapide

### 1. Prérequis
- Node.js 18+
- SQLite (embarqué, aucune installation séparée requise)

### 2. Backend

```bash
cd backend
cp .env.example .env          # Remplir vos valeurs JWT, etc.
npm install
node db/init-sqlite.js        # Créer la BDD SQLite + schéma
npm run dev                   # API sur http://localhost:3001
```

### 3. Frontend

```bash
# Ouvrir avec un serveur statique local :
npx serve frontend -p 3000
# ou avec VS Code Live Server (port 5500)
```

Accéder à : http://localhost:3000

---

## API — Endpoints principaux

| Méthode | Route                        | Description                       |
|---------|------------------------------|-----------------------------------|
| POST    | /api/auth/register           | Inscription                       |
| POST    | /api/auth/login              | Connexion → JWT                   |
| GET     | /api/categories              | 10 rubriques                      |
| GET     | /api/listings?q=&category=   | Recherche à facettes              |
| GET     | /api/listings/:id            | Détail annonce                    |
| POST    | /api/listings                | Créer annonce (auth)              |
| POST    | /api/listings/:id/reveal-phone | Révéler téléphone (anti-scraping)|
| POST    | /api/media/listings/:id      | Upload photos (WebP auto)         |
| GET     | /api/favorites               | Mes favoris                       |
| POST    | /api/messages/start          | Démarrer une conversation         |
| POST    | /api/subscriptions/order     | Commander un pack                 |
| GET     | /api/admin/listings/pending  | Annonces en attente (admin)       |
| PATCH   | /api/admin/listings/:id/approve | Valider une annonce (admin)    |

---

## Identité visuelle

| Couleur | Usage |
|---------|-------|
| `#f26522` Orange | CTA, badges Premium, boutons de conversion |
| `#1b75bb` Bleu   | En-têtes, liens, éléments de confiance |
| `#2b2b2b` Noir   | Textes d'autorité, header |

---

## Fonctionnalités clés

- **10 rubriques** avec filtres techniques dynamiques par catégorie
- **Recherche à facettes** : texte + wilaya + prix + état + attributs techniques
- **Contact haute conversion** : Appel / WhatsApp / Messagerie interne
- **Téléphone masqué** — révélé uniquement sur clic (anti-scraping)
- **Upload WebP** automatique avec compression côté serveur
- **Interface bilingue** FR / AR avec basculement RTL
- **Packs abonnements** : Starter Pro, Business Pro, Élite
- **Boosts** : Top de liste, Badge Premium, Carrousel accueil
- **Back-office** : modération, certification vendeurs, validation paiements
- **WebSocket** : messagerie temps réel
- **58 wilayas algériennes** pré-chargées

---

## Compte admin par défaut

```
Email    : admin@promarketalgerie.com
Password : Admin@123!
```

**Changer ce mot de passe en production.**
