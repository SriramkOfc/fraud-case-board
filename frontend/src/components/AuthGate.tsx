"use client";

import { useSyncExternalStore } from "react";
import { BoardPage } from "@/components/BoardPage";
import { LoginForm } from "@/components/LoginForm";
import {
  boardOwner,
  clearSessionUser,
  getSessionUser,
  setSessionUser,
  subscribeSession,
} from "@/lib/auth";

export const AuthGate = () => {
  // undefined during the static (server) render, where sessionStorage does not exist
  const user = useSyncExternalStore(subscribeSession, getSessionUser, () => undefined);

  if (user === undefined) {
    return null;
  }

  if (!user) {
    return <LoginForm onLogin={setSessionUser} />;
  }

  return <BoardPage username={boardOwner(user)} onLogout={clearSessionUser} />;
};
