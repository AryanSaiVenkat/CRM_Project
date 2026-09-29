# Nexus CRM Lite — ML inference service (FastAPI). Local dev/demo image
# only, per PRD v3.0 §11.1 — matches the "Render free tier" service in
# production shape, but no deployment happens in this pass.

FROM python:3.12-slim
WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Bakes training into the image build so the model artifact exists without
# being committed to git (models/*.joblib is gitignored) — full
# reproducibility from `git clone` + `docker build` alone, at the cost of a
# slower image build. Re-run manually with:
#   docker compose run --rm ml-service python train_lead_score.py
RUN python train_lead_score.py

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
