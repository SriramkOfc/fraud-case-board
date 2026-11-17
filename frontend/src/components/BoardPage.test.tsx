import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BoardPage } from "@/components/BoardPage";
import { mockBackend } from "@/test/mockBackend";

// Saves are queued, so let them reach fetch first
const lastSavedBoard = async (fetchMock: ReturnType<typeof mockBackend>) => {
  await new Promise((resolve) => setTimeout(resolve, 0));
  const puts = fetchMock.mock.calls.filter(([, init]) => init?.method === "PUT");
  return JSON.parse(puts.at(-1)![1]!.body as string);
};

describe("BoardPage", () => {
  it("shows a loading state, then the board from the API", async () => {
    const fetchMock = mockBackend();
    render(<BoardPage username="user" onLogout={() => {}} />);
    expect(screen.getByText(/loading cases/i)).toBeInTheDocument();
    expect(await screen.findByText("Velocity rule: 14 card txns in 10 min")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/users/user/board");
  });

  it("saves the whole board when a stage is renamed", async () => {
    const fetchMock = mockBackend();
    render(<BoardPage username="user" onLogout={() => {}} />);
    const input = (await screen.findAllByLabelText("Column title"))[1];
    await userEvent.clear(input);
    await userEvent.type(input, "Triage");

    const saved = await lastSavedBoard(fetchMock);
    expect(saved.columns[1].title).toBe("Triage");
    const puts = fetchMock.mock.calls.filter(([, init]) => init?.method === "PUT");
    expect(puts.every(([url]) => url === "/api/users/user/board?actor=analyst")).toBe(true);
    expect(Object.keys(saved.cards)).toHaveLength(8);
  });

  it("saves added, edited, archived and deleted cases", async () => {
    const fetchMock = mockBackend();
    render(<BoardPage username="user" onLogout={() => {}} />);
    const column = (await screen.findAllByTestId(/column-/i))[0];
    await userEvent.click(within(column).getByRole("button", { name: /add a card/i }));
    await userEvent.type(within(screen.getByRole("dialog")).getByLabelText("Case title"), "Chargeback spike");
    await userEvent.type(within(screen.getByRole("dialog")).getByLabelText("Customer name"), "Ava Chen");
    await userEvent.type(within(screen.getByRole("dialog")).getByLabelText("Account last 4 digits"), "9921");
    await userEvent.type(within(screen.getByRole("dialog")).getByLabelText("Amount at risk"), "1500.5");
    await userEvent.selectOptions(within(screen.getByRole("dialog")).getByLabelText("Alert type"), "Money mule");
    await userEvent.selectOptions(within(screen.getByRole("dialog")).getByLabelText("Risk"), "high");
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: /add card/i }));
    let saved = (await lastSavedBoard(fetchMock));
    const newId = saved.columns[0].cardIds.at(-1);
    expect(saved.cards[newId]).toMatchObject({
      title: "Chargeback spike",
      customerName: "Ava Chen",
      accountLast4: "9921",
      amount: 1500.5,
      alertType: "Money mule",
      risk: "high",
    });
    expect(saved.cards[newId].createdAt).toBe(saved.cards[newId].updatedAt);

    await userEvent.click(within(screen.getByTestId("card-card-1")).getByRole("heading"));
    const dialog = screen.getByRole("dialog");
    await userEvent.click(within(dialog).getByRole("button", { name: /edit case/i }));
    await userEvent.clear(within(dialog).getByLabelText("Case title"));
    await userEvent.type(within(dialog).getByLabelText("Case title"), "Escalated");
    await userEvent.click(within(dialog).getByRole("button", { name: /save/i }));
    await userEvent.click(within(dialog).getByRole("button", { name: /close/i }));
    const edited = (await lastSavedBoard(fetchMock)).cards["card-1"];
    expect(edited.title).toBe("Escalated");
    expect(edited.customerName).toBe("Daniel Okafor");
    expect(edited.createdAt).toBe("2026-11-16T08:42:00Z");
    expect(edited.updatedAt > edited.createdAt).toBe(true);

    await userEvent.click(within(screen.getByTestId("card-card-2")).getByRole("heading"));
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: /archive case/i }));
    saved = (await lastSavedBoard(fetchMock));
    expect(saved.cards["card-2"].archivedAt).toBeTruthy();
    expect(saved.columns[0].cardIds).toContain("card-2");

    await userEvent.click(screen.getByRole("button", { name: "Archived (1)" }));
    const row = screen.getByTestId("archived-card-2");
    await userEvent.click(within(row).getByRole("button", { name: /delete permanently/i }));
    await userEvent.click(within(row).getByRole("button", { name: /confirm delete/i }));
    saved = (await lastSavedBoard(fetchMock));
    expect(saved.cards["card-2"]).toBeUndefined();
    expect(saved.columns[0].cardIds).not.toContain("card-2");
  });
});
