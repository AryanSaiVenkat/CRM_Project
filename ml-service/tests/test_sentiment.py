from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def _post(text):
    return client.post("/sentiment", json={"text": text})


def test_contract_shape():
    res = _post("This is fine, no complaints.")
    assert res.status_code == 200
    body = res.json()
    assert set(body.keys()) == {"label", "confidence"}
    assert body["label"] in ("POSITIVE", "NEUTRAL", "NEGATIVE")
    assert 0 <= body["confidence"] <= 1


def test_negative_text():
    res = _post("This is unacceptable, the service failed again and I am extremely frustrated. I want a refund.")
    assert res.json()["label"] == "NEGATIVE"


def test_positive_text():
    res = _post("Thank you so much, the team resolved this quickly. Excellent, wonderful service!")
    assert res.json()["label"] == "POSITIVE"


def test_neutral_text():
    res = _post("Can you confirm the renewal date on the account?")
    assert res.json()["label"] == "NEUTRAL"


def test_empty_text_does_not_error():
    res = _post("")
    assert res.status_code == 200
