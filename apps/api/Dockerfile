FROM node:24-alpine AS dependencies

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json

RUN npm ci

FROM dependencies AS build

COPY apps/api apps/api

RUN npm run build -w apps/api

FROM node:24-alpine AS production-dependencies

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json

RUN npm ci --omit=dev --workspace api --include-workspace-root

FROM node:24-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV API_PORT=4000

RUN addgroup --system --gid 1001 pulsedock \
  && adduser --system --uid 1001 --ingroup pulsedock pulsedock

COPY --from=production-dependencies --chown=pulsedock:pulsedock /app/node_modules ./node_modules
COPY --from=build --chown=pulsedock:pulsedock /app/apps/api/dist ./apps/api/dist
COPY --chown=pulsedock:pulsedock apps/api/package.json ./apps/api/package.json
COPY --chown=pulsedock:pulsedock apps/api/prisma.config.ts ./apps/api/prisma.config.ts
COPY --chown=pulsedock:pulsedock apps/api/prisma ./apps/api/prisma

USER pulsedock
WORKDIR /app/apps/api

EXPOSE 4000

CMD ["node", "dist/src/main.js"]
