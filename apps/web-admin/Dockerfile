# docker build -f apps/web-admin/Dockerfile .
FROM node:20-bookworm-slim AS builder
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /repo
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
ENV NODE_OPTIONS="--max-old-space-size=6144"
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json tsconfig.base.json .npmrc ./
COPY version.txt ./version.txt
COPY packages ./packages
COPY apps/web-admin ./apps/web-admin
RUN pnpm install --frozen-lockfile
ARG NEXT_PUBLIC_API_URL=https://example.com/api
ARG NEXT_PUBLIC_WEB_POS_URL=https://example.com/pos
ARG NEXT_PUBLIC_TENANT_SLUG=taj-poulet-demo
ARG NEXT_PUBLIC_APP_VERSION=dev
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WEB_POS_URL=$NEXT_PUBLIC_WEB_POS_URL
ENV NEXT_PUBLIC_TENANT_SLUG=$NEXT_PUBLIC_TENANT_SLUG
ENV NEXT_PUBLIC_APP_VERSION=$NEXT_PUBLIC_APP_VERSION
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @taj/web-admin run build

FROM node:20-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3040
ENV HOSTNAME=0.0.0.0
COPY --from=builder /repo/apps/web-admin/.next/standalone ./
COPY --from=builder /repo/apps/web-admin/.next/static ./apps/web-admin/.next/static
WORKDIR /app/apps/web-admin
EXPOSE 3040
USER node
CMD ["node", "server.js"]
