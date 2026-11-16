import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
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
  await firstColumn.getByPlaceholder("Card title").fill("Playwright card");
  await firstColumn.getByPlaceholder("Details").fill("Added via e2e.");
  await firstColumn.getByRole("button", { name: /add card/i }).click();
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
});

test("edits a fraud case", async ({ page }) => {
  const card = page.getByTestId("card-card-1");
  await card.getByRole("button", { name: /^edit /i }).click();
  await card.getByLabel("Case title").fill("Escalated velocity alert");
  await card.getByLabel("Case details").fill("Escalated to tier 2 analyst.");
  await card.getByRole("button", { name: /save/i }).click();
  await expect(card.getByText("Escalated velocity alert")).toBeVisible();
  await expect(card.getByText("Escalated to tier 2 analyst.")).toBeVisible();
});

test("deletes a fraud case", async ({ page }) => {
  const card = page.getByTestId("card-card-2");
  await card.getByRole("button", { name: /^delete /i }).click();
  await expect(page.getByTestId("card-card-2")).toHaveCount(0);
});
