import type { BoardData } from "@/lib/kanban";

const boardUrl = (username: string) => `/api/users/${encodeURIComponent(username)}/board`;

export const getBoard = async (username: string): Promise<BoardData> => {
  const response = await fetch(boardUrl(username));
  return response.json();
};

// Saves run one after another so they reach the server in order, and history reads wait for them
let lastSave: Promise<unknown> = Promise.resolve();

export const saveBoard = (username: string, board: BoardData, actor: Actor = "analyst") => {
  const put = () =>
    fetch(`${boardUrl(username)}?actor=${actor}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(board),
    });
  lastSave = lastSave.then(put, put);
  return lastSave;
};

export type Actor = "analyst" | "ai";

export type Change = {
  cardId: string;
  title: string;
  action: "created" | "edited" | "moved" | "archived" | "restored" | "deleted";
  detail: string;
};

export type AuditEvent = Change & { actor: Actor; at: string };

export const getHistory = async (username: string, cardId: string): Promise<AuditEvent[]> => {
  await lastSave;
  const response = await fetch(
    `/api/users/${encodeURIComponent(username)}/cards/${encodeURIComponent(cardId)}/history`
  );
  return response.json();
};

export type ChatMessage = { role: "user" | "assistant"; content: string };

export const sendChat = async (
  username: string,
  message: string,
  history: ChatMessage[]
): Promise<{ reply: string; board: BoardData | null; changes: Change[] }> => {
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
