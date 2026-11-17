import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BoardPage } from "@/components/BoardPage";
import type { Change } from "@/lib/api";
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

  const aiBoard = () => {
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
    return board;
  };

  const changes: Change[] = [
    { cardId: "card-ai-1", title: "SIM swap alert", action: "created", detail: "Created in Alert Triggered (medium risk)" },
    { cardId: "card-3", title: "Triage: geo-mismatch purchase", action: "moved", detail: "Moved from Review to Investigation" },
  ];

  const puts = (fetchMock: ReturnType<typeof mockBackend>) =>
    fetchMock.mock.calls.filter(([, init]) => init?.method === "PUT");

  it("shows AI board changes as a proposal and applies them only when approved", async () => {
    const fetchMock = mockBackend(() => ({ reply: "I propose three changes.", board: aiBoard(), changes }));
    await renderPage();

    await send("Create, move and archive");
    const proposal = await screen.findByTestId("proposal");
    expect(within(proposal).getByText("Proposed changes (2)")).toBeInTheDocument();
    expect(within(proposal).getByText(": Moved from Review to Investigation")).toBeInTheDocument();
    // Nothing changes until the analyst applies it
    expect(within(screen.getByTestId("column-col-alert")).queryByText("SIM swap alert")).not.toBeInTheDocument();
    expect(puts(fetchMock)).toHaveLength(0);

    await userEvent.click(within(proposal).getByRole("button", { name: "Apply changes" }));
    expect(within(screen.getByTestId("column-col-alert")).getByText("SIM swap alert")).toBeInTheDocument();
    expect(within(screen.getByTestId("column-col-investigation")).getByTestId("card-card-3")).toBeInTheDocument();
    expect(screen.queryByTestId("card-card-8")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Archived (1)" })).toBeInTheDocument();
    expect(within(proposal).getByText(/Applied/)).toBeInTheDocument();
    expect(within(proposal).queryByRole("button", { name: "Apply changes" })).not.toBeInTheDocument();

    await new Promise((resolve) => setTimeout(resolve, 0));
    const [[url, init]] = puts(fetchMock);
    expect(url).toBe("/api/users/user/board?actor=ai");
    expect(JSON.parse(init!.body as string)).toEqual(aiBoard());
  });

  it("discards a proposal without changing the board", async () => {
    const fetchMock = mockBackend(() => ({ reply: "Proposal.", board: aiBoard(), changes }));
    await renderPage();
    await send("Create a case");
    const proposal = await screen.findByTestId("proposal");
    await userEvent.click(within(proposal).getByRole("button", { name: "Discard" }));
    expect(within(proposal).getByText(/Discarded/)).toBeInTheDocument();
    expect(within(screen.getByTestId("column-col-alert")).queryByText("SIM swap alert")).not.toBeInTheDocument();
    expect(puts(fetchMock)).toHaveLength(0);
  });

  it("refuses to apply a proposal after the board has changed", async () => {
    mockBackend(() => ({ reply: "Proposal.", board: aiBoard(), changes }));
    await renderPage();
    await send("Create a case");
    const proposal = await screen.findByTestId("proposal");

    const title = screen.getAllByLabelText("Column title")[1];
    await userEvent.type(title, "!");
    await userEvent.click(within(proposal).getByRole("button", { name: "Apply changes" }));
    expect(within(proposal).getByText(/board changed after this was proposed/)).toBeInTheDocument();
    expect(within(screen.getByTestId("column-col-alert")).queryByText("SIM swap alert")).not.toBeInTheDocument();
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
