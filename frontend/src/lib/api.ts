import type { BoardData } from "@/lib/kanban";

const boardUrl = (username: string) => `/api/users/${encodeURIComponent(username)}/board`;

export const getBoard = async (username: string): Promise<BoardData> => {
  const response = await fetch(boardUrl(username));
  return response.json();
};

export const saveBoard = async (username: string, board: BoardData) => {
  await fetch(boardUrl(username), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(board),
  });
};

export type ChatMessage = { role: "user" | "assistant"; content: string };

export const sendChat = async (
  username: string,
  message: string,
  history: ChatMessage[]
): Promise<{ reply: string; board: BoardData | null }> => {
  const response = await fetch(`/api/users/${encodeURIComponent(username)}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history }),
  });
  if (!response.ok) {
    throw new Error(`Chat failed: ${response.status}`);
  }
  return response.json();
};
