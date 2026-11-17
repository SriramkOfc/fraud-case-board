import { useEffect, useState } from "react";
import { ChatSidebar } from "@/components/ChatSidebar";
import { KanbanBoard } from "@/components/KanbanBoard";
import { getBoard, saveBoard, type Actor } from "@/lib/api";
import type { BoardData } from "@/lib/kanban";

type BoardPageProps = {
  username: string;
  onLogout: () => void;
};

export const BoardPage = ({ username, onLogout }: BoardPageProps) => {
  const [board, setBoard] = useState<BoardData | null>(null);

  useEffect(() => {
    getBoard(username).then(setBoard);
  }, [username]);

  if (!board) {
    return (
      <main className="flex min-h-screen items-center justify-center text-sm font-semibold uppercase tracking-[0.2em] text-[var(--gray-text)]">
        Loading cases...
      </main>
    );
  }

  // Every change updates the screen and saves the whole board; the backend records it in the audit trail
  const save = (next: BoardData, actor: Actor) => {
    setBoard(next);
    saveBoard(username, next, actor);
  };

  return (
    <>
      <KanbanBoard
        username={username}
        board={board}
        updateBoard={(update) => save(update(board), "analyst")}
        onLogout={onLogout}
      />
      <ChatSidebar username={username} board={board} onApply={(next) => save(next, "ai")} />
    </>
  );
};
