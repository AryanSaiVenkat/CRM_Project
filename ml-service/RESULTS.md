# Lead-scoring model training report (FR-AI-01)

Fixed seed `42`, 6000 synthetic rows, 4500/1500 train/test split.

| Model | CV AUC-ROC (mean ± std) | Held-out test AUC-ROC |
|---|---|---|
| random_forest **(winner)** | 0.654 ± 0.016 | 0.657 |
| logistic_regression | 0.646 ± 0.016 | 0.662 |
| xgboost | 0.640 ± 0.014 | 0.634 |
| rules-based baseline | — | 0.640 |

**Winner:** `random_forest` — beats the rules-based baseline on held-out test data (0.657 vs 0.640).

Known limitation: the Lead schema (name/email/phone/source/status) is intentionally minimal per PRD v3.0 §7.2, which caps the ceiling on achievable predictive signal — reported honestly rather than tuned to look better than the feature set supports.
