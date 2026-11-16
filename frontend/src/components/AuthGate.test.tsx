import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthGate } from "@/components/AuthGate";
import { mockBackend } from "@/test/mockBackend";

const signIn = async (username: string, password: string) => {
  await userEvent.type(screen.getByLabelText(/username/i), username);
  await userEvent.type(screen.getByLabelText(/password/i), password);
  await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
};

describe("AuthGate", () => {
  beforeEach(() => {
    sessionStorage.clear();
    mockBackend();
  });

  it("shows the login form when signed out", () => {
    render(<AuthGate />);
    expect(screen.getByRole("heading", { name: /analyst sign in/i })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Fraud Case Board" })).not.toBeInTheDocument();
  });

  it("signs in with valid credentials", async () => {
    render(<AuthGate />);
    await signIn("user", "password");
    expect(await screen.findByRole("heading", { name: "Fraud Case Board" })).toBeInTheDocument();
    expect(sessionStorage.getItem("fraud-board-user")).toBe("user");
  });

  it("rejects invalid credentials", async () => {
    render(<AuthGate />);
    await signIn("user", "wrong");
    expect(screen.getByRole("alert")).toHaveTextContent(/invalid username or password/i);
    expect(screen.queryByRole("heading", { name: "Fraud Case Board" })).not.toBeInTheDocument();
  });

  it("keeps the analyst signed in for the session", async () => {
    sessionStorage.setItem("fraud-board-user", "user");
    render(<AuthGate />);
    expect(await screen.findByRole("heading", { name: "Fraud Case Board" })).toBeInTheDocument();
  });

  it("logs out back to the login form", async () => {
    render(<AuthGate />);
    await signIn("user", "password");
    await userEvent.click(await screen.findByRole("button", { name: /log out/i }));
    expect(screen.getByRole("heading", { name: /analyst sign in/i })).toBeInTheDocument();
    expect(sessionStorage.getItem("fraud-board-user")).toBeNull();
  });

  it("keeps board changes after logging out and back in", async () => {
    render(<AuthGate />);
    await signIn("user", "password");
    const column = (await screen.findAllByTestId(/column-/i))[0];
    await userEvent.click(within(column).getByRole("button", { name: /add a card/i }));
    await userEvent.type(within(screen.getByRole("dialog")).getByLabelText("Case title"), "Chargeback spike");
    await userEvent.type(within(screen.getByRole("dialog")).getByLabelText("Customer name"), "Ava Chen");
    await userEvent.type(within(screen.getByRole("dialog")).getByLabelText("Account last 4 digits"), "9921");
    await userEvent.type(within(screen.getByRole("dialog")).getByLabelText("Amount at risk"), "1500");
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: /add card/i }));

    await userEvent.click(screen.getByRole("button", { name: /log out/i }));
    await signIn("user", "password");

    expect(await screen.findByText("Chargeback spike")).toBeInTheDocument();
  });
});
