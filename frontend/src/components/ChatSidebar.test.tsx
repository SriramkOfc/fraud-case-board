import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BoardPage } from "@/components/BoardPage";
import type { BoardData } from "@/lib/kanban";
import { sampleBoard } from "@/test/board";
import { mockBackend } from "@/test/mockBackend";

const renderPage = async () => {
  render(<BoardPage username="user" onLogout={() => {}} />);
  await screen.findByText("Velocity rule: 14 card txns in 10 min");
  await userEvent.click(screen.getByRole("button", { name: "AI assistant" }));
};

const send = async (text: string) => {
  await userEvent.type(screen.getByLabelText("Message the AI assistant"), text);
  await userEvent.click(screen.getByRole("button", { name: "Send" }));
};

describe("ChatSidebar", () => {
  it("shows the reply and sends the conversation history", async () => {
    const bodies: { message: string; history: unknown[] }[] = [];
    mockBackend((body) => {
      bodies.push(body);
      return { reply: `Reply ${bodies.length}` };
    });
    await renderPage();

    await send("Which case is largest?");
    expect(await screen.findByText("Reply 1")).toBeInTheDocument();
    expect(screen.getByText("Which case is largest?")).toBeInTheDocument();
    expect(screen.getByLabelText("Message the AI assistant")).toHaveValue("");

    await send("And the smallest?");
    expect(await screen.findByText("Reply 2")).toBeInTheDocument();
    expect(bodies).toEqual([
      { message: "Which case is largest?", history: [] },
      {
        message: "And the smallest?",
        history: [
          { role: "user", content: "Which case is largest?" },
          { role: "assistant", content: "Reply 1" },
        ],
      },
    ]);
    expect(screen.getAllByTestId("chat-user")).toHaveLength(2);
    expect(screen.getAllByTestId("chat-assistant")).toHaveLength(2);
  });

  it("opens and closes, keeping the conversation", async () => {
    mockBackend(() => ({ reply: "Kept reply" }));
    render(<BoardPage username="user" onLogout={() => {}} />);
    await screen.findByText("Velocity rule: 14 card txns in 10 min");
    expect(
      screen.queryByRole("complementary", { name: "AI assistant" }),
    ).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "AI assistant" }));
    await send("Hi");
    expect(await screen.findByText("Kept reply")).toBeInTheDocument();
    await userEvent.click(
      within(
        screen.getByRole("complementary", { name: "AI assistant" }),
      ).getByRole("button", { name: "Close" }),
    );
    expect(
      screen.queryByRole("complementary", { name: "AI assistant" }),
    ).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "AI assistant" }));
    expect(screen.getByText("Kept reply")).toBeInTheDocument();
  });

  it("shows a loading state while waiting and ignores empty messages", async () => {
    let finish: () => void = () => {};
    const fetchMock = mockBackend(() => ({ reply: "Done" }));
    await renderPage();
    await userEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(fetchMock.mock.calls.some(([url]) => url.endsWith("/chat"))).toBe(
      false,
    );

    const original = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementationOnce(
      (url, init) =>
        new Promise((resolve) => (finish = () => resolve(original(url, init)))),
    );
    await send("Hello");
    expect(screen.getByText("Thinking...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
    finish();
    expect(await screen.findByText("Done")).toBeInTheDocument();
    expect(screen.queryByText("Thinking...")).not.toBeInTheDocument();
  });

  it("updates the board and archive count when the AI returns a board", async () => {
    const board: BoardData = structuredClone(sampleBoard);
    board.cards["card-ai-1"] = {
      ...board.cards["card-1"],
      id: "card-ai-1",
      title: "SIM swap alert",
    };
    board.columns[0].cardIds.push("card-ai-1");
    board.columns[1].cardIds = board.columns[1].cardIds.filter(
      (id) => id !== "card-3",
    );
    board.columns[2].cardIds.push("card-3");
    board.cards["card-8"] = {
      ...board.cards["card-8"],
      archivedAt: "2026-11-17T10:00:00Z",
    };
    const fetchMock = mockBackend(() => ({
      reply: "Updated three cases.",
      board,
    }));
    await renderPage();

    await send("Create, move and archive");
    expect(await screen.findByText("Updated three cases.")).toBeInTheDocument();
    expect(
      within(screen.getByTestId("column-col-alert")).getByText(
        "SIM swap alert",
      ),
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId("column-col-investigation")).getByTestId(
        "card-card-3",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("card-card-8")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Archived (1)" }),
    ).toBeInTheDocument();
    // The backend saved the AI board; the frontend does not save it again
    expect(
      fetchMock.mock.calls.some(([, init]) => init?.method === "PUT"),
    ).toBe(false);
  });

  it("shows an error when the request fails", async () => {
    mockBackend(() => ({ status: 502 }));
    await renderPage();
    await send("Delete everything");
    expect(
      await screen.findByText(
        "The assistant could not complete that request. Please try again.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Delete everything")).toBeInTheDocument();
  });
});
