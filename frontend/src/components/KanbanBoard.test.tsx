import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { KanbanBoard } from "@/components/KanbanBoard";
import { initialData } from "@/lib/kanban";

const Board = () => {
  const [board, setBoard] = useState(initialData);
  return <KanbanBoard board={board} setBoard={setBoard} onLogout={() => {}} />;
};

const getFirstColumn = () => screen.getAllByTestId(/column-/i)[0];

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

  it("adds and removes a card", async () => {
    render(<Board />);
    const column = getFirstColumn();
    const addButton = within(column).getByRole("button", {
      name: /add a card/i,
    });
    await userEvent.click(addButton);

    const titleInput = within(column).getByPlaceholderText(/card title/i);
    await userEvent.type(titleInput, "New card");
    const detailsInput = within(column).getByPlaceholderText(/details/i);
    await userEvent.type(detailsInput, "Notes");

    await userEvent.click(within(column).getByRole("button", { name: /add card/i }));

    expect(within(column).getByText("New card")).toBeInTheDocument();

    const deleteButton = within(column).getByRole("button", {
      name: /delete new card/i,
    });
    await userEvent.click(deleteButton);

    expect(within(column).queryByText("New card")).not.toBeInTheDocument();
  });

  it("edits a fraud case", async () => {
    render(<Board />);
    const card = screen.getByTestId("card-card-1");
    await userEvent.click(within(card).getByRole("button", { name: /^edit /i }));

    const title = within(card).getByLabelText("Case title");
    await userEvent.clear(title);
    await userEvent.type(title, "Velocity rule escalated");
    const details = within(card).getByLabelText("Case details");
    await userEvent.clear(details);
    await userEvent.type(details, "Escalated to tier 2.");
    await userEvent.click(within(card).getByRole("button", { name: /save/i }));

    expect(within(card).getByText("Velocity rule escalated")).toBeInTheDocument();
    expect(within(card).getByText("Escalated to tier 2.")).toBeInTheDocument();
  });

  it("cancels an edit without changes", async () => {
    render(<Board />);
    const card = screen.getByTestId("card-card-1");
    const originalTitle = within(card).getByRole("heading").textContent!;
    await userEvent.click(within(card).getByRole("button", { name: /^edit /i }));
    await userEvent.type(within(card).getByLabelText("Case title"), " changed");
    await userEvent.click(within(card).getByRole("button", { name: /cancel/i }));

    expect(within(card).getByRole("heading")).toHaveTextContent(originalTitle);
  });

  it("does not save a case with an empty title", async () => {
    render(<Board />);
    const card = screen.getByTestId("card-card-1");
    await userEvent.click(within(card).getByRole("button", { name: /^edit /i }));
    await userEvent.clear(within(card).getByLabelText("Case title"));
    await userEvent.click(within(card).getByRole("button", { name: /save/i }));

    expect(within(card).getByLabelText("Case title")).toBeInTheDocument();
  });

  it("closes the add form on cancel", async () => {
    render(<Board />);
    const column = getFirstColumn();
    await userEvent.click(within(column).getByRole("button", { name: /add a card/i }));
    await userEvent.click(within(column).getByRole("button", { name: /cancel/i }));

    expect(within(column).queryByPlaceholderText(/card title/i)).not.toBeInTheDocument();
  });
});
