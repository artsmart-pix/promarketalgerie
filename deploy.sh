#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# Pro Market Algérie — déploiement VPS (Rocky Linux 10 + Docker)
#
# Usage habituel sur le VPS :
#     git pull          # récupère les derniers correctifs depuis GitHub
#     ./deploy.sh       # (re)construit et redémarre l'application
#
# Le script :
#   • sauvegarde / restaure backend/.env (secrets) hors du dépôt, pour
#     que la suppression ultérieure du .env sur GitHub ne casse rien ;
#   • ouvre les ports 80/443 dans firewalld si possible ;
#   • (re)build l'image et relance app + Caddy via docker-compose.prod.yml ;
#   • nettoie les anciennes images et attend que l'app soit "healthy".
#
# Tout est automatique : aucune configuration manuelle requise.
# ─────────────────────────────────────────────────────────────
set -euo pipefail

# Toujours s'exécuter depuis la racine du dépôt (dossier de ce script).
cd "$(dirname "$0")"

COMPOSE_FILE="docker-compose.prod.yml"
DOMAIN="promarketalgerie.com"
ENV_FILE="backend/.env"
ENV_BACKUP="${HOME}/.promarket-algerie.env"   # copie de secours, hors dépôt

bold()  { printf '\033[1m%s\033[0m\n' "$*"; }
info()  { printf '\033[36m›\033[0m %s\n' "$*"; }
ok()    { printf '\033[32m✓\033[0m %s\n' "$*"; }
warn()  { printf '\033[33m!\033[0m %s\n' "$*"; }

bold "▶  Déploiement de Pro Market Algérie ($DOMAIN)"

# ── 0. Outils requis ─────────────────────────────────────────
if ! command -v docker >/dev/null 2>&1; then
  echo "Docker n'est pas installé ou pas dans le PATH." >&2
  exit 1
fi
# Compose v2 (`docker compose`) de préférence, sinon le binaire v1.
if docker compose version >/dev/null 2>&1; then
  DC=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  DC=(docker-compose)
else
  echo "Ni 'docker compose' (v2) ni 'docker-compose' (v1) ne sont disponibles." >&2
  exit 1
fi

# ── 1. Secrets : sauvegarde / restauration de backend/.env ───
# Au 1er déploiement (après `git clone`), le .env vient du dépôt : on en
# garde une copie hors dépôt. Plus tard, quand tu auras supprimé le .env de
# GitHub, un `git pull` l'effacera localement → on le restaure depuis la copie.
if [ -f "$ENV_FILE" ]; then
  cp -f "$ENV_FILE" "$ENV_BACKUP"
  chmod 600 "$ENV_BACKUP"
  ok "Secrets backend/.env sauvegardés dans $ENV_BACKUP"
elif [ -f "$ENV_BACKUP" ]; then
  cp -f "$ENV_BACKUP" "$ENV_FILE"
  ok "Secrets backend/.env restaurés depuis $ENV_BACKUP"
else
  warn "Aucun backend/.env trouvé : un JWT_SECRET sera généré automatiquement,"
  warn "mais l'envoi d'emails (SMTP) restera désactivé tant qu'il manque."
fi

# ── 2. Pare-feu (firewalld) : ouvrir 80/443 (best-effort) ────
if command -v firewall-cmd >/dev/null 2>&1 && firewall-cmd --state >/dev/null 2>&1; then
  if [ "$(id -u)" -eq 0 ]; then FW=(firewall-cmd); else FW=(sudo -n firewall-cmd); fi
  if "${FW[@]}" --permanent --add-service=http  >/dev/null 2>&1 \
  && "${FW[@]}" --permanent --add-service=https >/dev/null 2>&1; then
    "${FW[@]}" --reload >/dev/null 2>&1 || true
    ok "Ports 80/443 ouverts dans firewalld"
  else
    warn "Impossible d'ouvrir 80/443 automatiquement. Lance, en root :"
    warn "  firewall-cmd --permanent --add-service={http,https} && firewall-cmd --reload"
  fi
fi

# ── 3. Build + (re)démarrage ─────────────────────────────────
info "Construction de l'image et démarrage des conteneurs…"
"${DC[@]}" -f "$COMPOSE_FILE" up -d --build

# ── 4. Nettoyage des images orphelines ───────────────────────
info "Nettoyage des anciennes images…"
docker image prune -f >/dev/null 2>&1 || true

# ── 5. Attente de l'état "healthy" de l'app ──────────────────
info "Vérification de la santé de l'application…"
HEALTHY=""
for _ in $(seq 1 30); do
  status="$(docker inspect -f '{{.State.Health.Status}}' promarket-algerie 2>/dev/null || echo unknown)"
  if [ "$status" = "healthy" ]; then HEALTHY=1; break; fi
  sleep 2
done

echo
"${DC[@]}" -f "$COMPOSE_FILE" ps
echo
if [ -n "$HEALTHY" ]; then
  ok "Application en ligne : https://$DOMAIN"
  info "Caddy obtient/renouvelle le certificat TLS automatiquement."
  info "(DNS A de $DOMAIN et www → IP du VPS, ports 80/443 ouverts requis.)"
else
  warn "L'app n'est pas encore 'healthy'. Derniers logs :"
  "${DC[@]}" -f "$COMPOSE_FILE" logs --tail=40 app || true
fi
