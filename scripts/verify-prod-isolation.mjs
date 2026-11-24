#!/usr/bin/env node
/**
 * Proves the test catalog is NOT reachable in a normal production build:
 *  1. the production output (.next) contains no trace of the fixture catalog;
 *  2. a running production server answers 404 for the fixture route, even
 *     with query strings that try to switch it on.
 * Run after `pnpm build` (without PROMPTER_E2E_FIXTURES). No external network.
 */
import { spawn } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const DIST = ".next";
const MARKERS = ["PROMPTER_E2E_FIXTURE_CATALOG_v1", "prompter.e2e-fixture", "p_soft_portrait"];
const PORT = 3299;

const fail = (msg) => {
  console.error(`✘ ${msg}`);
  process.exit(1);
};

if (!existsSync(DIST)) fail(`${DIST} not found — run "pnpm build" first`);
if (process.env.PROMPTER_E2E_FIXTURES === "1") fail("PROMPTER_E2E_FIXTURES=1 is set; this check must run against a normal build");

const walk = (dir) =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    if (f === "cache") return [];
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
const files = walk(DIST).filter((f) => /\.(js|mjs|cjs|json|html|rsc|map|txt|body)$/.test(f));
const offenders = files.filter((f) => {
  const content = readFileSync(f, "utf8");
  return MARKERS.some((m) => content.includes(m));
});
if (offenders.length) fail(`fixture catalog found in production output:\n  ${offenders.join("\n  ")}`);
console.log(`✓ ${files.length} production output files contain no fixture marker`);

const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(PORT)], {
  stdio: ["ignore", "pipe", "pipe"],
  env: { ...process.env, PROMPTER_E2E_FIXTURES: "1" }, // even a runtime env var must not enable it
});
let serverLog = "";
server.stdout.on("data", (d) => (serverLog += d));
server.stderr.on("data", (d) => (serverLog += d));
const stop = () => server.kill("SIGTERM");
try {
  let up = false;
  for (let i = 0; i < 60 && !up; i++) {
    await new Promise((r) => setTimeout(r, 500));
    up = await fetch(`http://localhost:${PORT}/`).then((r) => r.ok, () => false);
  }
  if (!up) fail(`production server did not start\n${serverLog}`);
  for (const path of ["/e2e-fixtures", "/e2e-fixtures?fixtures=1", "/e2e-fixtures?PROMPTER_E2E_FIXTURES=1"]) {
    const res = await fetch(`http://localhost:${PORT}${path}`);
    const body = await res.text();
    if (res.status !== 404) fail(`${path} returned ${res.status}, expected 404`);
    if (MARKERS.some((m) => body.includes(m))) fail(`${path} leaked fixture content`);
    console.log(`✓ ${path} → 404`);
  }
  const home = await fetch(`http://localhost:${PORT}/`).then((r) => r.text());
  if (MARKERS.some((m) => home.includes(m))) fail("home page leaked fixture content");
  console.log("✓ production build isolates the test catalog");
} finally {
  stop();
}
