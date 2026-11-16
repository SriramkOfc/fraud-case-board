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
