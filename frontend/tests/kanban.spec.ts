import { expect, test } from "@playwright/test";
import { resetBoard } from "./helpers";

test.beforeEach(async ({ page, request }) => {
  await resetBoard(request);
  await page.goto("/");
  await page.getByLabel("Username").fill("user");
  await page.getByLabel("Password").fill("password");
  await page.getByRole("button", { name: /sign in/i }).click();
});

test("loads the fraud case board", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "Fraud Case Board" })).toBeVisible();
  await expect(page.locator('[data-testid^="column-"]')).toHaveCount(5);
});

test("adds a card to a column", async ({ page }) => {
  const firstColumn = page.locator('[data-testid^="column-"]').first();
  await firstColumn.getByRole("button", { name: /add a card/i }).click();
  await page.getByRole("dialog").getByLabel("Case title").fill("Playwright card");
  await page.getByRole("dialog").getByLabel("Customer name").fill("Ava Chen");
  await page.getByRole("dialog").getByLabel("Account last 4 digits").fill("9921");
  await page.getByRole("dialog").getByLabel("Amount at risk").fill("1500");
  await page.getByRole("dialog").getByLabel("Case details").fill("Added via e2e.");
  await page.getByRole("dialog").getByRole("button", { name: /add card/i }).click();
  await expect(firstColumn.getByText("Playwright card")).toBeVisible();
});

test("moves a card between columns", async ({ page }) => {
  const card = page.getByTestId("card-card-1");
  const targetColumn = page.getByTestId("column-col-review");
  const cardBox = await card.boundingBox();
  const columnBox = await targetColumn.boundingBox();
  if (!cardBox || !columnBox) {
    throw new Error("Unable to resolve drag coordinates.");
  }

  await page.mouse.move(
    cardBox.x + cardBox.width / 2,
    cardBox.y + cardBox.height / 2
  );
  await page.mouse.down();
  await page.mouse.move(
    columnBox.x + columnBox.width / 2,
    columnBox.y + 120,
    { steps: 12 }
  );
  await page.mouse.up();
  await expect(targetColumn.getByTestId("card-card-1")).toBeVisible();

  await expect(async () => {
    const board = await (await page.request.get("/api/users/user/board")).json();
    expect(board.cards["card-1"].updatedAt > board.cards["card-1"].createdAt).toBe(true);
  }).toPass();
});

test("edits a fraud case", async ({ page }) => {
  const card = page.getByTestId("card-card-1");
  await card.getByRole("heading").click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: /edit case/i }).click();
  await dialog.getByLabel("Case title").fill("Escalated velocity alert");
  await dialog.getByLabel("Case details").fill("Escalated to tier 2 analyst.");
  await dialog.getByRole("button", { name: /save/i }).click();
  await expect(dialog.getByText("Escalated to tier 2 analyst.")).toBeVisible();
  await dialog.getByRole("button", { name: /close/i }).click();
  await expect(card.getByText("Escalated velocity alert")).toBeVisible();
});

test("archives, restores and permanently deletes a fraud case", async ({ page }) => {
  const archive = async () => {
    await page.getByTestId("card-card-2").getByRole("heading").click();
    await page.getByRole("dialog").getByRole("button", { name: /archive case/i }).click();
    await expect(page.getByTestId("card-card-2")).toHaveCount(0);
  };

  await archive();
  await page.reload();
  await expect(page.getByTestId("card-card-2")).toHaveCount(0);
  await page.getByRole("button", { name: "Archived (1)" }).click();
  await page.getByTestId("archived-card-2").getByRole("button", { name: /restore/i }).click();
  await page.getByRole("button", { name: /back to board/i }).click();
  await expect(page.getByTestId("column-col-alert").getByTestId("card-card-2")).toBeVisible();

  await archive();
  await page.getByRole("button", { name: "Archived (1)" }).click();
  const row = page.getByTestId("archived-card-2");
  await row.getByRole("button", { name: /delete permanently/i }).click();
  await row.getByRole("button", { name: /confirm delete/i }).click();
  await expect(page.getByText(/no archived cases/i)).toBeVisible();

  await page.reload();
  await expect(page.getByRole("button", { name: "Archived (0)" })).toBeVisible();
  const board = await (await page.request.get("/api/users/user/board")).json();
  expect(board.cards["card-2"]).toBeUndefined();
});

test("keeps changes after a page reload", async ({ page }) => {
  const card = page.getByTestId("card-card-1");
  await card.getByRole("heading").click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: /edit case/i }).click();
  await dialog.getByLabel("Case title").fill("Saved to the database");
  await dialog.getByRole("button", { name: /save/i }).click();
  await page.keyboard.press("Escape");
  await page.getByTestId("column-col-review").getByLabel("Column title").fill("Triage");

  await page.reload();

  await expect(page.getByTestId("card-card-1").getByText("Saved to the database")).toBeVisible();
  await expect(page.getByTestId("column-col-review").getByLabel("Column title")).toHaveValue("Triage");
});

test("rejects an account number that is not 4 digits", async ({ page }) => {
  const firstColumn = page.locator('[data-testid^="column-"]').first();
  await firstColumn.getByRole("button", { name: /add a card/i }).click();
  await page.getByRole("dialog").getByLabel("Case title").fill("Bad account");
  await page.getByRole("dialog").getByLabel("Customer name").fill("Ava Chen");
  await page.getByRole("dialog").getByLabel("Account last 4 digits").fill("12ab");
  await page.getByRole("dialog").getByLabel("Amount at risk").fill("10");
  await page.getByRole("dialog").getByRole("button", { name: /add card/i }).click();
  await expect(page.getByRole("dialog").getByLabel("Account last 4 digits")).toBeVisible();
  await expect(page.getByText("Bad account")).toHaveCount(0);
});
