import { expect, test } from "@playwright/test";
import { resetBoard } from "./helpers";

// Live: calls the real AI through the container (uses OPENROUTER_API_KEY from .env)
test("AI proposes a case and it appears on the board once applied", async ({ page, request }) => {
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
  await expect(page.getByTestId("column-col-alert").getByText("SIM swap alert")).toHaveCount(0);
  await page.getByRole("button", { name: "Apply changes" }).click();
  await expect(page.getByTestId("column-col-alert").getByText("SIM swap alert")).toBeVisible();

  await page.reload();
  await expect(page.getByTestId("column-col-alert").getByText("SIM swap alert")).toBeVisible();
});

test("records the AI change in the case audit trail", async ({ page }) => {
  // Runs after the test above: the SIM swap case exists and was applied from an AI proposal
  await page.goto("/");
  await page.getByLabel("Username").fill("user");
  await page.getByLabel("Password").fill("password");
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.getByTestId("column-col-alert").getByText("SIM swap alert").click();
  const trail = page.getByRole("list", { name: "Audit trail" });
  await expect(trail.getByText(/Created in Alert Triggered/)).toBeVisible();
  await expect(trail.getByText(/AI, approved by analyst/)).toBeVisible();
});
