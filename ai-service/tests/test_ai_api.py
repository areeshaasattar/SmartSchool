from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)
valid_context = {
    "schoolId": "school-1",
    "userId": "user-1",
    "roles": ["teacher"],
    "requestType": "school_policy_query",
    "payload": {},
    "authorizedContext": {},
}


def test_process_rejects_missing_or_invalid_service_key(monkeypatch):
    monkeypatch.setenv("AI_SERVICE_KEY", "test-service-key")

    assert client.post("/ai/process", json=valid_context).status_code == 401
    assert client.post("/ai/process", headers={"X-Service-Key": "wrong"}, json=valid_context).status_code == 401


def test_process_rejects_malformed_context(monkeypatch):
    monkeypatch.setenv("AI_SERVICE_KEY", "test-service-key")
    malformed = {**valid_context, "payload": "not-an-object"}

    response = client.post("/ai/process", headers={"X-Service-Key": "test-service-key"}, json=malformed)

    assert response.status_code == 422


def test_process_requires_a_query_for_rag_request_types(monkeypatch):
    """RAG-backed request types validate payload.query and fail with status=error
    (not the old placeholder 'ok') when the query is missing or empty."""
    monkeypatch.setenv("AI_SERVICE_KEY", "test-service-key")

    response = client.post("/ai/process", headers={"X-Service-Key": "test-service-key"}, json=valid_context)

    assert response.status_code == 200
    assert response.json()["requestType"] == valid_context["requestType"]
    assert response.json()["status"] == "error"
    assert "query" in response.json()["result"]["answer"].lower()
