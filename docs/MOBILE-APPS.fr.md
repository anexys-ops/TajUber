# Applications mobiles — URLs, API et tests

Ce document sert de **référence unique** pour développer et tester :

1. **App client** — catalogue, panier, commande, livraison / retrait, paiement, (historique à prévoir côté API).
2. **App livreur** — liste des commandes, changements de statut livraison.

Les squelettes Expo existent dans le monorepo : `apps/mobile` (client), `apps/mobile-driver` (livreur), `apps/mobile-kitchen` (cuisine — hors scope livreur mais utile pour les tests d’équipe).

---

## 1. URLs et environnement

### Production (exemple)

| Usage | URL de base |
|--------|-------------|
| **API** (depuis les apps, HTTPS) | `https://taj.apps-dev.fr/api` |
| Site / back-office | `https://taj.apps-dev.fr` |
| Caisse web | `https://taj.apps-dev.fr/pos` |

**Important** : l’API attend les chemins **sans** préfixe `/api` côté Nest, mais le reverse proxy expose tout sous **`/api/...`**. Dans le code mobile, utilise une base du type **`https://taj.apps-dev.fr/api`** puis des chemins relatifs : `/catalog/menu-items`, `/auth/login`, etc.

### Développement local

| Service | URL |
|---------|-----|
| API Nest | `http://localhost:3001` (pas de préfixe `/api` en direct) |
| Avec tunnel (Expo) | utiliser l’URL publique de ton tunnel ou l’IP LAN de la machine qui tourne l’API |

### Multi-tenant (obligatoire sur la plupart des routes)

Toutes les routes « métier » (catalogue, commandes, etc.) exigent l’en-tête HTTP :

```http
x-tenant-slug: taj-poulet-demo
```

Remplace par le **slug** du restaurant cible (white-label). En seed démo : `taj-poulet-demo`.

Les routes **`/auth/*`**, **`/health`**, **`/api/health`** (selon proxy), **`/platform/*`**, **`/stripe/webhook`**, **`/uploads/*`** suivent les règles du middleware (certaines sans `x-tenant-slug` — voir code `tenant.middleware.ts`).

---

## 2. Variables de build (Expo / EAS)

À définir **au build** (pas seulement en `.env` local) pour une app par restaurant :

| Variable | Rôle |
|----------|------|
| `EXPO_PUBLIC_API_URL` | Base API, ex. `https://taj.apps-dev.fr/api` |
| `TENANT_SLUG` | Slug restaurant → `extra.tenantSlug` dans `app.config.ts` |
| `BRAND_NAME` | Nom affiché de l’app |
| `EXPO_SLUG` | Slug Expo |
| `IOS_BUNDLE_ID` / `ANDROID_PACKAGE` | Identifiants stores (white-label) |
| `APP_SCHEME` | Deep links |

Référence client : `apps/mobile/app.config.ts`  
Builds store / EAS (commandes, profils) : **§9**.  
Référence livreur : `apps/mobile-driver/app.config.ts` (mêmes variables : `EXPO_PUBLIC_API_URL`, `TENANT_SLUG`, `BRAND_NAME`, slugs / bundle IDs / scheme).

---

## 3. Authentification

### Inscription client

`POST {apiBase}/auth/register`  
Corps JSON (exemple) :

```json
{
  "email": "client@example.com",
  "password": "motdepasse8+",
  "displayName": "Prénom",
  "tenantSlug": "taj-poulet-demo"
}
```

Réponse typique : `{ "access_token": "...", ... }` — rôle **`CUSTOMER`** pour ce tenant.

### Connexion

`POST {apiBase}/auth/login`

```json
{
  "email": "client@example.com",
  "password": "motdepasse8+",
  "tenantSlug": "taj-poulet-demo"
}
```

Comptes seed utiles pour tests (mot de passe souvent `ChangeMeDev123!` ou `SEED_PASSWORD` du `.env`) :

| Email | Rôle | `tenantSlug` |
|-------|------|----------------|
| `livreur@taj.local` | **DRIVER** | obligatoire (ex. `taj-poulet-demo`) |
| `admin@taj.local` | TENANT_ADMIN | obligatoire |
| `cuisine@taj.local` | KITCHEN | obligatoire |
| `caisse@taj.local` | STAFF_POS | obligatoire |

Pour les appels authentifiés :

```http
Authorization: Bearer <access_token>
x-tenant-slug: taj-poulet-demo
```

---

## 4. App client — ce qui existe dans l’API aujourd’hui

### Catalogue public (sans JWT)

| Méthode | Chemin | Description |
|---------|--------|-------------|
| GET | `/catalog/menu-items` | Articles disponibles |
| GET | `/catalog/promotions` | Promotions actives |
| GET | `/catalog/restaurant` | Infos restaurant, horaires, `deliveryAvailable` / `pickupAvailable` |

