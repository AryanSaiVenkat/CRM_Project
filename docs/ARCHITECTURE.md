# Architecture

Governing document: `NexusCRM_Lite_PRD_v3.0.docx` (₹5,000 hard cap,
zero-infrastructure-cost). See `CHANGELOG_V3.md` for what this replaced.

## System diagram

```
                    ┌─────────────────────────────┐
                    │        BROWSER               │
                    └───────────────┬───────────────┘
                                    │ HTTPS (local: HTTP)
                                    ▼
┌───────────────────────────────────────────────────────────────┐
│  WEB APP — Next.js 14 App Router (container: "web")             │
│                                                                   │
│  app/dashboard/**            Server Components — session check,  │
│                               initial data fetched directly via   │
│                               the service layer (no client-side   │
│                               bootstrap round-trip)                │
│  components/**/*Client.tsx   Client Components — mutations via     │
│                               fetch() to app/api/**                │
│  app/api/**/route.ts         Controllers — requireUser() + Zod     │
│                               parse + call a service + map errors  │
│                               (lib/errors/error-handler.ts)        │
│  lib/services/**             Business logic + FR-08 row scoping    │
│  lib/repositories/**         Prisma data access, one per entity    │
│  middleware.ts               FR-07 — guards /dashboard/* and       │
│                               /api/* (except /api/auth/*)          │
└───────────┬───────────────────────────────┬─────────────────────┘
            │ Prisma ORM                    │ lib/ai-client.ts
            ▼                                ▼ (fetch, 3s timeout)
┌───────────────────────┐        ┌─────────────────────────────────┐
│  POSTGRES              │        │  ML INFERENCE SERVICE            │
│  (container: postgres) │        │  FastAPI (container: ml-service) │
│  Lead, Contact, Deal,  │        │  POST /score-lead                 │
│  Ticket, User          │        │  POST /sentiment (VADER)          │
└───────────────────────┘        │  Loads lead_score_model.joblib    │
                                   │  at startup (baked into image     │
                                   │  build — see ml-service/Dockerfile)│
                                   └─────────────┬─────────────────────┘
                                                 │ offline, build-time only
                                                 ▼
                                   ┌─────────────────────────────────┐
                                   │  train_lead_score.py              │
                                   │  scikit-learn + XGBoost + SHAP    │
                                   │  fixed-seed synthetic dataset     │
                                   └─────────────────────────────────┘
```

## Layered architecture (web app)

Controllers (`app/api/**/route.ts`) → Services (`lib/services/**`) →
Repositories (`lib/repositories/**`) → Prisma. Each layer has one job:

- **Controllers**: session check (`requireUser()`), Zod parse the
  request, call exactly one service method, return a `NextResponse`. All
  wrapped in `withErrorHandling` so `AppError` subclasses
  (`NotFoundError`/`ConflictError`/`ValidationError`/`ForbiddenError`)
  consistently map to their HTTP status without per-route try/catch.
- **Services**: business rules and **FR-08 row-level scoping** (Owner sees
  all; Staff sees only what they own, enforced via a `scopeWhere(user)`
  helper in each service — never in a repository, which stays
  session-agnostic and simply testable). `conversion.service.ts` wraps the
  Lead→Contact+Deal creation in a single `$transaction` (FR-02).
- **Repositories**: thin Prisma wrappers, one per entity, no business
  logic.

Unit tests mock only at the Prisma boundary (`lib/__mocks__/prisma.ts`), so
service *and* repository code both run for real — see `docs/TESTING.md`.

## The `lib/ai-client.ts` fallback — what it does and doesn't satisfy

`scoreLead()`/`getSentiment()` call the FastAPI service at
`ML_SERVICE_URL` with a 3-second timeout and validate the response shape
(defends against `ML_SERVICE_URL` accidentally pointing at an unrelated
service that still returns `200`). If that call fails, times out, is
unreachable, or `ML_SERVICE_URL` is unset, both functions fall back to a
small deterministic local heuristic in the same file.

**This fallback exists purely so the app degrades gracefully — it does NOT
by itself satisfy FR-AI-01 (a locally-trained ML model) or FR-AI-02
(VADER).** Those are implemented in `ml-service/`. If you're demoing or
grading FR-AI-01/02/03 specifically, confirm the ML service is up (`docker
compose up ml-service` or `GET http://localhost:8001/`, which reports
`model_loaded`) — otherwise the app is silently running in degraded mode
and its AI outputs, while directionally reasonable, aren't the PRD-required
implementation.

## Why Postgres, not SQLite

The original codebase ran SQLite for a zero-setup local dev loop. PRD v3.0
§5.3 specifies Postgres (Neon/Supabase) for the deployed demo and §11.1
specifies **Docker Compose Postgres for local development** — this rebuild
switches now rather than deferring, since Docker Compose was being set up
in this same pass anyway (Stage 7) and native Postgres enums fix a real bug
class the SQLite version had (drifted stage strings — see
`CHANGELOG_V3.md`).

## Known limitations (stated up front, per the PRD's own §5.4/§9.3 ethos)

- **Next.js 14.2.35 has known CVEs** (`npm audit`) fixed only in a Next 16
  major upgrade — not performed in this pass since it's a breaking
  framework migration outside the scope of a restructuring task; flagged
  rather than silently left for someone to discover later.
- **FR-AI-04** (the P2/stretch AI assistant) is not implemented — see
  `CHANGELOG_V3.md`.
- **No CI/CD, no cloud deployment** — explicitly out of scope for this
  pass; Docker containerization only (§11's local-dev/demo environment).
- **The web Docker image copies a full `node_modules`**, not Next's
  minimal `output: "standalone"` trace, so the Prisma CLI (a
  devDependency) is available at runtime for `prisma migrate deploy` on
  boot. Larger image, but this is explicitly a local/demo image, not a
  size-optimized deploy target.
