import os
from types import SimpleNamespace

import pytest

from app import ai
from app.seed import SEED_BOARD
from tests.test_board import column, new_card, seed


def test_ai_test_returns_model_answer(client, monkeypatch):
    monkeypatch.setattr(ai, "ask", lambda prompt: f"answer to {prompt}")
    response = client.post("/api/ai/test")
    assert response.status_code == 200
    assert response.json() == {"answer": "answer to What is 2+2?"}


@pytest.mark.skipif(not os.environ.get("OPENROUTER_API_KEY"), reason="no OPENROUTER_API_KEY")
def test_ai_test_live(client):
    response = client.post("/api/ai/test")
    assert response.status_code == 200
    assert "4" in response.json()["answer"]


CHAT_URL = "/api/users/user/chat"
BOARD_URL = "/api/users/user/board"


@pytest.fixture
def fake_ai(monkeypatch):
    """Replace the OpenRouter client; `fake_ai.reply` is what the model returns, `fake_ai.calls` records requests."""

    class Fake:
        reply: dict = {"reply": "No changes needed.", "board": None}
        calls: list[dict] = []

        def parse(self, **kwargs):
            self.calls.append(kwargs)
            parsed = ai.ChatReply.model_validate(self.reply)
            return SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(parsed=parsed))])

    fake = Fake()
    fake.calls = []
    monkeypatch.setattr(ai, "client", lambda: SimpleNamespace(chat=SimpleNamespace(completions=fake)))
    return fake


def stage_of(board: dict, card_id: str) -> str:
    return next(c["id"] for c in board["columns"] if card_id in c["cardIds"])


def test_chat_reply_only_leaves_board_unchanged(client, fake_ai):
    before = client.get(BOARD_URL).json()
    response = client.post(CHAT_URL, json={"message": "Which case has the highest amount?"})
    assert response.status_code == 200
    assert response.json() == {"reply": "No changes needed.", "board": None}
    assert client.get(BOARD_URL).json() == before


def test_chat_sends_system_prompt_board_history_and_message(client, fake_ai):
    history = [{"role": "user", "content": "Hi"}, {"role": "assistant", "content": "Hello analyst"}]
    client.post(CHAT_URL, json={"message": "Summarise the board", "history": history})
    call = fake_ai.calls[0]
    assert call["model"] == ai.MODEL
    assert call["response_format"] is ai.ChatReply
    system, *rest = call["messages"]
    assert system["role"] == "system"
    assert "Investigation (col-investigation)" in system["content"]
    assert SEED_BOARD.model_dump_json() in system["content"]
    assert rest == [*history, {"role": "user", "content": "Summarise the board"}]


def test_chat_creates_edits_and_moves_multiple_cases(client, fake_ai):
    board = seed()
    new = new_card("card-ai-1", "Card testing burst")
    new["createdAt"] = new["updatedAt"] = "1999-01-01T00:00:00Z"  # model timestamps are not trusted
    board["cards"]["card-ai-1"] = new
    column(board, "col-alert")["cardIds"].append("card-ai-1")
    board["cards"]["card-1"]["details"] = "Escalated: 3 more declines"
    column(board, "col-review")["cardIds"].remove("card-3")
    column(board, "col-investigation")["cardIds"].append("card-3")
    fake_ai.reply = {"reply": "Done.", "board": board}

    response = client.post(CHAT_URL, json={"message": "Create, edit and move"})
    assert response.status_code == 200
    saved = client.get(BOARD_URL).json()
    assert response.json()["board"] == saved
    cards, original = saved["cards"], SEED_BOARD.cards

    assert stage_of(saved, "card-ai-1") == "col-alert"
    assert cards["card-ai-1"]["createdAt"] == cards["card-ai-1"]["updatedAt"] != "1999-01-01T00:00:00Z"
    now = cards["card-ai-1"]["createdAt"]
    assert now.endswith("Z")

    assert cards["card-1"]["details"] == "Escalated: 3 more declines"
    assert cards["card-1"]["createdAt"] == original["card-1"].createdAt
    assert cards["card-1"]["updatedAt"] == now

    assert stage_of(saved, "card-3") == "col-investigation"
    assert cards["card-3"]["updatedAt"] == now

    assert cards["card-2"]["updatedAt"] == original["card-2"].updatedAt


