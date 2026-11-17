import copy
import sqlite3
from contextlib import closing

import pytest

from app.seed import SEED_BOARD

URL = "/api/users/user/board"


def seed() -> dict:
    return copy.deepcopy(SEED_BOARD.model_dump())


def new_card(card_id: str, title: str) -> dict:
    return {
        "id": card_id,
        "title": title,
        "details": "Merchant 88",
        "alertType": "Card fraud",
        "risk": "medium",
        "customerName": "Test Customer",
        "accountLast4": "1234",
        "amount": 250.5,
        "createdAt": "2026-11-16T10:00:00Z",
        "updatedAt": "2026-11-16T10:00:00Z",
        "archivedAt": None,
    }


def column(board: dict, column_id: str) -> dict:
    return next(c for c in board["columns"] if c["id"] == column_id)


def test_creates_database_and_tables_when_missing(client, db_path):
    assert db_path.exists()
    with closing(sqlite3.connect(db_path)) as conn:
        tables = {row[0] for row in conn.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    assert {"users", "boards"} <= tables


def test_first_read_seeds_fraud_board(client, db_path):
    board = client.get(URL).json()
    assert board["cards"]["card-2"]["customerName"] == "Priya Sharma"
    assert board["cards"]["card-2"]["accountLast4"] == "7310"
    assert board["cards"]["card-2"]["amount"] == 18500
    assert [c["title"] for c in board["columns"]] == [
        "Alert Triggered", "Review", "Investigation", "Verification", "Decision",
    ]
    assert len(board["cards"]) == 8
    with closing(sqlite3.connect(db_path)) as conn:
        assert conn.execute("SELECT username FROM users").fetchall() == [("user",)]
        assert conn.execute("SELECT COUNT(*) FROM boards").fetchone()[0] == 1


def test_second_read_does_not_reseed(client, db_path):
    client.get(URL)
    client.get(URL)
    with closing(sqlite3.connect(db_path)) as conn:
        assert conn.execute("SELECT COUNT(*) FROM boards").fetchone()[0] == 1


def test_rename_stage_round_trips(client):
    board = seed()
    column(board, "col-review")["title"] = "Triage"
    assert client.put(URL, json=board).status_code == 200
    assert column(client.get(URL).json(), "col-review")["title"] == "Triage"


def test_add_edit_delete_and_move_cases_round_trip(client):
    board = seed()
    board["cards"]["card-new"] = new_card("card-new", "Chargeback spike")
    column(board, "col-alert")["cardIds"].append("card-new")
    board["cards"]["card-1"]["title"] = "Escalated velocity alert"
    del board["cards"]["card-8"]
    column(board, "col-decision")["cardIds"].remove("card-8")
    column(board, "col-review")["cardIds"].remove("card-3")
    column(board, "col-investigation")["cardIds"].insert(0, "card-3")

    client.put(URL, json=board)
    saved = client.get(URL).json()

    assert saved == board
    assert column(saved, "col-investigation")["cardIds"] == ["card-3", "card-5"]


def test_archive_and_restore_round_trip(client):
    board = seed()
    board["cards"]["card-6"]["archivedAt"] = "2026-11-16T11:00:00Z"
    client.put(URL, json=board)
    saved = client.get(URL).json()
    assert saved["cards"]["card-6"]["archivedAt"] == "2026-11-16T11:00:00Z"
    assert "card-6" in column(saved, "col-verification")["cardIds"]

    saved["cards"]["card-6"]["archivedAt"] = None
    client.put(URL, json=saved)
    assert client.get(URL).json()["cards"]["card-6"]["archivedAt"] is None


def test_cards_without_archived_at_are_active(client):
    board = seed()
    for card in board["cards"].values():
        del card["archivedAt"]
    assert client.put(URL, json=board).status_code == 200
    assert client.get(URL).json()["cards"]["card-1"]["archivedAt"] is None


def test_reorder_within_stage_round_trips(client):
    board = seed()
    column(board, "col-alert")["cardIds"] = ["card-2", "card-1"]
    client.put(URL, json=board)
    assert column(client.get(URL).json(), "col-alert")["cardIds"] == ["card-2", "card-1"]


def test_save_before_first_read_creates_user(client):
    board = seed()
    board["cards"]["card-1"]["title"] = "Saved first"
    assert client.put("/api/users/newbie/board", json=board).status_code == 200
    assert client.get("/api/users/newbie/board").json()["cards"]["card-1"]["title"] == "Saved first"


def test_users_have_separate_boards(client):
    board = seed()
    board["cards"]["card-1"]["title"] = "Only for alice"
    client.put("/api/users/alice/board", json=board)
    assert client.get("/api/users/bob/board").json()["cards"]["card-1"]["title"] == SEED_BOARD.cards["card-1"].title


def test_board_persists_across_restarts(db_path):
    from fastapi.testclient import TestClient

    from app.main import app

    board = seed()
    board["cards"]["card-1"]["title"] = "Survives restart"
    with TestClient(app) as first:
        first.put(URL, json=board)
    with TestClient(app) as second:
        assert second.get(URL).json()["cards"]["card-1"]["title"] == "Survives restart"


def _missing_stage(board):
    board["columns"].pop()


def _reordered_stages(board):
    board["columns"].reverse()


def _unknown_card_id(board):
    column(board, "col-alert")["cardIds"].append("card-ghost")


def _duplicate_card(board):
    column(board, "col-review")["cardIds"].append("card-1")


def _orphan_card(board):
    board["cards"]["card-orphan"] = new_card("card-orphan", "Orphan")


def _mismatched_key(board):
    board["cards"]["card-1"]["id"] = "card-other"


def _empty_title(board):
    board["cards"]["card-1"]["title"] = ""


def _empty_customer(board):
    board["cards"]["card-1"]["customerName"] = ""


def _full_account_number(board):
    board["cards"]["card-1"]["accountLast4"] = "4111111111114821"


def _non_digit_account(board):
    board["cards"]["card-1"]["accountLast4"] = "48a1"


def _negative_amount(board):
    board["cards"]["card-1"]["amount"] = -1


def _missing_created_at(board):
    del board["cards"]["card-1"]["createdAt"]


@pytest.mark.parametrize(
    "break_board",
    [_missing_stage, _reordered_stages, _unknown_card_id, _duplicate_card, _orphan_card, _mismatched_key, _empty_title,
     _empty_customer, _full_account_number, _non_digit_account, _negative_amount, _missing_created_at],
)
def test_invalid_board_rejected_and_not_saved(client, break_board):
    before = client.get(URL).json()
    board = seed()
    break_board(board)
    assert client.put(URL, json=board).status_code == 422
    assert client.get(URL).json() == before
