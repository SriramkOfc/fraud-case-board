import type { APIRequestContext } from "@playwright/test";
import { sampleBoard } from "../src/test/board";

export const resetBoard = async (request: APIRequestContext) => {
  const response = await request.put("/api/users/user/board", { data: sampleBoard });
  if (!response.ok()) {
    throw new Error(`Board reset failed: ${response.status()}`);
  }
};