Toujours avec **`x-tenant-slug`**.

### Créer une commande (sans JWT aujourd’hui)

| Méthode | Chemin | Description |
|---------|--------|-------------|
| POST | `/orders` | Crée une commande en **`PENDING_PAYMENT`** avec lignes articles |

Corps aligné sur le DTO serveur (champs utiles) :

```json
{
  "customerName": "Jean",
  "customerPhone": "+33600000000",
  "fulfillmentType": "DELIVERY",
  "deliveryAddress": "10 rue Example",
  "deliveryPostalCode": "75001",
  "deliveryCity": "Paris",
  "deliveryInstructions": "Digicode 1234",
  "orderSource": "mobile_app",
  "items": [
    { "menuItemId": "<id prisma>", "quantity": 2 }
  ]
}
```

`fulfillmentType` : `PICKUP` ou `DELIVERY`.  
Les `menuItemId` viennent du GET catalogue.

### Paiement carte (Stripe)

| Méthode | Chemin | Description |
|---------|--------|-------------|
| POST | `/orders/:id/payment-intent` | Retourne `clientSecret` pour Stripe Payment Element / SDK mobile |

Flux typique mobile : créer commande → `payment-intent` → confirmer le paiement côté Stripe (SDK) → webhook serveur met la commande en **`PAID`**.

Les autres moyens (espèces, etc.) sont surtout gérés depuis la **caisse** (`POST /orders/:id/mark-paid` avec rôle staff).

### Historique des commandes « mon compte »

**État actuel du backend** : le modèle `Order` **ne stocke pas** `customerUserId`. Le rôle **`CUSTOMER`** existe (login / register), mais **il n’y a pas encore** d’endpoint du type `GET /me/orders` réservé au client.

**Pistes pour l’app produit** :

1. **Évolution API recommandée** : ajouter `customerUserId` optionnel sur `Order`, le renseigner à la création si `Authorization: Bearer` présent, exposer `GET /orders/me` (ou `/customer/orders`) pour l’historique.
2. **Contournement temporaire** : historique local (AsyncStorage) à partir des `orderId` retournés après création / paiement — fragile si l’utilisateur change de téléphone.

Le document décrit l’**objectif produit** ; l’implémentation historique fiable passe par une **évolution Prisma + Nest**.

---

## 5. App livreur — ce qui existe

### Connexion

Même `POST /auth/login` avec un compte **`DRIVER`** (ex. `livreur@taj.local` + `tenantSlug`).

### Liste des commandes

| Méthode | Chemin | Rôles |
|---------|--------|--------|
| GET | `/orders` | `TENANT_ADMIN`, `STAFF_POS`, `KITCHEN`, **`DRIVER`** |

Headers : `Authorization` + `x-tenant-slug`.

### Changer le statut (livraison)

| Méthode | Chemin | Rôles |
|---------|--------|--------|
| PATCH | `/orders/:id/status` | Corps `{ "status": "..." }` — transitions autorisées selon rôle |

Transitions utiles livreur (voir `order-transitions.ts`) :

- **`READY` → `OUT_FOR_DELIVERY`** — autorisé pour `DRIVER` (et admin / caisse).
- **`OUT_FOR_DELIVERY` → `DELIVERED`** — autorisé pour `DRIVER` (et admin).

La cuisine gère plutôt `PAID` → `IN_KITCHEN` → `READY` (`GET /kitchen/orders` + PATCH, rôles cuisine / admin).

### Temps réel (optionnel)

- Namespace Socket.IO **`/realtime`** sur la même origine que l’API (adapter l’URL ws/wss selon Nginx).
- Auth : token JWT + query `tenantSlug` (voir README racine du repo).

---

## 6. Lancer les apps en local (tests)

### Expo Go uniquement (développement)

