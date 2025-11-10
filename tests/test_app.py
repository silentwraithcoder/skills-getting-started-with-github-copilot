import uuid
from urllib.parse import quote

from fastapi.testclient import TestClient

from src.app import app


client = TestClient(app)


def test_get_activities():
    resp = client.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, dict)
    # basic sanity check: repository includes Chess Club
    assert "Chess Club" in data


def test_signup_and_unregister_flow():
    activity = "Chess Club"
    activity_q = quote(activity, safe="")
    test_email = f"test_{uuid.uuid4().hex[:8]}@example.com"

    # Signup should succeed
    resp = client.post(f"/activities/{activity_q}/signup?email={test_email}")
    assert resp.status_code == 200
    assert test_email in client.get("/activities").json()[activity]["participants"]

    # Duplicate signup should return 400
    resp_dup = client.post(f"/activities/{activity_q}/signup?email={test_email}")
    assert resp_dup.status_code == 400

    # Unregister should succeed
    resp_unreg = client.delete(f"/activities/{activity_q}/participants?email={test_email}")
    assert resp_unreg.status_code == 200
    assert test_email not in client.get("/activities").json()[activity]["participants"]
