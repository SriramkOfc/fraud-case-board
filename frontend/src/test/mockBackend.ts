import type { BoardData } from "@/lib/kanban";
import { sampleBoard } from "@/test/board";

type ChatHandler = (body: { message: string; history: unknown[] }) => {
  status?: number;
  reply?: string;
  board?: BoardData | null;
};

// Replaces fetch with an in-memory version of the board and chat API
export const mockBackend = (chat?: ChatHandler) => {
  const boards: Record<string, BoardData> = {};
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const username = decodeURIComponent(url.split("/")[3]);
    if (url.endsWith("/chat")) {
      const { status = 200, reply = "", board = null } = chat!(JSON.parse(init!.body as string));
      if (board) {
        boards[username] = board;
      }
      return new Response(JSON.stringify({ reply, board }), { status });
    }
    if (init?.method === "PUT") {
      boards[username] = JSON.parse(init.body as string);
    }
    return new Response(JSON.stringify(boards[username] ?? sampleBoard));
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};
