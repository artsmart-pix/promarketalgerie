# Index de documentation — Pro Market Algérie

> Documentation générée via le workflow BMAD `document-project` le **2026-06-13**.
> Point d'entrée principal pour le développement assisté par IA et l'onboarding.

## Vue d'ensemble du projet

- **Type de dépôt :** multi-part (monorepo applicatif) — `backend/` + `frontend/`
- **Domaine :** marketplace B2B d'équipements professionnels, matériel BTP et fonds de commerce en Algérie
- **Langage principal :** JavaScript (Node.js côté serveur, Vanilla JS côté client)
- **Architecture :** API REST Express + base SQLite ; frontend statique HTML/CSS/JS multi-pages (MPA)

## Référence rapide par partie

### Backend (`backend/`) — `project_type: backend`
- **Stack :** Node.js, Express 4, SQLite3 (schéma PostgreSQL de référence disponible), JWT, bcryptjs, Multer, Sharp, ws (WebSocket), Helmet, express-rate-limit, express-validator
- **Point d'entrée :** `backend/server.js`
- **Pattern :** pipeline de middlewares Express + routeurs modulaires par ressource

### Frontend (`frontend/`) — `project_type: web`
- **Stack :** HTML5, CSS3 (vanilla, support RTL arabe), JavaScript ES modules-free (globals via `window`)
- **Point d'entrée :** `frontend/index.html` + `frontend/js/api.js` (client API) + `frontend/js/main.js` (UI partagée)
- **Pattern :** multi-page application, rendu côté client par templates littéraux (`escapeHtml` pour le contenu utilisateur)

## Documentation générée

- [Vue d'ensemble du projet](./project-overview.md)
- [Architecture (backend + frontend + intégration)](./architecture.md)
- [Modèle de données](./data-models.md)
- [Contrats d'API](./api-contracts.md)
- [Guide de développement & déploiement](./development-guide.md)
- [**Rapport d'audit (sécurité / bugs / qualité / frontend)**](./audit-report.md) ⚠️ priorité

## Documentation existante

- [README.md](../README.md) — présentation, structure, démarrage
- [frontend/ANIMATIONS.md](../frontend/ANIMATIONS.md) — conventions d'animation CSS

## Démarrage rapide

```bash
# Backend
cd backend && npm install && npm run db:init && npm run dev   # http://localhost:3001

# Frontend (servi aussi par le backend sur :3001, ou en statique)
cd frontend && npm run dev                                    # http://localhost:3000
```

Admin de démo (après `db:init`) : `admin@promarketalgerie.com` / `Admin@123!` — **à changer avant prod**.
