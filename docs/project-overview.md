# Vue d'ensemble — Pro Market Algérie

## Objet

Marketplace B2B spécialisée dans la vente d'équipements professionnels, matériel BTP et fonds de commerce en Algérie. Les vendeurs publient des annonces (modérées par un admin), les acheteurs recherchent par catégorie / wilaya / attributs techniques, contactent les vendeurs via une messagerie interne temps réel, et les vendeurs souscrivent à des packs et boosts payants (paiement hors-ligne validé manuellement).

## Stack technique

| Catégorie | Technologie | Version | Rôle |
|-----------|-------------|---------|------|
| Runtime | Node.js | 22.x (local) | Exécution backend |
| Framework API | Express | ^4.19 | Routage REST, middlewares |
| Base de données | SQLite3 | ^6.0 | Stockage (PostgreSQL en schéma de référence) |
| Auth | jsonwebtoken + bcryptjs | ^9 / ^2.4 | JWT (7j) + hash mots de passe (cost 12) |
| Upload | Multer + Sharp | ^1.4 / ^0.33 | Réception fichiers + conversion WebP/thumbnails |
| Temps réel | ws | ^8.18 | WebSocket messagerie |
| Sécurité | Helmet, express-rate-limit, express-validator | — | CSP/headers, throttling, validation |
| Email | nodemailer | ^6.9 | (configuré, non câblé aux flux) |
| Frontend | HTML/CSS/JS vanilla | — | MPA, support RTL arabe |

## Fonctionnalités principales

1. **Comptes & rôles** — `buyer`, `seller`, `admin` ; inscription/connexion JWT ; profil.
2. **Annonces** — CRUD, recherche à facettes (texte, catégorie, wilaya, prix, état, attributs techniques dynamiques `attr_*`), quotas par pack, modération admin (pending → active/rejected).
3. **Médias** — upload images (≤10), conversion WebP + thumbnails via Sharp, logo de profil.
4. **Messagerie** — conversations acheteur/vendeur liées à une annonce, messages persistés (REST) + diffusion temps réel (WebSocket).
5. **Monétisation** — packs (`free`, `starter_pro`, `business_pro`, `concessionnaire_elite`) et boosts ; commandes avec reçu, validées manuellement par l'admin.
6. **Back-office admin** — modération annonces, gestion utilisateurs (certification, bannissement, attribution pack), validation paiements, stats, publicités, création d'annonce pour le compte d'un client.
7. **Annexes** — favoris, alertes de recherche sauvegardées, révélation de téléphone (rate-limitée), publicités, recherche sémantique Exa (route exemple).

## Type de dépôt

Multi-part : deux applications dans un même dépôt (`backend/`, `frontend/`), sans monorepo tooling (pas de workspaces). Le backend peut aussi servir le frontend statique (fallback SPA).

## État du projet (2026-06-13)

« Presque terminé » — fonctionnellement complet, en phase d'ajustements et d'audit avant mise en production. Voir [audit-report.md](./audit-report.md) pour les points à corriger.
