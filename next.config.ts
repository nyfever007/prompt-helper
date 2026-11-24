import type { NextConfig } from "next";

/**
 * E2E-only build flavor (docs/DECISIONS.md ADR-031):
 * - Enabled ONLY by the build-time environment variable PROMPTER_E2E_FIXTURES=1.
 * - The flag is inlined as a constant at build time, so in a normal build the
 *   test-catalog page code is dead and removed; no URL, query string or
 *   client setting can enable it. `pnpm verify:isolation` proves this on the
 *   real production output.
 * - E2E builds go to a separate directory so they never overwrite the
 *   production build.
 */
const e2eFixtures = process.env.PROMPTER_E2E_FIXTURES === "1";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Separate output directory for the E2E flavor (set explicitly by the E2E runner).
  distDir: process.env.PROMPTER_DIST_DIR ?? ".next",
  env: { PROMPTER_E2E_FIXTURES: e2eFixtures ? "1" : "0" },
};

export default nextConfig;
