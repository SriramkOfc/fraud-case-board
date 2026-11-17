import { useState, type FormEvent } from "react";
import { checkCredentials, isDemo } from "@/lib/auth";

type LoginFormProps = {
  onLogin: (username: string) => void;
};

const inputClass =
  "w-full rounded-xl border border-[var(--stroke)] bg-white px-3 py-2 text-sm text-[var(--navy-dark)] outline-none transition focus:border-[var(--primary-blue)]";

export const LoginForm = ({ onLogin }: LoginFormProps) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (checkCredentials(username, password)) {
      onLogin(username);
    } else {
      setError(true);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded-[32px] border border-[var(--stroke)] bg-white p-8 shadow-[var(--shadow)]"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--gray-text)]">
            Fraud Operations
          </p>
          <h1 className="mt-3 font-display text-3xl font-semibold text-[var(--navy-dark)]">
            Analyst sign in
          </h1>
          <div className="mt-3 h-1 w-12 rounded-full bg-[var(--accent-yellow)]" />
        </div>
        <label className="block space-y-1 text-xs font-semibold uppercase tracking-wide text-[var(--gray-text)]">
          Username
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            className={inputClass}
          />
        </label>
        <label className="block space-y-1 text-xs font-semibold uppercase tracking-wide text-[var(--gray-text)]">
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            className={inputClass}
          />
        </label>
        {error && (
          <p role="alert" className="text-sm text-[var(--secondary-purple)]">
            Invalid username or password.
          </p>
        )}
        {isDemo && (
          <p className="text-sm text-[var(--gray-text)]">
            Demo login: <span className="font-semibold text-[var(--navy-dark)]">user</span> /{" "}
            <span className="font-semibold text-[var(--navy-dark)]">password</span>. Data is fictional.
          </p>
        )}
        <button
          type="submit"
          className="w-full rounded-full bg-[var(--secondary-purple)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:brightness-110"
        >
          Sign in
        </button>
      </form>
    </main>
  );
};
