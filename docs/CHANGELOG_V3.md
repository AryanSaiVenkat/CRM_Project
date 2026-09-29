# Changelog — Rebuild to PRD v3.0

The codebase was originally built against a **different, superseded PRD**
(a telecom-subscriber-churn concept — `IPS31_Churn_Prediction_PRD_Full.pdf`
/ an earlier `NexusCRM_PRD_v2.0.docx` enterprise-scope draft), not
`NexusCRM_Lite_PRD_v3.0.docx`, which is the governing document. This is a
full rebuild to match v3.0. Recorded here so the domain-model change is
traceable rather than silently discovered later.

## Domain model — replaced, not extended

| Removed (telecom scope) | Replaced by (PRD v3.0 §7.2) |
|---|---|
| `Prospect` (acquisitionSource, planInterest) | `Lead` |
| `Subscriber` (connectionType, tenureMonths, arpu, churnScore, churnTopDrivers) | `Contact` |
| `Subscription` (stages NEW/CONTACTED/PROPOSED/ACTIVATED/LOST) | `Deal` (stages NEW/CONTACTED/PROPOSAL/WON/LOST) |
| `ServiceTicket` (category, device, location) | `Ticket` |
| `RetentionAction` (entirely invented — not in any PRD) | *(removed, no replacement — not a v3.0 requirement)* |
| `lib/retention.ts`, `lib/ai.ts` (churn scoring) | `lib/ai-client.ts`, `ml-service/train_lead_score.py` (lead scoring) |
| `app/api/prospects/**`, `subscribers/**`, `subscriptions/**`, `retention-*/**`, `bootstrap/**` | `app/api/leads/**`, `contacts/**`, `deals/**` |
| `POST /score-churn` (ml-service) | `POST /score-lead` |
| `classifySentiment` via a 33-word keyword list dressed as the FR-AI-02 implementation | Real VADER (`vaderSentiment` package) in `ml-service/main.py`; the old keyword list survives only as `lib/ai-client.ts`'s documented degraded-mode fallback |
| `app/api/assistant/route.ts` (hardcoded telecom Q&A) | **Removed.** FR-AI-04 is PRD v3.0's own P2/stretch requirement — deferred, not implemented this pass. |

## Infrastructure

- **SQLite → PostgreSQL.** Matches PRD §5.3 (Neon/Supabase in a future
  deployed demo) and §11.1 (Docker Compose Postgres for local dev).
- **`prisma db push` → `prisma migrate dev`.** Real migration history now
  exists under `prisma/migrations/`.
- **Every `/api/*` route was unauthenticated.** `middleware.ts` only
  guarded `/dashboard/:path*`; fixed to guard `/api/((?!auth).*)` too, with
  JSON `401`s for API callers instead of an HTML redirect.
- **Non-atomic conversion.** The old `/prospects/[id]/convert` route did
  the Subscriber-create and Prospect-status-update as two separate
  `await`s — a crash between them left an orphaned half-converted record.
  `conversion.service.ts` wraps both in one `$transaction`.
- **No layered architecture.** API routes called Prisma directly. Added
  `lib/repositories/` (data access) and `lib/services/` (business logic +
  FR-08 scoping), with Zod validation (`lib/validation/`) and a consistent
  error-to-HTTP-status mapping (`lib/errors/`).
- **No tests, no Docker, no migrations, no lint/format config** existed at
  all. Added Jest (unit + integration) + pytest, Dockerfiles + Compose,
  ESLint/Prettier.

## Explicitly not carried forward, and why

- **FR-AI-04 (AI assistant)** — PRD's own P2/stretch tier; deferred per an
  explicit instruction to treat it as lowest priority for this pass.
- **CI/CD pipeline, cloud deployment (Vercel/Render/Neon), staging/prod
  environments** — explicitly out of scope for this pass per instruction;
  Docker containerization only. See §11 of the PRD for what that would
  look like when it's picked up.
- **shadcn/ui via the interactive CLI** — implemented by hand (same
  Radix + Tailwind + `class-variance-authority` primitives shadcn itself
  generates) rather than running `npx shadcn-ui@latest init` inside an
  unattended environment, to avoid an interactive-prompt failure mode.
