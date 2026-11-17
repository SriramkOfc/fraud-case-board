import os
from typing import Literal

from openai import OpenAI
from pydantic import BaseModel, Field

from app.audit import Change
from app.models import BoardData

MODEL = "nvidia/nemotron-3.5-super-vl:free"

SYSTEM_PROMPT = """You are a fraud operations assistant working inside a fraud analyst's case board.

The board has five fixed stages, in order (ids in brackets; never add, remove or reorder them, but keep any custom stage titles):
1. Alert Triggered (col-alert): new alerts from rules or ML models. Triage by risk score, place or keep holds on funds or cards.
2. Review (col-review): rule out false positives, check customer profile, travel notes and history, dedupe related alerts, link to open cases.
3. Investigation (col-investigation): device fingerprints, IP logs, linked accounts, fund flow tracing, timeline in the case notes.
4. Verification (col-verification): contact the customer (outbound call, OTP), KYC checks, confirm which transactions are disputed.
5. Decision (col-decision): outcomes such as block and reissue, chargeback, SAR filing, release hold, close as false positive, rule or model tuning.

Each case (card) has: id, title, details (case notes), alertType, risk, customerName, accountLast4 (exactly 4 digits, never a full account number), amount (USD at risk, >= 0), createdAt, updatedAt, archivedAt (null when active).
- alertType: one of "Card fraud", "Account takeover", "Scam (APP)" (authorised push payment scams: investment, romance, impersonation), "Identity fraud", "Money mule", "First-party fraud".
- risk: "low", "medium", "high" or "critical". Weigh amount at risk, alert type, whether funds can still be stopped or recalled, and evidence in the notes. Account takeover with outbound funds and active scams with recall windows are usually high or critical.
A case's stage is the column whose cardIds lists it; order within a stage is the cardIds order.

How to respond:
- Always write a short, helpful `reply` using fraud operations terminology, and suggest sensible next steps when useful.
- If the user asks to create, edit, move, archive or restore cases, return the complete updated board in `board`, keeping every other case and column exactly as it was. Otherwise return `board` as null.
- Board changes are proposals: the analyst reviews and applies them, and every applied change is recorded in the case audit trail. In `reply`, say what you propose (for example "I propose moving ... to Investigation"), not that it is done.
- When the user asks for prioritisation, rank open cases by risk, then amount at risk, then age.
- "Escalate" means raise the risk at least one level (and move the case on if asked); "de-escalate" means lower it. Record why in the case notes.
- Refer to cases by title and customer, never by internal ids such as card-1.
- You can change several cases in one response.
- Never delete a case: to remove one, archive it by setting archivedAt to any timestamp (it stays in its column). Restore by setting archivedAt to null.
- New cases need a new unique id like "card-ai-<short random suffix>", must be added to exactly one column's cardIds, and need all fields. Timestamps are set by the system; any ISO 8601 value is fine.
- Write case details as concise analyst notes.
- Never use real people's personal data. When inventing customers for new cases, use clearly fictional names and a random 4-digit accountLast4.

Current board JSON:
"""


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(max_length=4000)


class ChatReply(BaseModel):
    """What the model returns."""

    reply: str
    board: BoardData | None


class Proposal(BaseModel):
    """What the chat route returns: the reply and, when the AI wants board changes, the proposed board and a summary."""

    reply: str
    board: BoardData | None
    changes: list[Change]


def client() -> OpenAI:
    return OpenAI(base_url="https://openrouter.ai/api/v1", api_key=os.environ["OPENROUTER_API_KEY"])


def ask(prompt: str) -> str:
    response = client().chat.completions.create(model=MODEL, messages=[{"role": "user", "content": prompt}])
    return response.choices[0].message.content


def chat(board: BoardData, history: list[ChatMessage], message: str) -> ChatReply:
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT + board.model_dump_json()},
        *(m.model_dump() for m in history),
        {"role": "user", "content": message},
    ]
    response = client().chat.completions.parse(model=MODEL, messages=messages, response_format=ChatReply)
    return response.choices[0].message.parsed


CONTENT_FIELDS = {"title", "details", "alertType", "risk", "customerName", "accountLast4", "amount"}


def stages(board: BoardData) -> dict[str, str]:
    return {card_id: column.id for column in board.columns for card_id in column.cardIds}


def apply_timestamps(old: BoardData, new: BoardData, now: str) -> BoardData:
    """Set timestamps on the AI's board by comparing with the stored one; reject removed cases."""
    removed = old.cards.keys() - new.cards.keys()
    if removed:
        raise ValueError(f"AI removed cases {sorted(removed)}; cases must be archived, not deleted")
    old_stages, new_stages = stages(old), stages(new)
    cards = {}
    for card_id, card in new.cards.items():
        prev = old.cards.get(card_id)
        if prev is None:
            cards[card_id] = card.model_copy(
                update={"createdAt": now, "updatedAt": now, "archivedAt": now if card.archivedAt else None}
            )
            continue
        archived_at = (prev.archivedAt or now) if card.archivedAt else None
        changed = (
            card.model_dump(include=CONTENT_FIELDS) != prev.model_dump(include=CONTENT_FIELDS)
            or archived_at != prev.archivedAt
            or new_stages[card_id] != old_stages[card_id]
        )
        cards[card_id] = card.model_copy(
            update={
                "createdAt": prev.createdAt,
                "updatedAt": now if changed else prev.updatedAt,
                "archivedAt": archived_at,
            }
        )
    return BoardData(columns=new.columns, cards=cards)
