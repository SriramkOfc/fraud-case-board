import { defineConfig, devices } from "@playwright/test";

// Runs against the Docker container; start it first with scripts/start.sh.
// Tests reset the "user" board to the sample cases, so they run one at a time.
export default defineConfig({
  testDir: "./tests",
  workers: 1,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: "http://127.0.0.1:8000",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
