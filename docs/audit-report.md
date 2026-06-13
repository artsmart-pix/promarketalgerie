# Rapport d'audit — Pro Market Algérie

> Audit réalisé le **2026-06-13** (BMAD + revue manuelle). Portée : sécurité, bugs/logique, qualité/perf, frontend/UX/a11y.
> Légende sévérité : 🔴 critique · 🟠 élevé · 🟡 moyen · ⚪ faible · ✅ positif

## Statut de remédiation (branche `audit/securite-ajustements`)

| Corrigé ✅ | Différé ⏳ (suite à donner) |
|-----------|------------------------------|
| S1 `.env` untrack + rotation secret | S5 `reveal-phone` / `phone_visible` |
| S2 CORS fail-closed | S7 (volets lourds) : retrait `script-src-attr 'unsafe-inline'` + JWT→cookie httpOnly |
| S3 WebSocket auth + temps réel fonctionnel | S8 admin par défaut (paramétrer pour prod) |
| S4 Exa admin-only, plus de fuite d'erreur | B1 transactions SQLite (mutex / better-sqlite3) |
| S6 `trust proxy` | Q1 tests automatisés · Q3 logger · Q4 FTS5 |
| S7 (partiel) CSP `imgSrc` resserré | F3 audit a11y/Lighthouse · F4 SEO · F2 cookie |
| B2 reçus PDF · B3 validation PUT · B4 quota | Q2 (Exa conservé, sécurisé) |
| B5 multi-sockets · Q5 pagination bornée · Q7 | |

Tous les correctifs ci-dessus ont été **vérifiés au runtime** (démarrage prod, CORS, auth, WebSocket handshake, validations, bornage) et passent eslint.

## Synthèse

Code propre, cohérent et déjà soucieux de sécurité (requêtes **paramétrées partout**, `escapeHtml` systématique au frontend, hash bcrypt cost 12, validation `express-validator`, permissions par rôle, IDOR vérifiées sur listings/media/messages). Les points à traiter avant production sont surtout **opérationnels/configuration** (secret commité, CORS fail-open, rate-limit derrière proxy) et quelques **durcissements** (WebSocket, route Exa, transactions SQLite).

| # | Sévérité | Domaine | Titre |
|---|----------|---------|-------|
| S1 | 🔴 | Sécurité | `.env` suivi par git avec `JWT_SECRET` réel |
| S2 | 🟠 | Sécurité | CORS « fail-open » hors production |
| S3 | 🟠 | Sécurité | WebSocket : expéditeur non vérifié, token optionnel |
| S4 | 🟠 | Sécurité | Routes `/api/exa/*` publiques (proxy API payante) |
| S5 | 🟡 | Sécurité | `reveal-phone` ignore `phone_visible` |
| S6 | 🟡 | Sécurité | Rate-limiting cassé derrière reverse proxy |
| S7 | 🟡 | Sécurité | CSP affaiblie + JWT en `localStorage` |
| S8 | ⚪ | Sécurité | Admin par défaut à mot de passe connu |
| B1 | 🟡 | Bug | Transactions SQLite sur connexion partagée (concurrence) |
| B2 | 🟡 | Bug | Reçus de paiement PDF rejetés silencieusement |
| B3 | ⚪ | Bug | `PUT /listings/:id` sans validation |
| B4 | ⚪ | Bug | Quota d'annonces compte les `rejected` |
| B5 | ⚪ | Bug | WebSocket : une seule socket par utilisateur |
| Q1–Q7 | 🟡/⚪ | Qualité/Perf | Tests, code mort, logger, FTS, pagination |
| F1–F5 | ✅/🟡 | Frontend | XSS maîtrisée ; a11y/SEO à auditer |

---

## Sécurité

### 🔴 S1 — `.env` suivi par git avec un `JWT_SECRET` réel
`backend/.env` est **tracké par git** (`git ls-files backend/.env`) bien qu'il figure dans `.gitignore` (ajouté avant le gitignore ou via `-f`). Il contient un `JWT_SECRET` de 128 hex réel. Toute personne avec accès au dépôt peut **forger des tokens admin** et usurper n'importe quel compte. Le dernier commit l'assume pour la démo, mais c'est bloquant pour la prod.
**Correctif :**
```bash
git rm --cached backend/.env
# régénérer le secret puis le mettre uniquement dans le .env local / secrets du déploiement
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```
Conserver seulement `backend/.env.example`. Faire tourner (rotate) le secret invalide tous les tokens existants — comportement souhaité ici.

