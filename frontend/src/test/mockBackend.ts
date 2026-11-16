import type { BoardData } from "@/lib/kanban";
import { sampleBoard } from "@/test/board";

// Replaces fetch with an in-memory version of the board API
export const mockBackend = () => {
  const boards: Record<string, BoardData> = {};
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const username = decodeURIComponent(url.split("/")[3]);
    if (init?.method === "PUT") {
      boards[username] = JSON.parse(init.body as string);
    }
    return new Response(JSON.stringify(boards[username] ?? sampleBoard));
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};
