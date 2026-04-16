#!/usr/bin/env bash
# Déploiement production : à lancer depuis VOTRE machine (là où SSH fonctionne).
#
# Usage :
#   chmod +x deploy/deploy-to-prod.sh
#   export DEPLOY_HOST=86.104.252.67
#   export SSH_PORT=22          # ou 166 si c’est votre port SSH
#   export DEPLOY_USER=root
#   export REMOTE_DIR=/opt/taj-platform
#   ./deploy/deploy-to-prod.sh
#
# Prérequis : rsync, ssh, sur le serveur : docker + plugin compose.
# Copiez deploy/env.prod.example vers deploy/env.prod et remplissez les secrets AVANT.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DEPLOY_HOST="${DEPLOY_HOST:?Définir DEPLOY_HOST (ex. 86.104.252.67)}"
SSH_PORT="${SSH_PORT:-22}"
DEPLOY_USER="${DEPLOY_USER:-root}"
REMOTE_DIR="${REMOTE_DIR:-/opt/taj-platform}"

# Mot de passe SSH (optionnel) : export SSHPASS='…' — préférez une clé SSH.
SSH=(ssh -p "$SSH_PORT" -o StrictHostKeyChecking=accept-new)
SCP=(scp -P "$SSH_PORT" -o StrictHostKeyChecking=accept-new)
if [[ -n "${SSHPASS:-}" ]] && command -v sshpass >/dev/null 2>&1; then
  SSH=(sshpass -e "${SSH[@]}")
  SCP=(sshpass -e "${SCP[@]}")
  RSYNC_SSH="sshpass -e ssh -p $SSH_PORT -o StrictHostKeyChecking=accept-new"
else
  RSYNC_SSH="ssh -p $SSH_PORT -o StrictHostKeyChecking=accept-new"
fi
RSYNC=(rsync -avz
  -e "$RSYNC_SSH"
  --exclude node_modules
  --exclude .git
  --exclude "**/.next"
  --exclude "**/dist"
  --exclude .turbo
  --exclude deploy/env.prod
  --exclude deploy/keys/gh-actions-deploy
  --exclude "*.log"
)

if [[ ! -f deploy/env.prod ]]; then
  echo "Erreur : créez deploy/env.prod à partir de deploy/env.prod.example"
  exit 1
fi

if [[ "${DEPLOY_SKIP_VERSION_BUMP:-}" != "1" ]]; then
  echo "→ Bump version (semver patch dans version.txt)"
  bash "$ROOT/scripts/bump-app-version.sh"
else
  echo "→ Bump version ignoré (DEPLOY_SKIP_VERSION_BUMP=1)"
fi
APP_VERSION=$(tr -d ' \r\n' <"$ROOT/version.txt")
echo "→ Version déployée : ${APP_VERSION}"

echo "→ Sync vers ${DEPLOY_USER}@${DEPLOY_HOST}:${REMOTE_DIR}"
"${RSYNC[@]}" ./ "${DEPLOY_USER}@${DEPLOY_HOST}:${REMOTE_DIR}/"

echo "→ Copie des secrets (env.prod)"
"${SCP[@]}" \
  deploy/env.prod "${DEPLOY_USER}@${DEPLOY_HOST}:${REMOTE_DIR}/deploy/env.prod"

NO_CACHE_FLAG="0"
if [[ "${DEPLOY_NO_CACHE:-}" == "1" ]]; then
  NO_CACHE_FLAG="1"
fi

echo "→ Build & up (Docker)"
"${SSH[@]}" "${DEPLOY_USER}@${DEPLOY_HOST}" bash -s \
  "$REMOTE_DIR" "$APP_VERSION" "$NO_CACHE_FLAG" <<'REMOTE_EOF'
set -euo pipefail
cd "$1"
export APP_VERSION="$2"
if [[ "$3" == "1" ]]; then
  docker compose -f docker-compose.prod.yml --env-file deploy/env.prod build --no-cache
else
  docker compose -f docker-compose.prod.yml --env-file deploy/env.prod build
fi
docker compose -f docker-compose.prod.yml --env-file deploy/env.prod up -d
docker compose -f docker-compose.prod.yml --env-file deploy/env.prod ps
REMOTE_EOF

echo "→ Terminé. Vérifiez : curl -sS http://taj.apps-dev.fr/api/health (ou votre domaine)"