### 🟠 S2 — CORS « fail-open » hors production
`backend/server.js:48-59` : si `NODE_ENV !== 'production'`, **toutes les origines** sont autorisées, y compris dans le callback (`|| process.env.NODE_ENV !== 'production'`). Si un déploiement oublie `NODE_ENV=production`, l'API est ouverte à tout site. **Correctif :** échouer fermé — n'autoriser que `allowedOrigins`, n'ajouter les origines de dev que via une variable explicite (`CORS_DEV=1`), et ne jamais court-circuiter sur l'absence de `NODE_ENV`.

### 🟠 S3 — WebSocket : expéditeur non vérifié, token optionnel
`backend/server.js:123-153` : la connexion est acceptée **même sans token** (`if (token) {…}` → `userId` reste `null` mais la socket reste ouverte). À la réception, tout message `{type:'new_message', recipient_id}` est **relayé tel quel** au destinataire, sans vérifier que l'émetteur est authentifié, que le `sender_id` est réel, ni qu'une conversation existe. → un client peut **injecter de faux messages temps réel** chez n'importe quel utilisateur connecté.
**Correctif :** rejeter les connexions sans token valide (`ws.close(1008)`), ne relayer que des charges utiles dérivées de l'identité serveur (`sender_id = userId` authentifié), et vérifier l'appartenance à la conversation avant diffusion.

### 🟠 S4 — Routes `/api/exa/*` publiques (proxy d'API payante)
`backend/routes/exa-example.js` : `POST /search`, `/search-with-contents`, `GET /example` sont **publics**, appellent l'API Exa avec la clé serveur, et renvoient `err.message` brut (fuite d'infos). Avec une clé configurée, c'est un **proxy ouvert** facturable. **Correctif :** au minimum `authenticate`, un rate-limit dédié, masquer les erreurs internes ; idéalement retirer ces routes d'exemple en production.

### 🟡 S5 — `reveal-phone` ignore `phone_visible`
`backend/routes/listings.js:312-332` renvoie le téléphone du vendeur **quelle que soit** la préférence `users.phone_visible`. **Correctif :** respecter `phone_visible` (404/refus si masqué) ou statuer explicitement que « révéler » est une action consentie.

