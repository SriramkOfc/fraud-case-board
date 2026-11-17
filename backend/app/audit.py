"""Turn the difference between two boards into audit trail entries, one per change to a case."""

from typing import Literal

from pydantic import BaseModel

from app.models import BoardData

Actor = Literal["analyst", "ai"]

FIELD_LABELS = {
    "title": "title",
    "details": "notes",
    "alertType": "alert type",
    "risk": "risk",
    "customerName": "customer",
    "accountLast4": "account",
    "amount": "amount",
}


class Change(BaseModel):
    cardId: str
    title: str
    action: Literal["created", "edited", "moved", "archived", "restored", "deleted"]
    detail: str


class Event(Change):
    actor: Actor
    at: str


def _stages(board: BoardData) -> dict[str, str]:
    """Card id -> stage title."""
    return {card_id: column.title for column in board.columns for card_id in column.cardIds}


def _edit_detail(old: dict, new: dict) -> str | None:
    parts = []
    for field, label in FIELD_LABELS.items():
        if old[field] == new[field]:
            continue
        if field == "risk":
            parts.append(f"risk {old[field]} to {new[field]}")
        elif field == "amount":
            parts.append(f"amount ${old[field]:,.2f} to ${new[field]:,.2f}")
        else:
            parts.append(label)
    return "Changed " + ", ".join(parts) if parts else None


def changes(old: BoardData, new: BoardData) -> list[Change]:
    old_stages, new_stages = _stages(old), _stages(new)
    result: list[Change] = []
    for card_id, card in new.cards.items():
        prev = old.cards.get(card_id)
        add = lambda action, detail: result.append(  # noqa: E731
            Change(cardId=card_id, title=card.title, action=action, detail=detail)
        )
        if prev is None:
            add("created", f"Created in {new_stages[card_id]} ({card.risk} risk)")
            continue
        if old_stages[card_id] != new_stages[card_id]:
            add("moved", f"Moved from {old_stages[card_id]} to {new_stages[card_id]}")
        edit = _edit_detail(prev.model_dump(), card.model_dump())
        if edit:
            add("edited", edit)
        if card.archivedAt and not prev.archivedAt:
            add("archived", "Archived")
        if prev.archivedAt and not card.archivedAt:
            add("restored", f"Restored to {new_stages[card_id]}")
    for card_id in old.cards.keys() - new.cards.keys():
        result.append(Change(cardId=card_id, title=old.cards[card_id].title, action="deleted", detail="Permanently deleted"))
    return result
