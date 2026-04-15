#!/bin/sh
set -e
cd /repo
pnpm --filter @taj/database exec prisma migrate deploy
exec node apps/api/dist/main.js
