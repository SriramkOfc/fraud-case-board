from app.seed import SEED_BOARD
from tests.test_board import URL, column, new_card, seed


def history(client, card_id: str) -> list[dict]:
    return client.get(f"/api/users/user/cards/{card_id}/history").json()


def test_first_save_is_the_baseline(client):
    client.put(URL, json=seed())
    assert history(client, "card-1") == []


def test_records_each_change_by_the_analyst(client):
    client.get(URL)
    board = seed()
    board["cards"]["card-new"] = new_card("card-new", "Mule account inflows")
    column(board, "col-alert")["cardIds"].append("card-new")
    column(board, "col-review")["cardIds"].remove("card-3")
    column(board, "col-investigation")["cardIds"].append("card-3")
    board["cards"]["card-1"]["risk"] = "critical"
    board["cards"]["card-1"]["amount"] = 2000
    board["cards"]["card-1"]["details"] = "More declines"
    board["cards"]["card-8"]["archivedAt"] = "2026-11-17T10:00:00Z"
    client.put(URL, json=board)

    assert [(e["action"], e["detail"], e["actor"]) for e in history(client, "card-new")] == [
        ("created", "Created in Alert Triggered (medium risk)", "analyst")
    ]
    assert history(client, "card-3")[0]["detail"] == "Moved from Review to Investigation"
    assert history(client, "card-1")[0]["detail"] == "Changed notes, risk medium to critical, amount $1,260.00 to $2,000.00"
    assert history(client, "card-8")[0]["action"] == "archived"
    assert history(client, "card-2") == []

    board["cards"]["card-8"]["archivedAt"] = None
    client.put(URL, json=board)
    del board["cards"]["card-new"]
    column(board, "col-alert")["cardIds"].remove("card-new")
    client.put(URL, json=board)

    assert [e["detail"] for e in history(client, "card-8")] == ["Restored to Decision", "Archived"]
    assert history(client, "card-new")[0]["action"] == "deleted"
    assert history(client, "card-new")[0]["title"] == "Mule account inflows"


def test_records_ai_changes_applied_by_the_analyst(client):
    client.get(URL)
    board = seed()
    board["cards"]["card-2"]["title"] = "ATO confirmed: wire recalled"
    assert client.put(f"{URL}?actor=ai", json=board).status_code == 200
    [event] = history(client, "card-2")
    assert event["actor"] == "ai"
    assert event["title"] == "ATO confirmed: wire recalled"
    assert event["at"].endswith("Z")


def test_rejects_unknown_actor(client):
    assert client.put(f"{URL}?actor=admin", json=SEED_BOARD.model_dump()).status_code == 422


def test_unchanged_save_records_nothing(client):
    client.get(URL)
    client.put(URL, json=seed())
    assert all(history(client, card_id) == [] for card_id in SEED_BOARD.cards)
