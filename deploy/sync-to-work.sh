#!/usr/bin/env bash
# Synchronise tout l’arborescence applicative vers un dossier WORK sur le serveur
# (reprise à zéro dans un autre répertoire que /opt/taj-platform).
#
# Usage (depuis votre machine, là où le dépôt Git est à jour) :
#   chmod +x deploy/sync-to-work.sh
#   export DEPLOY_HOST=86.104.252.67
#   export SSH_PORT=166              # optionnel
#   export DEPLOY_USER=root
#   export REMOTE_WORK_DIR=/opt/WORK # optionnel, défaut ci-dessous
#   export SYNC_WITH_GIT=1           # optionnel : inclure .git (plus lourd)
#   ./deploy/sync-to-work.sh
#
# Prérequis : rsync, ssh. Ne copie pas deploy/env.prod (secrets) ; utilisez
# deploy/env.prod.example sur le serveur puis renommez/remplissez env.prod.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DEPLOY_HOST="${DEPLOY_HOST:?Définir DEPLOY_HOST (IP ou hostname du serveur)}"
SSH_PORT="${SSH_PORT:-22}"
DEPLOY_USER="${DEPLOY_USER:-root}"
REMOTE_WORK_DIR="${REMOTE_WORK_DIR:-/opt/WORK}"

SSH=(ssh -p "$SSH_PORT" -o StrictHostKeyChecking=accept-new)
if [[ -n "${SSHPASS:-}" ]] && command -v sshpass >/dev/null 2>&1; then
  SSH=(sshpass -e "${SSH[@]}")
  RSYNC_SSH="sshpass -e ssh -p $SSH_PORT -o StrictHostKeyChecking=accept-new"
else
  RSYNC_SSH="ssh -p $SSH_PORT -o StrictHostKeyChecking=accept-new"
fi

RSYNC_EXCLUDES=(
  --exclude node_modules
  --exclude "**/.next"
  --exclude "**/dist"
  --exclude .turbo
  --exclude deploy/env.prod
  --exclude deploy/keys/gh-actions-deploy
  --exclude "*.log"
)
if [[ "${SYNC_WITH_GIT:-}" != "1" ]]; then
  RSYNC_EXCLUDES+=(--exclude .git)
fi

RSYNC=(rsync -avz --delete -e "$RSYNC_SSH" "${RSYNC_EXCLUDES[@]}")

echo "→ Création du répertoire distant ${REMOTE_WORK_DIR}"
"${SSH[@]}" "${DEPLOY_USER}@${DEPLOY_HOST}" "mkdir -p '${REMOTE_WORK_DIR}'"

echo "→ Sync ${ROOT}/ → ${DEPLOY_USER}@${DEPLOY_HOST}:${REMOTE_WORK_DIR}/"
"${RSYNC[@]}" ./ "${DEPLOY_USER}@${DEPLOY_HOST}:${REMOTE_WORK_DIR}/"

echo "→ Terminé."
echo ""
echo "Sur le serveur, exemple pour repartir de zéro (prod Docker) :"
echo "  cd ${REMOTE_WORK_DIR}"
echo "  cp -n deploy/env.prod.example deploy/env.prod   # puis éditer deploy/env.prod"
echo "  docker compose -f docker-compose.prod.yml --env-file deploy/env.prod build"
echo "  docker compose -f docker-compose.prod.yml --env-file deploy/env.prod up -d"
echo ""
echo "Pour n’utiliser que la stack dev locale Docker (Postgres + API profil full) :"
echo "  cd ${REMOTE_WORK_DIR} && docker compose --profile full up -d --build"
