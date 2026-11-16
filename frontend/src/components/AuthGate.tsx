"use client";

import { useState, useSyncExternalStore } from "react";
import { KanbanBoard } from "@/components/KanbanBoard";
import { LoginForm } from "@/components/LoginForm";
import {
  clearSessionUser,
  getSessionUser,
  setSessionUser,
  subscribeSession,
} from "@/lib/auth";
import { initialData, type BoardData } from "@/lib/kanban";

export const AuthGate = () => {
  // Board state lives here so it survives logout / login while the app stays open
  const [board, setBoard] = useState<BoardData>(initialData);
  // undefined during the static (server) render, where sessionStorage does not exist
  const user = useSyncExternalStore(subscribeSession, getSessionUser, () => undefined);

  if (user === undefined) {
    return null;
  }

  if (!user) {
    return <LoginForm onLogin={setSessionUser} />;
  }

  return <KanbanBoard board={board} setBoard={setBoard} onLogout={clearSessionUser} />;
};
