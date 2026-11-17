def test_health(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_serves_index(client):
    response = client.get("/")
    assert response.status_code == 200
    assert "Fraud Case Board" in response.text


def test_rejects_invalid_username(client):
    assert client.get("/api/users/bad%20name/board").status_code == 422
    assert client.get(f"/api/users/{'a' * 65}/board").status_code == 422


def test_rejects_oversized_chat(client):
    response = client.post("/api/users/user/chat", json={"message": "x" * 2001, "history": []})
    assert response.status_code == 422
    history = [{"role": "user", "content": "hi"}] * 21
    response = client.post("/api/users/user/chat", json={"message": "hi", "history": history})
    assert response.status_code == 422
