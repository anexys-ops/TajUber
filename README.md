# Taj Platform

Monorepo **white-label** : backend **multi-tenant** (isolation par `tenantId` + middleware `x-tenant-slug`). Chaque restaurant encaisse via **Stripe Connect** ; la plateforme perçoit une **commission** et un **abonnement** (Stripe Billing).

## Prérequis

- Node 20+
- [pnpm](https://pnpm.io) (ou `npx pnpm@9`)
- Docker (Postgres + Redis optionnel), ou Postgres managé

## Démarrage rapide

```bash
cp .env.example .env
docker compose up -d
npx pnpm@9 install
npx pnpm@9 db:migrate
npx pnpm@9 db:seed
npx pnpm@9 dev
```

Comptes seed (`SEED_PASSWORD` ou `ChangeMeDev123!`) :

- `owner@taj.local` — plateforme (`isPlatformOwner`, login **sans** `tenantSlug`)
- `admin@taj.local` + `tenantSlug: taj-poulet-demo` — admin restaurant
- `cuisine@taj.local` + slug — ligne cuisine
- `livreur@taj.local` + slug — livreur

Back-office Next : définir `TAJ_PLATFORM_TOKEN` (JWT obtenu via `POST /auth/login` en tant qu’owner) pour lister les tenants côté serveur.

## Services

| Service | Commande | Port |
|--------|----------|------|
| API Nest | `pnpm --filter @taj/api dev` | 3001 |
| Back-office | `pnpm --filter @taj/web-admin dev` | 3040 |
| Caisse | `pnpm --filter @taj/web-pos dev` | 3041 |
| Client Expo (Expo Go) | `cd apps/mobile && npx expo start` | — |
| Cuisine (KDS, Expo Go) | `cd apps/mobile-kitchen && npx expo start` | — |
| Livreur (Expo Go) | `cd apps/mobile-driver && npx expo start` | — |
| Agent impression | `pnpm --filter @taj/print-agent run build && PRINT_AGENT_SECRET=… TENANT_SLUG=… pnpm --filter @taj/print-agent start` | — |

API Docker (image monorepo) : `docker compose --profile full up -d --build`

## Auth JWT

- `POST /auth/register` — client (`tenantSlug` obligatoire) → rôle `CUSTOMER`
- `POST /auth/login` — `email`, `password`, `tenantSlug` optionnel (obligatoire sauf compte `isPlatformOwner`)

Routes `/platform/*` : `Authorization: Bearer` + compte plateforme.

Routes `/admin/*` : en-tête `x-tenant-slug` + JWT `TENANT_ADMIN` (ou owner plateforme).

## Temps réel (caisse / cuisine)

- Socket.IO namespace **`/realtime`** : auth `token` (JWT) + query `tenantSlug` ; room `tenant:{id}` — événement `orderUpdated`.
- Agents impression : même namespace, `printSecret` = `PRINT_AGENT_SECRET` + `tenantSlug` → room `tenant:{id}:print` — `printJob`.

## Stripe

| Flux | Détail |
|------|--------|
| Connect | Onboarding `POST /platform/tenants/:id/stripe-connect/link` |
| Commande | `application_fee_amount` + `transfer_data.destination` |
| Webhooks | Idempotence via table `StripeWebhookEvent` (contrainte unique `id` événement) |

## Structure

```
apps/
  api/               NestJS
  web-admin/         Next.js (tenants + /admin/menu)
  web-pos/           Next.js caisse
  mobile/            Expo client — `app.config.ts` (BRAND_NAME, TENANT_SLUG, bundle IDs)
  mobile-kitchen/    Expo KDS
  mobile-driver/     Expo livreur
packages/
  database/          Prisma + migrations + seed
  sdk/               Types + client HTTP léger (`@taj/sdk`)
  print-agent/       Socket.IO client → ESC/POS (stub)
```

## Tests / CI

- `pnpm test` — Jest (`order-transitions` RBAC)
- `.github/workflows/ci.yml` — build + lint + tests
- `.github/workflows/mobile-white-label.yml` — `tsc` sur les apps Expo

## White-label

Variables d’environnement au build mobile : `TENANT_SLUG`, `BRAND_NAME`, `EXPO_SLUG`, `IOS_BUNDLE_ID`, `ANDROID_PACKAGE`, `EXPO_PUBLIC_API_URL` (voir `apps/mobile/app.config.ts`).
