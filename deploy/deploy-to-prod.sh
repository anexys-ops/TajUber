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
if [[ -n "${SSHPASS:-}" ]] && command -v sshpass >/dev/null 2>&1; then
  _SSHP=(sshpass -e)
else
  _SSHP=()
fi

SSH=("${_SSHP[@]}" ssh -p "$SSH_PORT" -o StrictHostKeyChecking=accept-new)
if [[ -n "${SSHPASS:-}" ]] && command -v sshpass >/dev/null 2>&1; then
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
  --exclude "*.log"
)

if [[ ! -f deploy/env.prod ]]; then
  echo "Erreur : créez deploy/env.prod à partir de deploy/env.prod.example"
  exit 1
fi

echo "→ Sync vers ${DEPLOY_USER}@${DEPLOY_HOST}:${REMOTE_DIR}"
"${RSYNC[@]}" ./ "${DEPLOY_USER}@${DEPLOY_HOST}:${REMOTE_DIR}/"

echo "→ Copie des secrets (env.prod)"
"${_SSHP[@]}" scp -P "$SSH_PORT" -o StrictHostKeyChecking=accept-new \
  deploy/env.prod "${DEPLOY_USER}@${DEPLOY_HOST}:${REMOTE_DIR}/deploy/env.prod"

REMOTE_BUILD="build"
if [[ "${DEPLOY_NO_CACHE:-}" == "1" ]]; then
  REMOTE_BUILD="build --no-cache"
fi

echo "→ Build & up (Docker)"
# bash -s + heredoc : expansion locale des chemins / flags (pas de bash -c vide)
"${SSH[@]}" "${DEPLOY_USER}@${DEPLOY_HOST}" bash -s <<EOF
set -e
cd "$(printf '%s' "$REMOTE_DIR")"
docker compose -f docker-compose.prod.yml --env-file deploy/env.prod $REMOTE_BUILD
docker compose -f docker-compose.prod.yml --env-file deploy/env.prod up -d
docker compose -f docker-compose.prod.yml --env-file deploy/env.prod ps
EOF

echo "→ Terminé. Vérifiez : curl -sS http://taj.apps-dev.fr/api/health (ou votre domaine)"
