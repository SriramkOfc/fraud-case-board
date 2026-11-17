import { useEffect, useRef, useState, type FormEvent } from "react";
import clsx from "clsx";
import { sendChat, type Change, type ChatMessage } from "@/lib/api";
import type { BoardData } from "@/lib/kanban";

type ChatSidebarProps = {
  username: string;
  board: BoardData;
  onApply: (board: BoardData) => void;
};

// AI board changes are proposals. `base` is the board the AI saw: a proposal can only be applied while the board is unchanged
type Proposal = {
  board: BoardData;
  changes: Change[];
  base: BoardData;
  status: "pending" | "applied" | "discarded" | "stale";
};

type Message = ChatMessage & { proposal?: Proposal };

const proposalStatus = {
  applied: "Applied. Recorded in each case's audit trail.",
  discarded: "Discarded. Nothing was changed.",
  stale: "The board changed after this was proposed. Ask again for an up-to-date proposal.",
};

export const ChatSidebar = ({ username, board, onApply }: ChatSidebarProps) => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current!.scrollTop = listRef.current!.scrollHeight;
  }, [messages, loading]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = input.trim();
    if (!message || loading) {
      return;
    }
    const history = messages.map(({ role, content }) => ({ role, content }));
    const base = board;
    setMessages((prev) => [...prev, { role: "user", content: message }]);
    setInput("");
    setError(false);
    setLoading(true);
    try {
      const result = await sendChat(username, message, history.slice(-20));
      const proposal: Proposal | undefined = result.board
        ? { board: result.board, changes: result.changes, base, status: "pending" }
        : undefined;
      setMessages((prev) => [...prev, { role: "assistant", content: result.reply, proposal }]);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const resolve = (index: number, apply: boolean) => {
    const proposal = messages[index].proposal!;
    let status: Proposal["status"] = "discarded";
    if (apply) {
      status = proposal.base === board ? "applied" : "stale";
    }
    if (status === "applied") {
      onApply(proposal.board);
    }
    setMessages((prev) =>
      prev.map((m, i) => (i === index ? { ...m, proposal: { ...proposal, status } } : m))
    );
  };

  // Overlays the board so the five stages keep their full width; stays mounted when closed to keep the conversation
  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-40 rounded-full bg-[var(--secondary-purple)] px-5 py-3 text-xs font-semibold uppercase tracking-wide text-white shadow-[var(--shadow)] transition hover:brightness-110"
        >
          AI assistant
        </button>
      )}
      <aside
        aria-label="AI assistant"
        hidden={!open}
        className="fixed inset-y-0 right-0 z-40 flex w-full max-w-[400px] flex-col border-l border-[var(--stroke)] bg-white shadow-[var(--shadow)]"
      >
        <div className="flex items-start justify-between border-b border-[var(--stroke)] px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--gray-text)]">
              AI Assistant
            </p>
            <h2 className="mt-2 font-display text-xl font-semibold text-[var(--navy-dark)]">
              Case copilot
            </h2>
            <div className="mt-3 h-1 w-12 rounded-full bg-[var(--accent-yellow)]" />
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-full border border-[var(--stroke)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--gray-text)] transition hover:text-[var(--navy-dark)]"
          >
            Close
          </button>
        </div>

        <div
          ref={listRef}
          className="flex-1 space-y-3 overflow-y-auto px-6 py-5"
        >
          {messages.length === 0 && (
            <p className="text-sm leading-6 text-[var(--gray-text)]">
              Ask about your cases, or have the assistant propose changes for
              you to approve. For example: &quot;Which cases should I work
              first?&quot; or &quot;Move the geo-mismatch case to
              Investigation&quot;.
            </p>
          )}
          {messages.map((message, index) => (
            <div key={index} className="space-y-2">
              <div
                data-testid={`chat-${message.role}`}
                className={clsx(
                  "whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6",
                  message.role === "user"
                    ? "ml-8 bg-[var(--navy-dark)] text-white"
                    : "mr-8 border border-[var(--stroke)] bg-[var(--surface)] text-[var(--navy-dark)]",
                )}
              >
                {message.content}
              </div>
              {message.proposal && (
                <div
                  data-testid="proposal"
                  className="mr-8 rounded-2xl border border-dashed border-[var(--secondary-purple)] px-4 py-3"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--secondary-purple)]">
                    Proposed changes ({message.proposal.changes.length})
                  </p>
                  <ul className="mt-2 space-y-1.5 text-sm leading-5 text-[var(--navy-dark)]">
                    {message.proposal.changes.map((change, i) => (
                      <li key={i}>
                        <span className="font-semibold">{change.title}</span>
                        <span className="text-[var(--gray-text)]">: {change.detail}</span>
                      </li>
                    ))}
                  </ul>
                  {message.proposal.status === "pending" ? (
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => resolve(index, true)}
                        className="rounded-full bg-[var(--secondary-purple)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:brightness-110"
                      >
                        Apply changes
                      </button>
                      <button
                        type="button"
                        onClick={() => resolve(index, false)}
                        className="rounded-full border border-[var(--stroke)] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--gray-text)] transition hover:text-[var(--navy-dark)]"
                      >
                        Discard
                      </button>
                    </div>
                  ) : (
                    <p className="mt-3 text-xs font-semibold text-[var(--gray-text)]">
                      {proposalStatus[message.proposal.status]}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
          {loading && (
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary-blue)]">
              Thinking...
            </p>
          )}
          {error && (
            <p className="text-sm text-[var(--secondary-purple)]">
              The assistant could not complete that request. Please try again.
            </p>
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex gap-2 border-t border-[var(--stroke)] px-6 py-4"
        >
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask the assistant..."
            aria-label="Message the AI assistant"
            className="min-w-0 flex-1 rounded-full border border-[var(--stroke)] bg-white px-4 py-2 text-sm text-[var(--navy-dark)] outline-none transition focus:border-[var(--primary-blue)]"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-full bg-[var(--secondary-purple)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:brightness-110 disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </aside>
    </>
  );
};
