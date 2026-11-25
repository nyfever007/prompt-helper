#!/usr/bin/env node
/**
 * Client bundle size of the production build (Sprint 2-C.4 performance baseline).
 * Reads the prerendered HTML of each route in `.next` (run `pnpm build` first) and sums the
 * JS / CSS files it loads: raw, gzip and brotli bytes. Prints JSON. No network, no build changes.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { gzipSync, brotliCompressSync } from "node:zlib";

const dist = process.env.PROMPTER_DIST_DIR ?? ".next";
const routes = { "/": "index.html", "/_not-found": "_not-found.html" };
const out = {};
for (const [route, file] of Object.entries(routes)) {
  const htmlPath = join(dist, "server/app", file);
  if (!existsSync(htmlPath)) continue;
  const html = readFileSync(htmlPath, "utf8");
  const assets = [...new Set([...html.matchAll(/(?:src|href)="(\/_next\/static\/[^"]+\.(?:js|css))"/g)].map((m) => m[1]))];
  const sum = { js: { files: 0, raw: 0, gzip: 0, brotli: 0 }, css: { files: 0, raw: 0, gzip: 0, brotli: 0 } };
  for (const a of assets) {
    const buf = readFileSync(join(dist, a.replace(/^\/_next\//, "")));
    const kind = a.endsWith(".css") ? "css" : "js";
    sum[kind].files++;
    sum[kind].raw += buf.length;
    sum[kind].gzip += gzipSync(buf, { level: 9 }).length;
    sum[kind].brotli += brotliCompressSync(buf).length;
  }
  out[route] = { html: { raw: Buffer.byteLength(html), gzip: gzipSync(html, { level: 9 }).length }, ...sum };
}
console.log(JSON.stringify(out, null, 2));
