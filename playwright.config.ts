import { defineConfig, devices } from "@playwright/test";

// E2e tests run against a locally seeded Supabase stack (CI: the db-tests
// pattern — `supabase db start` + `db reset` first). Locally, start the stack
// and `npm run test:e2e`; without a stack the pages render but have no data.
const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: true,
  retries: isCI ? 1 : 0,
  reporter: isCI ? "line" : "list",
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run start",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !isCI,
    timeout: 60_000,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } }, // mobile-first product
  ],
});
