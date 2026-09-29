# Inference Service (FastAPI)

Python microservice implementing **FR-AI-01/02/03** (PRD v3.0 §5.2, §7.3):
a real trained lead-scoring model (not rules dressed as ML) with SHAP-based
explanations, and VADER-based sentiment triage. Matches the PRD's two-tier
architecture (Next.js web + Python inference).

`lib/ai-client.ts` in the web app calls here when `ML_SERVICE_URL` is set
and reachable; otherwise it degrades to a local heuristic that does **not**
by itself satisfy FR-AI-01/02 — see `docs/ARCHITECTURE.md`.

## Run locally

```bash
cd ml-service
python -m venv venv && venv\Scripts\activate   # macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
python train_lead_score.py        # trains the model, writes models/lead_score_model.joblib
uvicorn main:app --reload --port 8000
```

Open http://localhost:8000/docs for the interactive API. Health check at
`GET /` reports `model_loaded`.

## Run via Docker

`docker compose up ml-service` builds the image and trains the model as
part of the build (see `Dockerfile`) — no separate step needed. Retrain
manually with:

```bash
docker compose run --rm ml-service python train_lead_score.py
```

## Endpoints (PRD §7.3, exact)

| Method | Path          | Purpose                                             |
|--------|---------------|------------------------------------------------------|
| POST   | `/score-lead` | 0–100 lead score + top 2–3 plain-language SHAP drivers |
| POST   | `/sentiment`  | `POSITIVE`/`NEUTRAL`/`NEGATIVE` + confidence (VADER)  |
| GET    | `/`           | Health check + `model_loaded` status                 |

## Model training (`train_lead_score.py`)

Fixed-seed (`42`) synthetic dataset — reproducible from a `git clone` alone,
no external download. Compares Logistic Regression, Random Forest, and
XGBoost via 5-fold cross-validation, selects the best by mean CV AUC-ROC,
and reports the winner's **held-out test AUC-ROC against a naive
rules-based baseline** (FR-AI-01's acceptance criterion). Writes:

- `models/lead_score_model.joblib` — the fitted pipeline + SHAP explainer (gitignored, rebuilt by the Docker image or a local run)
- `models/training_report.json` — machine-readable metrics
- `RESULTS.md` — human-readable report, **committed** to the repo

Current result: Random Forest **0.657** AUC-ROC vs. the rules baseline's
**0.640** — a genuine, honestly-reported improvement (see `RESULTS.md`'s
noted limitation: the Lead schema's minimal feature set caps the achievable
signal).

Not the same thing as **Publication 1** (PRD §12.1) — that's a separate
research-track experiment using a real public dataset across
200/500/1000/5000-row tiers and a 4th model family (neural net); this
script produces the app's production artifact.

## Tests

```bash
python -m pytest --cov=. --cov-fail-under=70
```

See `docs/TESTING.md` for the full testing story across both tiers.