En local, les apps **client**, **livreur** et **cuisine** se lancent dans **Expo Go** (simulateur iOS, émulateur Android ou téléphone avec l’app [Expo Go](https://expo.dev/go)). Aucun **`expo run:ios`**, **`expo run:android`**, CocoaPods ni projet Xcode/Android Studio n’est nécessaire pour le quotidien.

- Installez la version d’**Expo Go** correspondant au **SDK du monorepo** (actuellement **SDK 52** pour `apps/mobile`, `apps/mobile-driver`, `apps/mobile-kitchen`) : page **[expo.dev/go](https://expo.dev/go)** → choisir la branche **SDK 52**. Si Expo CLI propose de mettre à jour Expo Go dans le simulateur, acceptez dans un **terminal interactif** (TTY).
- **Plusieurs apps en parallèle** : chaque `expo start` occupe un port Metro. Par défaut **8081** ; scripts prêts à l’emploi : **`pnpm run ios:sim`** dans `apps/mobile` (**8082**), **`apps/mobile-driver`** (**8083**), **`apps/mobile-kitchen`** (**8084**) si les autres ports sont pris.

Depuis la racine du monorepo (API + Postgres démarrés) :

```bash
# Client
cd apps/mobile
pnpm run start   # ou : pnpm run ios / pnpm run android

# Livreur
cd apps/mobile-driver
pnpm run start
```

Pour pointer vers la **prod** depuis Expo Go :

```bash
cd apps/mobile
EXPO_PUBLIC_API_URL=https://taj.apps-dev.fr/api TENANT_SLUG=taj-poulet-demo npx expo start
```

Même principe pour l’**app livreur** :

```bash
cd apps/mobile-driver
EXPO_PUBLIC_API_URL=https://taj.apps-dev.fr/api TENANT_SLUG=taj-poulet-demo npx expo start
```

Les valeurs finales sont lues dans `Constants.expoConfig.extra` (`apiUrl` ← `EXPO_PUBLIC_API_URL`, `tenantSlug` ← `TENANT_SLUG`, etc.) via `apps/mobile/app.config.ts` et `apps/mobile-driver/app.config.ts`.

---

## 7. Checklist de test manuel rapide

### Client

1. GET `/catalog/restaurant` + menu + promos avec `x-tenant-slug`.
2. `POST /auth/register` ou `login` client.
3. `POST /orders` avec 1 ligne valide, `orderSource: "mobile_app"`.
4. `POST /orders/{id}/payment-intent` puis paiement test Stripe (clé mode test si environnement test).

### Livreur

1. `POST /auth/login` (`livreur@taj.local` + slug).
2. GET `/orders` — doit retourner JSON (pas 401).
3. PATCH statut sur une commande **`READY`** → `OUT_FOR_DELIVERY` puis `DELIVERED` (nécessite une commande déjà à l’état adapté dans la base).

---

## 8. Résumé objectif produit vs code actuel

| Fonctionnalité | App client | App livreur |
|----------------|------------|-------------|
| Catalogue / restaurant | API OK | N / A |
| Compte + JWT | API OK | API OK |
| Passer commande + livraison | API OK (`POST /orders`) | N / A |
| Paiement carte | API OK (`payment-intent` + Stripe) | N / A |
| **Historique commandes lié au compte** | **À ajouter côté API / Prisma** | Liste globale tenant côté livreur OK via `GET /orders` |
| Suivi livraison | Suivre statuts (temps réel ou polling) | PATCH statuts driver OK |

Pour toute évolution d’API (historique client, rattachement utilisateur), garder la cohérence avec la caisse (`web-pos`) et les règles RBAC existantes (`order-transitions`, guards JWT).

---

## 9. Builds production (EAS) — app client

Les binaires **pour les magasins** (Play Store / App Store) ne passent **pas** par Expo Go : ce sont des builds **EAS** (app autonome). **Expo Go** sert uniquement au développement (§6).

Les binaires installables passent par **Expo Application Services (EAS)**. La config du package client est dans `apps/mobile/eas.json` ; les **variables du §2** doivent être présentes **au moment du build** (CLI ou secrets EAS).

### Prérequis

- Compte [Expo](https://expo.dev), CLI : depuis la racine du monorepo, `pnpm --filter @taj/mobile exec eas login` (ou `cd apps/mobile && pnpm exec eas login`).
- Lier le dépôt à un projet EAS (une fois) : depuis `apps/mobile`, `pnpm exec eas init` (crée ou associe `projectId` dans `app.config` si besoin).

### Exemple (prod, même base que le §1)

Rappel : **`EXPO_PUBLIC_API_URL`** doit inclure le préfixe **`/api`** derrière le reverse proxy (ex. production) :

```bash
cd apps/mobile
EXPO_PUBLIC_API_URL="https://taj.apps-dev.fr/api" \
TENANT_SLUG="taj-poulet-demo" \
BRAND_NAME="TAJ Poulet" \
pnpm run build:android:production
```

- **AAB (Play Store)** : profil `production` → script `build:android:production`.
- **APK (tests internes)** : profil `preview` → script `build:android:preview-apk`.
- **iOS** : `pnpm run build:ios:production` (certificats / App Store Connect à configurer côté Expo).

Les autres variables white-label (`EXPO_SLUG`, `IOS_BUNDLE_ID`, `ANDROID_PACKAGE`, `APP_SCHEME`) s’ajoutent de la même façon sur la ligne de commande ou via les **variables d’environnement / secrets** du projet sur [expo.dev](https://expo.dev).

### Vérification TypeScript (CI / local)

```bash
pnpm --filter @taj/mobile run typecheck
```

---

*Dernière mise à jour : aligné sur le monorepo Taj (Nest `apps/api`, Expo `apps/mobile` / `apps/mobile-driver` avec `app.config.ts` côté livreur).*
