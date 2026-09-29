from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_health_reports_model_loaded():
    """Artifact-load sanity check (§10.2) — the trained model from
    train_lead_score.py must actually be present, not just importable."""
    res = client.get("/")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "ok"
    assert body["model_loaded"] is True
