# Nexus CRM Lite — web app (Next.js). Local dev/demo image only, per PRD
# v3.0 §11.1 — no separate staging/prod image, no CI baked in here.
#
# Uses a full node_modules (not Next's minimal `output: "standalone"`
# trace) so the Prisma CLI — a devDependency, needed to run
# `prisma migrate deploy` on container boot — is actually present at
# runtime. Bigger image than a standalone build, but this is explicitly a
# local/demo image, not a size-optimized deploy target, so that trade is
# the right one here.

FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl
COPY package.json package-lock.json ./
COPY prisma ./prisma
# npm install, not `ci` — `ci`'s strict lockfile-match check proved brittle
# across the host's npm 10.9.3 vs. this image's npm 10.8.2 (picomatch/
# testing-library transitive-resolution differences); this is a local/demo
# image, not a bit-for-bit-reproducible deploy artifact, so the trade is fine.
# DATABASE_URL only needs to be a syntactically valid Postgres URL at build
# time — `next build` never opens a connection (every route/page is
# force-dynamic or session-gated), but the postinstall `prisma generate`
# reads the datasource block and wants the env var present.
ENV DATABASE_URL="postgresql://user:pass@localhost:5432/db"
RUN npm install
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
RUN apk add --no-cache openssl
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/next.config.mjs ./next.config.mjs
COPY --from=builder --chown=nextjs:nodejs /app/tsconfig.json ./tsconfig.json
# prisma/seed.ts imports the real service layer by relative path (dogfoods
# the same conversion/AI logic the app uses at runtime, see prisma/seed.ts)
# — tsx needs the raw TS source present, not just the compiled .next output.
COPY --from=builder --chown=nextjs:nodejs /app/lib ./lib

USER nextjs
EXPOSE 3000
ENV PORT=3000

# Self-migrates against the compose Postgres on boot (§11.1 — local dev/demo
# only; no separate deploy step exists yet by design, see docs/CHANGELOG_V3.md).
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
