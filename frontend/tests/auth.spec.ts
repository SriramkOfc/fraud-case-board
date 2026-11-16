import { expect, test } from "@playwright/test";
import { resetBoard } from "./helpers";

test.beforeEach(async ({ request }) => {
  await resetBoard(request);
});

const signIn = async (page: import("@playwright/test").Page, password: string) => {
  await page.getByLabel("Username").fill("user");
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
};

test("requires sign in before showing the board", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /analyst sign in/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Fraud Case Board" })).toHaveCount(0);
});

test("rejects a wrong password", async ({ page }) => {
  await page.goto("/");
  await signIn(page, "wrong");
  await expect(page.getByText(/invalid username or password/i)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Fraud Case Board" })).toHaveCount(0);
});

test("signs in, survives reload, and logs out", async ({ page }) => {
  await page.goto("/");
  await signIn(page, "password");
  await expect(page.getByRole("heading", { name: "Fraud Case Board" })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { name: "Fraud Case Board" })).toBeVisible();

  await page.getByRole("button", { name: /log out/i }).click();
  await expect(page.getByRole("heading", { name: /analyst sign in/i })).toBeVisible();
});

test("keeps added, edited and moved cases after logging out and back in", async ({ page }) => {
  await page.goto("/");
  await signIn(page, "password");

  const firstColumn = page.locator('[data-testid^="column-"]').first();
  await firstColumn.getByRole("button", { name: /add a card/i }).click();
  await page.getByRole("dialog").getByLabel("Case title").fill("Chargeback spike");
  await page.getByRole("dialog").getByLabel("Customer name").fill("Ava Chen");
  await page.getByRole("dialog").getByLabel("Account last 4 digits").fill("9921");
  await page.getByRole("dialog").getByLabel("Amount at risk").fill("1500");
  await page.getByRole("dialog").getByRole("button", { name: /add card/i }).click();

  const edited = page.getByTestId("card-card-1");
  await edited.getByRole("heading").click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: /edit case/i }).click();
  await dialog.getByLabel("Case title").fill("Escalated velocity alert");
  await dialog.getByRole("button", { name: /save/i }).click();
  await page.keyboard.press("Escape");

  const moved = page.getByTestId("card-card-3");
  const target = page.getByTestId("column-col-investigation");
  const from = (await moved.boundingBox())!;
  const to = (await target.boundingBox())!;
  await page.mouse.move(from.x + from.width / 2, from.y + 40);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + 120, { steps: 12 });
  await page.mouse.up();
  await expect(target.getByTestId("card-card-3")).toBeVisible();
  // dnd-kit swallows clicks for 50ms after a drop
  await page.waitForTimeout(100);

  await page.getByRole("button", { name: /log out/i }).click();
  await signIn(page, "password");

  await expect(page.getByText("Chargeback spike")).toBeVisible();
  await expect(page.getByText("Escalated velocity alert")).toBeVisible();
  await expect(target.getByTestId("card-card-3")).toBeVisible();
});
