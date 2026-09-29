"""
Nexus CRM Lite — inference microservice (PRD v3.0 §5.2, §7.3).

FastAPI service, separate from the Next.js web tier, matching the PRD's
two-tier architecture (Next.js on Vercel + this service on Render later —
not deployed in this pass, see docs/ARCHITECTURE.md).

Endpoints (PRD §7.3, exact):
  POST /score-lead   { lead_features } -> { score, top_drivers[] }   FR-AI-01/03
  POST /sentiment    { text }          -> { label, confidence }      FR-AI-02

Loads the pre-trained model artifact (see train_lead_score.py) at startup;
if it's missing, /score-lead returns 503 rather than silently degrading —
the Next.js app's lib/ai-client.ts already has its own local fallback for
exactly that case, so this service should fail loud, not quietly wrong.

Run:  uvicorn main:app --reload --port 8000
"""
from __future__ import annotations

import os
from typing import List, Optional

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

app = FastAPI(title="Nexus CRM Lite — Inference Service", version="3.0.0")
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"]
)

_MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "lead_score_model.joblib")
_MODEL_BUNDLE = None
try:
    if os.path.exists(_MODEL_PATH):
        _MODEL_BUNDLE = joblib.load(_MODEL_PATH)
except Exception:
    _MODEL_BUNDLE = None

_VADER = SentimentIntensityAnalyzer()

# Same plain-language templates used during training (train_lead_score.py)
# so live SHAP output and the offline report stay consistent.
FEATURE_LABEL_TEMPLATES = {
    "hasEmail": "Has a verified email address on file",
    "hasPhone": "Has a phone number on file",
    "daysSinceCreated": "Time open since lead creation",
    "source_Referral": "Came in through a referral",
    "source_Website Inbound": "Came in through the website",
    "source_Cold Outreach": "Sourced via cold outreach — lower baseline intent",
    "source_Webinar": "Came in through a webinar",
    "source_Trade Show": "Came in through a trade show",
    "source_LinkedIn": "Came in through LinkedIn",
    "status_CONTACTED": "Already contacted at least once",
    "status_NEW": "Not yet contacted",
}
ABSENT_LABELS = {
    "hasEmail": "No email address on file",
    "hasPhone": "No phone number on file",
}


class LeadFeatures(BaseModel):
    hasEmail: bool
    hasPhone: bool
    source: Optional[str] = None
    daysSinceCreated: float = 0
    status: str = "NEW"


class ScoreLeadIn(BaseModel):
    lead_features: LeadFeatures


class ScoreLeadOut(BaseModel):
    score: float
    top_drivers: List[str]


class SentimentIn(BaseModel):
    text: str


class SentimentOut(BaseModel):
    label: str
    confidence: float


def _features_to_frame(f: LeadFeatures) -> pd.DataFrame:
    return pd.DataFrame(
        [
            {
                "hasEmail": int(f.hasEmail),
                "hasPhone": int(f.hasPhone),
                "source": f.source or "Website Inbound",
                "status": f.status if f.status in ("NEW", "CONTACTED") else "NEW",
                "daysSinceCreated": f.daysSinceCreated,
            }
        ]
    )


def _positive_class_shap_row(shap_values, sample_idx: int = 0) -> np.ndarray:
    """Normalizes SHAP's several possible output shapes to a 1-D
    per-feature array for one sample's positive-class contribution.
    TreeExplainer on a binary classifier can return either a
    (n_samples, n_features) array, a (n_samples, n_features, n_classes)
    array, or a list of per-class arrays, depending on the SHAP version."""
    if isinstance(shap_values, list):
        return np.asarray(shap_values[-1])[sample_idx]
    arr = np.asarray(shap_values)
    if arr.ndim == 3:
        return arr[sample_idx, :, -1]
    return arr[sample_idx]


def _top_drivers(
    shap_row: np.ndarray,
    encoded_values: np.ndarray,
    feature_names: List[str],
    raw_bool_presence: dict,
    top_n: int = 3,
) -> List[str]:
    """Plain-language top drivers (FR-AI-03), ranked by |SHAP contribution|.

    Two correctness subtleties handled here:
    - hasEmail/hasPhone pass through StandardScaler, so their *encoded*
      value is a z-score, not 0/1 — presence must be read from the raw
      request booleans instead, or "no email on file" and "has email on
      file" get mislabeled depending on the scaler's mean.
    - A one-hot categorical column being "off" for this row still carries a
      SHAP value (attribution for NOT being that category), which reads as
      a confusing driver shown in isolation — skipped in favor of whichever
      category IS active for this row.
    """
    order = np.argsort(-np.abs(shap_row))
    drivers: List[str] = []
    for i in order:
        name = feature_names[i]
        contribution = float(shap_row[i])
        if abs(contribution) < 1e-4:
            continue

        if name in raw_bool_presence:
            label = FEATURE_LABEL_TEMPLATES[name] if raw_bool_presence[name] else ABSENT_LABELS[name]
        elif name.startswith("source_") or name.startswith("status_"):
            if float(encoded_values[i]) < 0.5:
                continue  # inactive dummy column — the active category is reported instead
            label = FEATURE_LABEL_TEMPLATES.get(name, name)
        else:
            label = FEATURE_LABEL_TEMPLATES.get(name, name)
            if name == "daysSinceCreated" and contribution < 0:
                label += " — working against conversion"

        drivers.append(label)
        if len(drivers) >= top_n:
            break
    return drivers


@app.get("/")
def health():
    return {"status": "ok", "model_loaded": _MODEL_BUNDLE is not None}


@app.post("/score-lead", response_model=ScoreLeadOut)
def score_lead(inp: ScoreLeadIn):
    if _MODEL_BUNDLE is None:
        raise HTTPException(status_code=503, detail="Lead-scoring model artifact not found — run train_lead_score.py")

    pipeline = _MODEL_BUNDLE["pipeline"]
    explainer = _MODEL_BUNDLE["explainer"]
    feature_names = _MODEL_BUNDLE["feature_names"]

    X = _features_to_frame(inp.lead_features)
    proba = float(pipeline.predict_proba(X)[0, 1])
    score = round(max(1.0, min(99.0, proba * 100)), 1)

    X_enc = pipeline.named_steps["prep"].transform(X)
    if hasattr(X_enc, "toarray"):
        X_enc = X_enc.toarray()

    shap_values = explainer.shap_values(X_enc)
    row = _positive_class_shap_row(shap_values)
    encoded_row = np.asarray(X_enc)[0]
    raw_bool_presence = {"hasEmail": inp.lead_features.hasEmail, "hasPhone": inp.lead_features.hasPhone}

    return ScoreLeadOut(
        score=score, top_drivers=_top_drivers(row, encoded_row, list(feature_names), raw_bool_presence)
    )


@app.post("/sentiment", response_model=SentimentOut)
def sentiment(inp: SentimentIn):
    # FR-AI-02 — VADER, a lightweight rule-based local model with
    # effectively zero resource footprint (PRD §5.3), no API call.
    scores = _VADER.polarity_scores(inp.text or "")
    compound = scores["compound"]
    if compound >= 0.05:
        label = "POSITIVE"
    elif compound <= -0.05:
        label = "NEGATIVE"
    else:
        label = "NEUTRAL"
    return SentimentOut(label=label, confidence=round(abs(compound), 3))
