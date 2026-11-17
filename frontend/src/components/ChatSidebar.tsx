import { useEffect, useRef, useState, type FormEvent } from "react";
import clsx from "clsx";
import { sendChat, type ChatMessage } from "@/lib/api";
import type { BoardData } from "@/lib/kanban";

type ChatSidebarProps = {
  username: string;
  onBoard: (board: BoardData) => void;
};

export const ChatSidebar = ({ username, onBoard }: ChatSidebarProps) => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
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
    const history = messages;
    setMessages([...history, { role: "user", content: message }]);
    setInput("");
    setError(false);
    setLoading(true);
    try {
      const result = await sendChat(username, message, history.slice(-20));
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: result.reply },
      ]);
      if (result.board) {
        onBoard(result.board);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
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
              Ask about your cases, or have the assistant create, edit, move or
              archive them. For example: &quot;Move the geo-mismatch case to
              Investigation&quot;.
            </p>
          )}
          {messages.map((message, index) => (
            <div
              key={index}
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
