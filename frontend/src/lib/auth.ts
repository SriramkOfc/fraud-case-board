const SESSION_KEY = "fraud-board-user";
const listeners = new Set<() => void>();

// MVP only: hardcoded credentials checked in the browser
export const checkCredentials = (username: string, password: string) =>
  username === "user" && password === "password";

export const subscribeSession = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getSessionUser = () => sessionStorage.getItem(SESSION_KEY);

export const setSessionUser = (username: string) => {
  sessionStorage.setItem(SESSION_KEY, username);
  listeners.forEach((listener) => listener());
};

export const clearSessionUser = () => {
  sessionStorage.removeItem(SESSION_KEY);
  listeners.forEach((listener) => listener());
};
