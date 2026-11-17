import { expect, test } from "@playwright/test";
import { resetBoard } from "./helpers";

// Live: calls the real AI through the container (uses OPENROUTER_API_KEY from .env)
test("AI creates a case that appears on the board", async ({ page, request }) => {
  test.setTimeout(120_000);
  await resetBoard(request);
  await page.goto("/");
  await page.getByLabel("Username").fill("user");
  await page.getByLabel("Password").fill("password");
  await page.getByRole("button", { name: /sign in/i }).click();

  await page.getByRole("button", { name: "AI assistant" }).click();
  await page
    .getByLabel("Message the AI assistant")
    .fill('Create a new case in Alert Triggered titled "SIM swap alert" for a fictional customer, $5,200 at risk.');
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByTestId("chat-assistant")).toBeVisible({ timeout: 90_000 });
  await expect(page.getByTestId("column-col-alert").getByText("SIM swap alert")).toBeVisible();

  await page.reload();
  await expect(page.getByTestId("column-col-alert").getByText("SIM swap alert")).toBeVisible();
});
