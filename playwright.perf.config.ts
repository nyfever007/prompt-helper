import { defineConfig, devices } from "@playwright/test";

/**
 * Product performance measurement (Sprint 2-C.4, TD-11) — NOT part of `pnpm verify`.
 * Run: `pnpm perf`. Same production build as the E2E suite (incl. the test-only fixture page for
 * presets). Results: perf/results/<project>.json (gitignored); the baseline is summarized in
 * docs/PERFORMANCE.md. Mobile = Pixel 7 emulation with 4× CPU throttling (CDP).
 */
const PORT = Number(process.env.E2E_PORT ?? 3211);

export default defineConfig({
  testDir: "./perf",
  testMatch: /.*\.perf\.ts$/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 300_000,
  reporter: [["list"]],
  use: { baseURL: `http://localhost:${PORT}` },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-4x-cpu", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: `pnpm build && pnpm exec next start -p ${PORT}`,
    env: { PROMPTER_E2E_FIXTURES: "1", PROMPTER_DIST_DIR: ".next-e2e" },
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 240_000,
  },
});
