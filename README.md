# Nexus CRM Lite

AI-assisted lead scoring & sentiment-aware ticket triage for small
businesses — built to **PRD v3.0** (`NexusCRM_Lite_PRD_v3.0.docx`, ₹5,000
hard budget cap, zero-infrastructure-cost by design). See
[`docs/CHANGELOG_V3.md`](docs/CHANGELOG_V3.md) for what this replaced and
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the system design.

- **Web app**: Next.js 14 (App Router) + TypeScript + Tailwind + shadcn-style
  UI + NextAuth + Prisma over **PostgreSQL**.
- **AI**: a real trained model (scikit-learn/XGBoost + SHAP) and VADER
  sentiment, served by a separate FastAPI inference service — not rules
  dressed up as ML. See [`ml-service/README.md`](ml-service/README.md).

---

## Quick start — Docker (recommended)

```bash
cp .env.example .env    # then set NEXTAUTH_SECRET — openssl rand -base64 32
docker compose up --build -d
docker exec $(docker compose ps -q web) npx prisma db seed
```

Open **http://localhost:3000** and sign in:

| Email                       | Password   | Role  |
|------------------------------|------------|-------|
| `owner@nexuscrmlite.test`   | `demo1234` | OWNER |
| `staff@nexuscrmlite.test`   | `demo1234` | STAFF |

`ml-service` is reachable at `http://localhost:8001` on the host (its
health check reports `model_loaded: true` once training finishes as part
of the image build). No CI/CD, staging, or cloud deployment is set up in
this pass — see `docs/ARCHITECTURE.md`'s "known limitations."

## Quick start — local (no Docker)

```bash
docker compose up -d postgres     # only Postgres, via Docker (PRD §11.1)
npm install
cp .env.example .env              # then set NEXTAUTH_SECRET
npm run setup                     # prisma generate + migrate dev + seed
npm run dev
```

To exercise the real AI tier locally (rather than the degraded fallback —
see `docs/ARCHITECTURE.md`):

```bash
cd ml-service
python -m venv venv && venv\Scripts\activate
pip install -r requirements.txt
python train_lead_score.py
uvicorn main:app --port 8001
```

---

## PRD requirement → code map

| Requirement | Where it lives |
|---|---|
| FR-01 Lead CRUD | `app/api/leads/**`, `app/dashboard/leads/**` |
| FR-02 Lead → Contact + Deal conversion | `lib/services/conversion.service.ts`, `app/api/leads/[id]/convert` |
| FR-03 Deal pipeline (5-column board) | `app/api/deals/**`, `app/dashboard/deals`, `components/deals/DealPipelineClient.tsx` |
| FR-04 Ticketing | `app/api/tickets/**`, `app/dashboard/tickets` |
| FR-05 CSV import/export | `lib/services/csv.service.ts`, `app/api/leads/import`, `?format=csv` on list endpoints |
| FR-06 Unified customer record | `lib/services/contact.service.ts`, `app/dashboard/contacts/[id]` — the flagship screen |
| FR-AI-01 Lead scoring (trained model) | `ml-service/train_lead_score.py`, `POST /score-lead` |
| FR-AI-02 Sentiment triage (VADER) | `ml-service/main.py`, `POST /sentiment` |
| FR-AI-03 SHAP top drivers | `ml-service/main.py` (`_top_drivers`), `train_lead_score.py` |
| FR-AI-04 AI assistant (P2 stretch) | **Not implemented this pass** — see `docs/CHANGELOG_V3.md` |
| FR-07 Auth (bcrypt) | `lib/auth.ts`, `middleware.ts`, `app/login` |
| FR-08 Owner/Staff row-level access | `lib/services/*.ts` (`scopeWhere`), enforced per-service |

---

## Testing

```bash
npm test                  # unit tests
npm run test:coverage     # + enforce 60% threshold (§10.3)
npm run test:integration  # real Postgres — see docs/TESTING.md for one-time setup

cd ml-service && python -m pytest --cov=. --cov-fail-under=70
```

Full testing story, coverage numbers, and the manual UAT script:
[`docs/TESTING.md`](docs/TESTING.md), [`docs/UAT_CHECKLIST.md`](docs/UAT_CHECKLIST.md).

## Scripts

| Command | Description |
|---|---|
| `npm run dev` / `build` / `start` | Next.js dev/build/prod |
| `npm run setup` | Generate client, run migrations, seed |
| `npm run db:migrate` | `prisma migrate dev` |
| `npm run db:seed` | Seed demo data |
| `npm run db:reset` | Wipe + recreate + reseed |
| `npm run lint` / `format` / `typecheck` | ESLint / Prettier / `tsc --noEmit` |

---

## Budget compliance (PRD §2)

Every infrastructure choice is ₹0: Postgres/FastAPI/Next.js run locally via
Docker Compose (no cloud account); the AI tier is a locally-trained model,
not a paid API. No deployment has been performed in this pass (deferred by
explicit instruction), so no hosting cost has been incurred either. When a
deployed demo is picked up later, PRD §5.3's free tiers (Vercel, Render,
Neon/Supabase) keep it at ₹0 too.

## Honest scope notes

- **AI has a documented degraded-mode fallback** (`lib/ai-client.ts`) that
  keeps the app usable if `ml-service` isn't running, but does **not**
  itself satisfy FR-AI-01/02 — see `docs/ARCHITECTURE.md`.
- **FR-AI-04** (the P2/stretch AI assistant) is deferred, not implemented.
- **No CI/CD or cloud deployment** in this pass — Docker containerization
  only, per explicit scope for this restructuring effort.
- Known CVEs in Next.js 14.2.35 (fixed only by a breaking major upgrade)
  are disclosed in `docs/ARCHITECTURE.md` rather than silently carried.
