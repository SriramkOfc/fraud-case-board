from pydantic import BaseModel, Field, model_validator

STAGE_IDS = ["col-alert", "col-review", "col-investigation", "col-verification", "col-decision"]


class Card(BaseModel):
    id: str
    title: str = Field(min_length=1)
    details: str


class Column(BaseModel):
    id: str
    title: str
    cardIds: list[str]


class BoardData(BaseModel):
    columns: list[Column]
    cards: dict[str, Card]

    @model_validator(mode="after")
    def check_board(self) -> "BoardData":
        if [column.id for column in self.columns] != STAGE_IDS:
            raise ValueError(f"columns must be exactly {STAGE_IDS} in order")
        for key, card in self.cards.items():
            if card.id != key:
                raise ValueError(f"card key {key} does not match card id {card.id}")
        placed = [card_id for column in self.columns for card_id in column.cardIds]
        if sorted(placed) != sorted(self.cards):
            raise ValueError("every card must appear in exactly one column, exactly once")
        return self
