# syntax=docker/dockerfile:1
# Produksjons-image for Søknadsbasen på Coolify/Docker.
# Next.js 16 standalone + Prisma + system-Chromium (Puppeteer PDF).

# ---- Base ----
FROM node:22-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# Puppeteer skal IKKE laste ned egen Chromium — vi bruker system-Chromium i runner.
ENV PUPPETEER_SKIP_DOWNLOAD=true

# ---- Dependencies (full, inkl. dev for build) ----
FROM base AS deps
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# ---- Build ----
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_*-variabler inlines i klient-bundelen ved BUILD — de må derfor
# være tilgjengelige her. Coolify sender dem som build-args (se DEPLOY-COOLIFY.md).
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_VAPID_PUBLIC_KEY
ARG NEXT_PUBLIC_HOCUSPOCUS_URL
ARG SOURCE_COMMIT
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_VAPID_PUBLIC_KEY=$NEXT_PUBLIC_VAPID_PUBLIC_KEY \
    NEXT_PUBLIC_HOCUSPOCUS_URL=$NEXT_PUBLIC_HOCUSPOCUS_URL \
    SOURCE_COMMIT=$SOURCE_COMMIT

# Generer Prisma-klient, så bygg. Migrasjoner kjøres ved oppstart, ikke her.
RUN npx prisma generate && npx next build

# ---- Runner ----
FROM base AS runner
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# System-Chromium + biblioteker Puppeteer trenger for headless PDF-rendering.
RUN apt-get update && apt-get install -y --no-install-recommends \
      chromium ca-certificates \
      fonts-liberation fonts-noto-color-emoji \
      libnss3 libatk-bridge2.0-0 libatk1.0-0 libcups2 libdrm2 libxkbcommon0 \
      libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2 \
      libpango-1.0-0 libcairo2 \
 && rm -rf /var/lib/apt/lists/*

# Prisma CLI (selvstendig) for `migrate deploy` ved oppstart.
RUN npm install -g prisma@6 && npm cache clean --force

RUN groupadd -r nodejs && useradd -r -g nodejs -m nextjs

# Next standalone output + statiske filer + public.
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
# Prisma schema + migrasjoner trengs for `migrate deploy`.
COPY --from=build /app/prisma ./prisma

# Puppeteer-core (PDF via system-Chromium): Next standalone-tracing kopierer
# bare package.json for serverExternalPackages, ikke lib-filene — så vi
# installerer det komplett (med alle deps) i et tmp-tre og legger det over
# i app-node_modules. Uten dette feiler /api/pdf med MODULE_NOT_FOUND.
RUN cd /tmp && npm init -y >/dev/null 2>&1 \
 && npm install puppeteer-core@24.42.0 --no-audit --no-fund >/dev/null 2>&1 \
 && cp -r /tmp/node_modules/. ./node_modules/ \
 && rm -rf /tmp/node_modules /tmp/package.json && npm cache clean --force

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

USER nextjs
EXPOSE 3000
ENTRYPOINT ["docker-entrypoint.sh"]
