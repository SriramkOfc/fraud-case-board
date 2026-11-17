import { exposure, moveCard, type Column } from "@/lib/kanban";
import { sampleBoard } from "@/test/board";

describe("moveCard", () => {
  const baseColumns: Column[] = [
    { id: "col-a", title: "A", cardIds: ["card-1", "card-2"] },
    { id: "col-b", title: "B", cardIds: ["card-3"] },
  ];

  it("reorders cards in the same column", () => {
    const result = moveCard(baseColumns, "card-2", "card-1");
    expect(result[0].cardIds).toEqual(["card-2", "card-1"]);
  });

  it("moves cards to another column", () => {
    const result = moveCard(baseColumns, "card-2", "card-3");
    expect(result[0].cardIds).toEqual(["card-1"]);
    expect(result[1].cardIds).toEqual(["card-2", "card-3"]);
  });

  it("drops cards to the end of a column", () => {
    const result = moveCard(baseColumns, "card-1", "col-b");
    expect(result[0].cardIds).toEqual(["card-2"]);
    expect(result[1].cardIds).toEqual(["card-3", "card-1"]);
  });
});

describe("exposure", () => {
  it("sums active cases that have not reached a decision", () => {
    expect(exposure(sampleBoard)).toEqual({ openCases: 6, amount: 68005.85, highRisk: 3 });
    const board = structuredClone(sampleBoard);
    board.cards["card-5"].archivedAt = "2026-11-17T10:00:00Z";
    expect(exposure(board)).toMatchObject({ openCases: 5, highRisk: 2 });
    expect(exposure(board).amount).toBeCloseTo(25705.85);
  });
});