def test_chat_ignores_model_timestamps_on_unchanged_cases(client, fake_ai):
    board = seed()
    board["cards"]["card-2"]["updatedAt"] = "1999-01-01T00:00:00Z"
    board["cards"]["card-2"]["createdAt"] = "1999-01-01T00:00:00Z"
    fake_ai.reply = {"reply": "Done.", "board": board}
    saved = client.post(CHAT_URL, json={"message": "x"}).json()["board"]
    assert saved["cards"]["card-2"]["updatedAt"] == SEED_BOARD.cards["card-2"].updatedAt
    assert saved["cards"]["card-2"]["createdAt"] == SEED_BOARD.cards["card-2"].createdAt


def test_chat_archives_and_restores(client, fake_ai):
    board = seed()
    board["cards"]["card-8"]["archivedAt"] = "1999-01-01T00:00:00Z"
    fake_ai.reply = {"reply": "Archived.", "board": board}
    saved = client.post(CHAT_URL, json={"message": "Archive the false positive"}).json()["board"]
    archived_at = saved["cards"]["card-8"]["archivedAt"]
    assert archived_at not in (None, "1999-01-01T00:00:00Z")
    assert saved["cards"]["card-8"]["updatedAt"] == archived_at
    assert stage_of(saved, "card-8") == "col-decision"

    saved["cards"]["card-8"]["archivedAt"] = None
    fake_ai.reply = {"reply": "Restored.", "board": saved}
    restored = client.post(CHAT_URL, json={"message": "Restore it"}).json()["board"]
    assert restored["cards"]["card-8"]["archivedAt"] is None
    assert stage_of(restored, "card-8") == "col-decision"


def test_chat_keeps_archive_date_of_already_archived_case(client, fake_ai):
    board = seed()
    board["cards"]["card-8"]["archivedAt"] = "2026-11-16T12:00:00Z"
    client.put(BOARD_URL, json=board)
    board["cards"]["card-8"]["archivedAt"] = "1999-01-01T00:00:00Z"
    fake_ai.reply = {"reply": "Done.", "board": board}
    saved = client.post(CHAT_URL, json={"message": "x"}).json()["board"]
    assert saved["cards"]["card-8"]["archivedAt"] == "2026-11-16T12:00:00Z"
    assert saved["cards"]["card-8"]["updatedAt"] == SEED_BOARD.cards["card-8"].updatedAt


def test_chat_rejects_invalid_board(client, fake_ai):
    before = client.get(BOARD_URL).json()
    board = seed()
    board["columns"].pop()
    fake_ai.reply = {"reply": "Done.", "board": board}
    response = client.post(CHAT_URL, json={"message": "x"})
    assert response.status_code == 502
    assert client.get(BOARD_URL).json() == before


def test_chat_rejects_board_that_removes_a_case(client, fake_ai):
    before = client.get(BOARD_URL).json()
    board = seed()
    del board["cards"]["card-8"]
    column(board, "col-decision")["cardIds"].remove("card-8")
    fake_ai.reply = {"reply": "Deleted.", "board": board}
    response = client.post(CHAT_URL, json={"message": "Delete the false positive"})
    assert response.status_code == 502
    assert "card-8" in response.json()["detail"]
    assert client.get(BOARD_URL).json() == before


@pytest.mark.skipif(not os.environ.get("OPENROUTER_API_KEY"), reason="no OPENROUTER_API_KEY")
def test_chat_live_moves_case(client):
    response = client.post(CHAT_URL, json={"message": "Move the geo-mismatch case to Investigation"})
    assert response.status_code == 200
    assert stage_of(client.get(BOARD_URL).json(), "card-3") == "col-investigation"
