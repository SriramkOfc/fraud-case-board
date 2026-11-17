import { useEffect, useState } from "react";
import { ChatSidebar } from "@/components/ChatSidebar";
import { KanbanBoard } from "@/components/KanbanBoard";
import { getBoard, saveBoard } from "@/lib/api";
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

  // Every change updates the screen and saves the whole board
  const updateBoard = (update: (prev: BoardData) => BoardData) => {
    const next = update(board);
    setBoard(next);
    saveBoard(username, next);
  };

  // The backend has already saved boards returned by the AI, so they only update the screen
  return (
    <>
      <KanbanBoard board={board} updateBoard={updateBoard} onLogout={onLogout} />
      <ChatSidebar username={username} onBoard={setBoard} />
    </>
  );
};
