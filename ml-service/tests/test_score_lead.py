from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def _score(features):
    return client.post("/score-lead", json={"lead_features": features})


def test_contract_shape():
    res = _score({"hasEmail": True, "hasPhone": True, "source": "Referral", "daysSinceCreated": 5, "status": "CONTACTED"})
    assert res.status_code == 200
    body = res.json()
    assert set(body.keys()) == {"score", "top_drivers"}
    assert 1 <= body["score"] <= 99
    assert isinstance(body["top_drivers"], list)
    assert 1 <= len(body["top_drivers"]) <= 3
    assert all(isinstance(d, str) for d in body["top_drivers"])


def test_high_propensity_scores_above_low_propensity():
    high = _score(
        {"hasEmail": True, "hasPhone": True, "source": "Referral", "daysSinceCreated": 5, "status": "CONTACTED"}
    ).json()
    low = _score(
        {"hasEmail": False, "hasPhone": False, "source": "Cold Outreach", "daysSinceCreated": 60, "status": "NEW"}
    ).json()
    assert high["score"] > low["score"]


def test_driver_labels_reflect_actual_presence_not_default_phrasing():
    """Regression test — SHAP one-hot/scaled features must be labeled by the
    lead's actual state, not always phrased as "present" (see main.py's
    _top_drivers docstring for the bug this guards against)."""
    res = _score(
        {"hasEmail": False, "hasPhone": False, "source": "Cold Outreach", "daysSinceCreated": 60, "status": "NEW"}
    ).json()
    joined = " ".join(res["top_drivers"])
    assert "No email address on file" in joined or "No phone number on file" in joined
    assert "Has a verified email address on file" not in joined
    assert "Has a phone number on file" not in joined


def test_unknown_source_and_status_degrade_gracefully():
    # OneHotEncoder(handle_unknown="ignore") — an out-of-training category
    # (e.g. status the app could send after PATCHing a lead to LOST) must
    # not crash the endpoint.
    res = _score({"hasEmail": True, "hasPhone": True, "source": "Unknown Channel", "daysSinceCreated": 5, "status": "LOST"})
    assert res.status_code == 200


def test_missing_optional_fields_use_defaults():
    res = _score({"hasEmail": True, "hasPhone": False})
    assert res.status_code == 200