### 🟡 S6 — Rate-limiting cassé derrière reverse proxy
`backend/server.js:72` (`validate: { trustProxy: false }`) et absence de `app.set('trust proxy', …)`. Derrière Docker/nginx, `req.ip` = IP du proxy → **tout le trafic dans un seul bucket** (rate-limit global ET `reveal-phone` par IP s'effondrent). **Correctif :** `app.set('trust proxy', 1)` et configurer le limiter pour lire `X-Forwarded-For` de confiance.

### 🟡 S7 — CSP affaiblie + JWT en `localStorage`
`backend/server.js:19-32` : `scriptSrcAttr: 'unsafe-inline'` (pour les `onclick=` inline) et `imgSrc: '*'`. Combiné au JWT stocké en `localStorage` (`frontend/js/api.js:19-25`), une éventuelle XSS permettrait le **vol de session**. Le contenu utilisateur étant bien échappé (voir F1), le risque résiduel est faible, mais **correctif recommandé :** migrer les handlers inline vers `addEventListener`, retirer `unsafe-inline`, restreindre `imgSrc`, et à terme déplacer le token vers un cookie `httpOnly; SameSite=Strict`.

### ⚪ S8 — Compte admin par défaut à mot de passe connu
`backend/db/init-sqlite.js:41` crée `admin@promarketalgerie.com` / `Admin@123!` (affiché en console, réécrit à chaque ré-exécution). Acceptable en démo, à **paramétrer/supprimer** pour la prod (mot de passe via env, ou création manuelle).

---

## Bugs / Logique

### 🟡 B1 — Transactions SQLite sur connexion unique partagée
`config/database.js` expose **une seule connexion** partagée. Les blocs `BEGIN TRANSACTION … COMMIT` (suppressions de `listings`, `admin/listings/create`) traversent des `await` : une requête concurrente peut **s'intercaler** dans la transaction (ou provoquer un COMMIT/ROLLBACK croisé), brisant l'atomicité. **Correctif :** sérialiser les transactions (file d'attente/mutex), ou utiliser une connexion dédiée par transaction, ou migrer vers `better-sqlite3` (synchrone, transactions sûres).

### 🟡 B2 — Reçus de paiement PDF rejetés silencieusement
`middleware/upload.js` n'accepte que jpg/png/webp. Or `subscriptions/order` (`receipt`) reçoit souvent des **PDF** (reçus CCP/CIB) : le filtre les rejette sans erreur, `receiptUrl` reste `null` → l'admin valide « à l'aveugle ». **Correctif :** filtre dédié autorisant `application/pdf` pour les reçus, et message si un fichier est refusé.

### ⚪ B3 — `PUT /listings/:id` sans validation
`routes/listings.js:223-255` ne valide pas le corps (contrairement à la création). `price`/`currency`/`condition` peuvent être incohérents. **Correctif :** appliquer les mêmes règles `express-validator` qu'en création.

### ⚪ B4 — Quota d'annonces compte les `rejected`
`routes/listings.js:184-191` : le quota par pack compte `status != 'expired'`, donc inclut les annonces **rejetées**, qui consomment indûment le quota. **Correctif :** exclure aussi `rejected` (et probablement `sold`) selon la règle métier voulue.

### ⚪ B5 — WebSocket : une seule socket par utilisateur
`backend/server.js:117` (`clients = Map userId→ws`) : une 2ᵉ session (onglet/appareil) **écrase** la précédente → plus de temps réel sur la 1ʳᵉ. **Correctif :** stocker un `Set` de sockets par utilisateur.

### Note défensive — `media.js` `req.files`
`routes/media.js:28` itère `req.files.length`. Avec `upload.array('images')`, Multer garantit un tableau (vide si rien), donc pas de crash actuellement ; ajouter néanmoins `if (!req.files?.length) return res.status(400)…` par robustesse.

---

## Qualité / Performance

- **Q1 — Aucun test automatisé.** Ajouter des tests d'intégration (auth, listings, permissions/IDOR, modération). Forte valeur avant prod.
- **Q2 — Code mort / variantes.** `config/database-pg.js`, `config/database-sqlite.js`, `db/init.js`, `check-images.js`, `routes/exa-example.js` + `services/exa.js` : clarifier ce qui est réellement utilisé et retirer le reste (réduction de surface).
- **Q3 — Logs.** `console.log/error` éparpillés, le handler d'erreurs logge l'objet `err` complet. Adopter un logger structuré (pino/winston) avec niveaux et redaction.
- **Q4 — Recherche `LIKE %q%`** (`routes/listings.js:28-31`) sans index plein-texte → scans coûteux à volume. Envisager **SQLite FTS5**.
- **Q5 — Pagination publique non bornée.** `routes/listings.js:20` accepte `limit` sans plafond (l'admin borne à 100, pas le public). Borner (ex. max 50).
- **Q6 — Sous-requêtes corrélées `cover_image`** dans les listes : OK à petite échelle, à surveiller (jointure dédiée si volume).
- **Q7 — `express.urlencoded`** inutile pour une API JSON — à retirer.

---

## Frontend / UX / Accessibilité / SEO

- **✅ F1 — XSS bien maîtrisée.** `escapeHtml` (`frontend/js/main.js:273`) est appliqué systématiquement au contenu utilisateur : cartes (`main.js`), détail (`listing-detail.html:191-201`, titre via `textContent`), messagerie et conversations (`dashboard.html:300,340,368`). `document.title = \`${l.title_fr}…\`` n'est pas échappé mais c'est du **texte pur** (pas de sink HTML) → sans danger.
- **🟡 F2 — JWT en `localStorage`** (cf. S7) : migrer vers cookie `httpOnly` recommandé.
- **🟡 F3 — Accessibilité à auditer.** Handlers `onclick` sur éléments non-`<button>`, présence d'`alt`, navigation clavier, focus visible, contrastes, labels de formulaires. Lancer un audit **Lighthouse/axe** (skills `accessibility` et `web-quality-audit` disponibles).
- **🟡 F4 — SEO.** MPA statique : vérifier `<meta description>`, Open Graph/Twitter cards, titres uniques par page, `robots.txt`/`sitemap.xml`, données structurées (`Product`/`Offer` pour les annonces).
- **⚪ F5 — Avatar initial.** `${(c.buyer_name||'?')[0]}` injecté en innerHTML (`dashboard.html`) : un seul caractère (risque négligeable), à uniformiser avec `escapeHtml` par cohérence.

---

## Plan de remédiation recommandé (ordre)

1. **Bloquants prod :** S1 (.env + rotation secret), S2 (CORS fail-closed), S6 (`trust proxy`).
2. **Durcissements :** S3 (WebSocket auth), S4 (Exa), S5 (phone_visible), S7 (CSP).
3. **Bugs métier :** B2 (reçus PDF), B1 (transactions), B4 (quota), B3, B5.
4. **Qualité :** Q5 (pagination), Q7, Q4 (FTS), Q2 (code mort), Q3 (logger), Q1 (tests).
5. **Frontend :** F3/F4 via audit Lighthouse, puis F2/S7.

> Chaque item ci-dessus peut être traité comme une *story* BMAD (`bmad-create-story` → `bmad-dev-story`) ou directement corrigé.
