# docker build -f apps/api/Dockerfile .
FROM node:20-bookworm-slim AS deps
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /repo
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
ENV NODE_OPTIONS="--max-old-space-size=6144"
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json tsconfig.base.json .npmrc ./
COPY version.txt ./version.txt
COPY packages ./packages
COPY apps/api ./apps/api
RUN pnpm install --frozen-lockfile
# Client Prisma + compilation du paquet (dist/ pour le runtime Node)
RUN pnpm --filter @taj/database run build \
  && test -f packages/database/dist/index.js \
  && test -f packages/database/dist/index.d.ts
RUN pnpm --filter @taj/api run build

FROM node:20-bookworm-slim
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /repo
ENV NODE_ENV=production
COPY --from=deps /repo /repo
COPY apps/api/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
EXPOSE 3001
ENTRYPOINT ["/docker-entrypoint.sh"]
