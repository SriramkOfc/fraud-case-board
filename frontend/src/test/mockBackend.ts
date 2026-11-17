import type { AuditEvent, Change } from "@/lib/api";
import type { BoardData } from "@/lib/kanban";
import { sampleBoard } from "@/test/board";

type ChatHandler = (body: { message: string; history: unknown[] }) => {
  status?: number;
  reply?: string;
  board?: BoardData | null;
  changes?: Change[];
};

// Replaces fetch with an in-memory version of the board, history and chat API. `events` is the history returned for every case
export const mockBackend = (chat?: ChatHandler, events: AuditEvent[] = []) => {
  const boards: Record<string, BoardData> = {};
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const username = decodeURIComponent(url.split("/")[3]);
    if (url.endsWith("/chat")) {
      const { status = 200, reply = "", board = null, changes = [] } = chat!(JSON.parse(init!.body as string));
      return new Response(JSON.stringify({ reply, board, changes }), { status });
    }
    if (url.endsWith("/history")) {
      return new Response(JSON.stringify(events));
    }
    if (init?.method === "PUT") {
      boards[username] = JSON.parse(init.body as string);
    }
    return new Response(JSON.stringify(boards[username] ?? sampleBoard));
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};
