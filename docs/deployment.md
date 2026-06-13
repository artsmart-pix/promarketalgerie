# Déploiement — Pro Market Algérie

Un seul conteneur Docker : le backend Express (port 3001) sert **à la fois** l'API REST et le frontend statique. La base SQLite et les uploads sont persistés sur un volume nommé (`pm_data`), jamais dans l'image.

## Déploiement rapide (VPS ou local)

```bash
git clone <repo> && cd promarketalgerie
docker compose up -d --build
# → http://<serveur>:3001
```

Sur un **clone neuf, sans configuration**, ça fonctionne d'emblée :
- `backend/.env` est absent (gitignored) → `env_file` est optionnel (`required: false`).
- L'entrypoint **génère un `JWT_SECRET` aléatoire** persisté sur le volume (`/data/.jwt_secret`) au premier démarrage.
- La base SQLite est initialisée au premier boot (schéma + compte admin), puis conservée.

Admin par défaut : `admin@promarketalgerie.com` / `Admin@123!` — **à changer immédiatement en production**.

## Configuration production (recommandée)

Créer `backend/.env` avant le premier `up` (copie de `backend/.env.example`) et définir au minimum :

```ini
NODE_ENV=production
JWT_SECRET=<48+ octets aléatoires>      # node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
FRONTEND_URL=https://votre-domaine.tld  # voir CORS ci-dessous
# SMTP_* si emails, AWS_* si stockage S3, EXA_API_KEY si recherche Exa
```

Un `JWT_SECRET` fourni ici **prime** sur celui généré par l'entrypoint.

## Reverse proxy (nginx) + HTTPS

L'app fait confiance au premier hop (`app.set('trust proxy', 1)`) pour un rate-limiting correct. Exemple nginx :

```nginx
server {
  server_name votre-domaine.tld;
  location / {
    proxy_pass http://127.0.0.1:3001;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    # WebSocket (messagerie temps réel)
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
```
Ajouter TLS via certbot. Si plusieurs proxys en amont, ajuster le nombre de hops du `trust proxy`.

## CORS

Le CORS est **fail-closed** : seules les origines en liste blanche passent. L'API et le frontend étant servis sur la **même origine** (port 3001), le navigateur n'émet pas de requête cross-origin → rien à configurer dans le cas standard. Si le frontend est servi depuis un **domaine différent** de l'API, renseigner `FRONTEND_URL` (liste séparée par virgules) avec ce(s) domaine(s).

## Exploitation

```bash
docker compose logs -f app          # logs
docker compose ps                   # état + healthcheck
docker compose up -d --build        # redéployer après un git pull
docker compose down                 # arrêter (le volume pm_data est conservé)
docker volume rm promarketalgerie_pm_data   # ⚠ efface DB + uploads
```

Le healthcheck interroge `GET /api/health` (statut `healthy` quand l'API + la DB répondent).

## Sauvegarde

Tout l'état vit dans le volume `pm_data` (`/data` : `database.sqlite`, `uploads/`, `.jwt_secret`). Sauvegarder ce volume suffit.
