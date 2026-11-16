import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { KanbanBoard } from "@/components/KanbanBoard";
import { sampleBoard } from "@/test/board";

const Board = () => {
  const [board, setBoard] = useState(sampleBoard);
  return <KanbanBoard board={board} updateBoard={setBoard} onLogout={() => {}} />;
};

const getFirstColumn = () => screen.getAllByTestId(/column-/i)[0];

const openCase = async (cardId: string) => {
  await userEvent.click(within(screen.getByTestId(`card-${cardId}`)).getByRole("heading"));
  return screen.getByRole("dialog");
};

describe("KanbanBoard", () => {
  it("renders five columns", () => {
    render(<Board />);
    expect(screen.getAllByTestId(/column-/i)).toHaveLength(5);
  });

  it("renames a column", async () => {
    render(<Board />);
    const column = getFirstColumn();
    const input = within(column).getByLabelText("Column title");
    await userEvent.clear(input);
    await userEvent.type(input, "New Name");
    expect(input).toHaveValue("New Name");
  });

  it("shows case essentials on the card", () => {
    render(<Board />);
    const card = screen.getByTestId("card-card-2");
    expect(within(card).getByText("Priya Sharma")).toBeInTheDocument();
    expect(within(card).getByText("$18,500.00")).toBeInTheDocument();
    expect(within(card).getByText(/7310/)).toBeInTheDocument();
    expect(within(card).queryByText(/wire paused pending triage/i)).not.toBeInTheDocument();
    expect(within(card).queryByRole("button")).not.toBeInTheDocument();
  });

  it("opens a case window with all details on click", async () => {
    render(<Board />);
    const dialog = await openCase("card-2");
    expect(within(dialog).getByRole("heading", { name: /ml score 0.94/i })).toBeInTheDocument();
    expect(within(dialog).getByText("Priya Sharma")).toBeInTheDocument();
    expect(within(dialog).getByText("$18,500.00")).toBeInTheDocument();
    expect(within(dialog).getByText(/7310/)).toBeInTheDocument();
    expect(within(dialog).getByText(/wire paused pending triage/i)).toBeInTheDocument();
    expect(within(dialog).getAllByText("Alert Triggered").length).toBeGreaterThan(0);
    expect(within(dialog).getByText("Created")).toBeInTheDocument();
    expect(within(dialog).getByText("Last updated")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: /edit case/i })).toBeInTheDocument();
  });

  it("opens a case window with the Enter key", async () => {
    render(<Board />);
    screen.getByTestId("card-card-2").focus();
    await userEvent.keyboard("{Enter}");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("closes the case window with Close, Escape or the backdrop", async () => {
    render(<Board />);
    let dialog = await openCase("card-1");
    await userEvent.click(within(dialog).getByRole("button", { name: /close/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await openCase("card-1");
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    dialog = await openCase("card-1");
    await userEvent.click(dialog.parentElement!);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("adds a case and archives it from its window", async () => {
    render(<Board />);
    const column = getFirstColumn();
    await userEvent.click(within(column).getByRole("button", { name: /add a card/i }));
    const addDialog = screen.getByRole("dialog");
    expect(within(addDialog).getByRole("heading", { name: "New case" })).toBeInTheDocument();
    expect(within(addDialog).getByText("Alert Triggered")).toBeInTheDocument();
    expect(within(addDialog).getByLabelText("Amount at risk")).toHaveValue(null);
    await userEvent.type(within(screen.getByRole("dialog")).getByLabelText("Case title"), "New card");
    await userEvent.type(within(screen.getByRole("dialog")).getByLabelText("Customer name"), "Ava Chen");
    await userEvent.type(within(screen.getByRole("dialog")).getByLabelText("Account last 4 digits"), "9921");
    await userEvent.type(within(screen.getByRole("dialog")).getByLabelText("Amount at risk"), "1500");
    await userEvent.type(within(screen.getByRole("dialog")).getByLabelText("Case details"), "Notes");
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: /add card/i }));

    expect(within(column).getByText("New card")).toBeInTheDocument();
    expect(within(column).getByText("Ava Chen")).toBeInTheDocument();
    expect(within(column).getByText("$1,500.00")).toBeInTheDocument();

    await userEvent.click(within(column).getByText("New card"));
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: /archive case/i }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(within(column).queryByText("New card")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Archived (1)" })).toBeInTheDocument();
  });

  it("edits a fraud case from its window", async () => {
    render(<Board />);
    const dialog = await openCase("card-1");
    await userEvent.click(within(dialog).getByRole("button", { name: /edit case/i }));

    const title = within(dialog).getByLabelText("Case title");
    await userEvent.clear(title);
    await userEvent.type(title, "Velocity rule escalated");
    const details = within(dialog).getByLabelText("Case details");
    await userEvent.clear(details);
    await userEvent.type(details, "Escalated to tier 2.");
    await userEvent.click(within(dialog).getByRole("button", { name: /save/i }));

    expect(within(dialog).getByText("Escalated to tier 2.")).toBeInTheDocument();
    expect(within(screen.getByTestId("card-card-1")).getByText("Velocity rule escalated")).toBeInTheDocument();
    // Focus fell to <body> when the form unmounted; Escape must still close
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("cancels an edit without changes", async () => {
    render(<Board />);
    const card = screen.getByTestId("card-card-1");
    const originalTitle = within(card).getByRole("heading").textContent!;
    const dialog = await openCase("card-1");
    await userEvent.click(within(dialog).getByRole("button", { name: /edit case/i }));
    await userEvent.type(within(dialog).getByLabelText("Case title"), " changed");
    await userEvent.click(within(dialog).getByRole("button", { name: /cancel/i }));

    expect(within(card).getByRole("heading")).toHaveTextContent(originalTitle);
    expect(within(dialog).getByRole("button", { name: /edit case/i })).toBeInTheDocument();
  });

  it("does not save a case with an empty title", async () => {
    render(<Board />);
    const dialog = await openCase("card-1");
    await userEvent.click(within(dialog).getByRole("button", { name: /edit case/i }));
    await userEvent.clear(within(dialog).getByLabelText("Case title"));
    await userEvent.click(within(dialog).getByRole("button", { name: /save/i }));

    expect(within(dialog).getByLabelText("Case title")).toBeInTheDocument();
  });

  it("closes the new case window on cancel", async () => {
    render(<Board />);
    const column = getFirstColumn();
    await userEvent.click(within(column).getByRole("button", { name: /add a card/i }));
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: /cancel/i }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows archived cases on the archive page and restores them to their stage", async () => {
    render(<Board />);
    expect(screen.getByRole("button", { name: "Archived (0)" })).toBeInTheDocument();
    expect(within(screen.getByTestId("column-col-verification")).getByText("1 case")).toBeInTheDocument();
    const dialog = await openCase("card-6");
    await userEvent.click(within(dialog).getByRole("button", { name: /archive case/i }));
    expect(screen.queryByTestId("card-card-6")).not.toBeInTheDocument();
    expect(within(screen.getByTestId("column-col-verification")).getByText("0 cases")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Archived (1)" }));
    const row = screen.getByTestId("archived-card-6");
    expect(within(row).getByText("Confirm txns with cardholder")).toBeInTheDocument();
    expect(within(row).getByText(/Stage: Verification/)).toBeInTheDocument();
    expect(screen.queryByTestId("column-col-alert")).not.toBeInTheDocument();

    await userEvent.click(within(row).getByRole("button", { name: /restore/i }));
    expect(screen.getByText(/no archived cases/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /back to board/i }));
    expect(within(screen.getByTestId("column-col-verification")).getByTestId("card-card-6")).toBeInTheDocument();
  });

  it("deletes an archived case permanently only after confirming", async () => {
    render(<Board />);
    const dialog = await openCase("card-8");
    await userEvent.click(within(dialog).getByRole("button", { name: /archive case/i }));
    await userEvent.click(screen.getByRole("button", { name: "Archived (1)" }));
    const row = screen.getByTestId("archived-card-8");

    await userEvent.click(within(row).getByRole("button", { name: /delete permanently/i }));
    await userEvent.click(within(row).getByRole("button", { name: /cancel/i }));
    expect(screen.getByTestId("archived-card-8")).toBeInTheDocument();

    await userEvent.click(within(row).getByRole("button", { name: /delete permanently/i }));
    expect(within(row).getByText(/cannot be undone/i)).toBeInTheDocument();
    await userEvent.click(within(row).getByRole("button", { name: /confirm delete/i }));
    expect(screen.queryByTestId("archived-card-8")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /back to board/i }));
    expect(screen.queryByTestId("card-card-8")).not.toBeInTheDocument();
  });
});
