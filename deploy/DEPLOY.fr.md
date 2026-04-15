# Déploiement sur VPS (ex. `taj.apps-dev.fr`)

## Sécurité importante

- **Ne commitez jamais** `deploy/env.prod` ni de mots de passe.
- Si un mot de passe SSH a été partagé dans un chat, **changez-le** sur le serveur (`passwd`) et préférez une **clé SSH** (`ssh-copy-id`).
- Le port **166** est un port SSH personnalisé : `ssh -p 166 root@VOTRE_IP`.

## Prérequis sur le VPS

- Docker **et** Docker Compose plugin (`docker compose`).
- Si vous êtes dans un **LXC / conteneur** (« container 166 »), vérifiez que Docker est autorisé (nesting / privilèges) ou installez la stack sur l’hôte.

## DNS

Enregistrement **A** : `taj.apps-dev.fr` → IP publique du VPS (`86.104.252.67` ou la vôtre).

## Déploiement via GitHub Actions

Sur chaque `push` sur la branche **`main`** (et via **Actions → Deploy production → Run workflow**), le workflow `.github/workflows/deploy.yml` synchronise le dépôt vers le VPS puis exécute `docker compose build` et `up -d`.

### Secrets GitHub (Settings → Secrets and variables → Actions)

| Secret | Description |
|--------|-------------|
| `DEPLOY_SSH_KEY` | Clé privée PEM (ex. `deploy/keys/gh-actions-deploy` générée en local — **ne jamais la commiter**). |
| `DEPLOY_HOST` | IP ou hostname (ex. `86.104.252.67`). |
| `DEPLOY_USER` | Utilisateur SSH (ex. `root`). |
| `DEPLOY_ENV` | Contenu **multiligne** complet de `deploy/env.prod` (copier-coller depuis votre fichier local). |
| `DEPLOY_PORT` | *(Optionnel)* Port SSH ; défaut **`166`**. |
| `DEPLOY_REMOTE_DIR` | *(Optionnel)* Répertoire distant ; défaut **`/opt/taj-platform`**. |

### Autoriser la clé sur le serveur

Une paire dédiée peut être générée dans le dépôt (clé privée listée dans `.gitignore`) :

- Fichier public versionné : `deploy/keys/gh-actions-deploy.pub`
- Sur le VPS : ajoutez la ligne du `.pub` dans `~/.ssh/authorized_keys` du compte utilisé pour le déploiement.

Puis copiez le contenu de la clé **privée** dans le secret `DEPLOY_SSH_KEY`.

## Déploiement automatique (recommandé)

Sur **votre PC** (où `ssh` vers le serveur fonctionne), à la racine du dépôt :

1. Une fois : `cp deploy/env.prod.example deploy/env.prod` puis éditez les secrets (ne commitez pas `env.prod`).
2. Lancez :

```bash
export DEPLOY_HOST=86.104.252.67
export SSH_PORT=22          # ou 166 selon votre SSH
export DEPLOY_USER=root
export REMOTE_DIR=/opt/taj-platform
./deploy/deploy-to-prod.sh
```

Rebuild complet sans cache Docker : `DEPLOY_NO_CACHE=1 ./deploy/deploy-to-prod.sh`

Le script **rsync** le projet, envoie `deploy/env.prod`, puis exécute `docker compose build` et `up -d` sur le serveur.

## Étapes manuelles (alternative)

### 1. Copier le projet

```bash
rsync -avz -e "ssh -p 22" --exclude node_modules --exclude .git \
  ./ root@86.104.252.67:/opt/taj-platform/
```

### 2. Sur le serveur

```bash
ssh -p 22 root@86.104.252.67
cd /opt/taj-platform
cp deploy/env.prod.example deploy/env.prod
nano deploy/env.prod
```

### 3. Build et démarrage

```bash
docker compose -f docker-compose.prod.yml --env-file deploy/env.prod up -d --build
```

- L’API exécute **`prisma migrate deploy`** au démarrage.
- Seed (optionnel, une fois) :

```bash
docker compose -f docker-compose.prod.yml --env-file deploy/env.prod exec api \
  sh -c 'cd /repo && pnpm --filter @taj/database exec prisma db seed'
```

### 4. Vérifications

- `http://taj.apps-dev.fr/health` → via Nginx : `http://taj.apps-dev.fr/api/health`
- Back-office : `http://taj.apps-dev.fr/`
- Caisse : `http://taj.apps-dev.fr/pos/`

### 5. HTTPS (Let’s Encrypt)

Le fichier Nginx fourni expose le dossier `/.well-known/acme-challenge/` via le volume `certbot_www`. Après `docker compose up`, créez les certificats (adaptez le nom du volume avec `docker volume ls | grep certbot`) :

```bash
docker run --rm \
  -v taj-platform_certbot_www:/var/www/certbot \
  -v letsencrypt_certs:/etc/letsencrypt \
  certbot/certbot certonly --webroot -w /var/www/certbot \
  -d taj.apps-dev.fr --email vous@example.com --agree-tos --no-eff-email
```

Puis ajoutez un bloc `listen 443 ssl` dans Nginx en montant `letsencrypt_certs`, ou utilisez un reverse proxy TLS sur l’hôte (Traefik, Caddy, Nginx système).

**Stripe** : URL webhook à configurer côté Stripe :  
`https://taj.apps-dev.fr/stripe/webhook`

## URLs récapitulatives

| Service   | URL publique                          |
|----------|----------------------------------------|
| API      | `https://taj.apps-dev.fr/api/...`     |
| Admin    | `https://taj.apps-dev.fr/admin`       |
| Cuisine  | `https://taj.apps-dev.fr/kitchen`     |
| Caisse   | `https://taj.apps-dev.fr/pos/`       |
| Webhooks | `https://taj.apps-dev.fr/stripe/webhook` |

## Mise à jour

```bash
cd /opt/taj-platform
git pull   # ou nouveau rsync
docker compose -f docker-compose.prod.yml --env-file deploy/env.prod up -d --build
```
