import { test, type Page } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

/**
 * Sprint 2-C.4 (TD-11) — product performance baseline in a real browser (production build).
 *
 * Interaction latency is measured INSIDE the page: from just before the DOM action until the
 * expected result is in the DOM and two animation frames have passed (rendered and painted).
 * Playwright's own IPC is excluded. Each measurement is repeated REPEAT times; median and max
 * are reported. Mobile runs Pixel 7 emulation with 4× CPU throttling (CDP).
 */
const REPEAT = 5;
const complex = JSON.parse(readFileSync("perf/fixtures/complex-workspace.json", "utf8")) as { storageKey: string; raw: string; selections: number };
type Stat = { median: number; max: number };
const results: Record<string, Stat & { samples: number[]; dom?: Stat }> = {};
const stat = (samples: number[]): Stat => {
  const sorted = [...samples].sort((a, b) => a - b);
  return { median: round(sorted[Math.floor(sorted.length / 2)]!), max: round(sorted[sorted.length - 1]!) };
};
/** `samples`: painted (or load) times; `dom`: times until the result was in the DOM (the work itself). */
const record = (name: string, samples: Array<number | { dom: number; painted: number }>) => {
  const painted = samples.map((x) => (typeof x === "number" ? x : x.painted));
  const dom = samples.filter((x): x is { dom: number; painted: number } => typeof x !== "number").map((x) => x.dom);
  results[name] = { ...stat(painted), samples: painted.map(round), ...(dom.length ? { dom: stat(dom) } : {}) };
};
const round = (n: number) => Math.round(n * 10) / 10;

/**
 * In-page timing: run `action` (JS source); `dom` = until `until` (JS expression) first holds (checked right
 * after the action, then every frame — the synchronous React work shows up here); `painted` = after two more
 * animation frames (frame-quantized at ~16.7 ms in this environment).
 */
const timed = (page: Page, action: string, until: string) =>
  page.evaluate(
    async ({ action, until }) => {
      const act = new Function(action) as () => void;
      const done = new Function(`return (${until});`) as () => boolean;
      const t0 = performance.now();
      act();
      let dom = 0;
      await new Promise<void>((resolve, reject) => {
        const tick = () => {
          if (done()) {
            dom = performance.now() - t0;
            resolve();
          } else if (performance.now() - t0 > 15000) reject(new Error(`timeout: ${until}`));
          else requestAnimationFrame(tick);
        };
        tick();
      });
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      return { dom, painted: performance.now() - t0 };
    },
    { action, until },
  );

const js = {
  row: (label: string) =>
    `[...document.querySelectorAll('[role=treeitem]')].find((e) => document.getElementById(e.getAttribute('aria-labelledby'))?.textContent === ${JSON.stringify(label)}).querySelector(':scope > .cat-row').click();`,
  heading: (label: string) => `document.querySelector('#cat-panel-title')?.firstChild?.textContent?.trim() === ${JSON.stringify(label)}`,
  chip: (attr: string, label: string) =>
    `[...document.querySelectorAll('[data-attribute-id="${attr}"] label.chip')].find((l) => l.textContent.trim() === ${JSON.stringify(label)}).click();`,
  setValue: (selector: string, value: string, proto = "HTMLInputElement") =>
    `const el = document.querySelector(${JSON.stringify(selector)}); Object.getOwnPropertyDescriptor(${proto}.prototype, 'value').set.call(el, ${JSON.stringify(value)}); el.dispatchEvent(new Event('input', { bubbles: true }));`,
  click: (selector: string) => `document.querySelector(${JSON.stringify(selector)}).click();`,
  clickText: (selector: string, text: string) => `[...document.querySelectorAll(${JSON.stringify(selector)})].find((b) => b.textContent.includes(${JSON.stringify(text)})).click();`,
  prompt: (substr: string) => `(document.querySelector('[data-testid=prompt-output]')?.textContent ?? '').includes(${JSON.stringify(substr)})`,
  noPrompt: (substr: string) => `!(document.querySelector('[data-testid=prompt-output]')?.textContent ?? '').includes(${JSON.stringify(substr)})`,
};

const throttle = async (page: Page, project: string) => {
  if (!project.startsWith("mobile")) return;
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
};

/** Load → app ready (storage loaded, Basic rendered); navigation timing + LCP, all from timeOrigin. */
const load = async (page: Page, path = "/") => {
  await page.goto(path, { waitUntil: "load" });
  return page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      const tick = () => {
        const s = document.querySelector("[data-testid=storage-status]");
        if (s && !/불러오는 중/.test(s.textContent ?? "") && document.querySelector("[data-attribute-id]")) resolve();
        else requestAnimationFrame(tick);
      };
      tick();
    });
    const ready = performance.now();
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
    const lcp = await new Promise<number>((resolve) => {
      new PerformanceObserver((list) => resolve(list.getEntries().at(-1)?.startTime ?? 0)).observe({ type: "largest-contentful-paint", buffered: true });
      setTimeout(() => resolve(0), 1000);
    });
    return { ttfb: nav.responseStart, dcl: nav.domContentLoadedEventEnd, load: nav.loadEventEnd, ready, lcp };
  });
};

test("product performance baseline", async ({ page, context }, info) => {
  const project = info.project.name;

  // ── Initial load (empty workspace) and with a complex saved workspace ────────────────────────
  const loads = { ttfb: [] as number[], dcl: [] as number[], load: [] as number[], ready: [] as number[], lcp: [] as number[] };
  for (let i = 0; i < REPEAT; i++) {
    const p = await context.newPage();
    await throttle(p, project);
    const r = await load(p);
    for (const k of Object.keys(loads) as Array<keyof typeof loads>) loads[k].push(r[k]);
    await p.close();
  }
  for (const k of Object.keys(loads) as Array<keyof typeof loads>) record(`load.empty.${k}`, loads[k]);

  const complexReady: number[] = [];
  for (let i = 0; i < REPEAT; i++) {
    const p = await context.newPage();
    await p.addInitScript(({ key, raw }) => localStorage.setItem(key, raw), { key: complex.storageKey, raw: complex.raw });
    await throttle(p, project);
    const r = await load(p);
    complexReady.push(r.ready);
    await p.close();
  }
  record(`load.complex${complex.selections}.ready`, complexReady);

  // ── Editor interactions on the empty workspace ────────────────────────────────────────────────
  await throttle(page, project);
  await load(page);
  const detailed: Array<{ dom: number; painted: number }> = [];
  const basic: Array<{ dom: number; painted: number }> = [];
  for (let i = 0; i < REPEAT; i++) {
    detailed.push(await timed(page, js.click("#tab-detailed"), "!!document.querySelector('.cat-panel')"));
    basic.push(await timed(page, js.click("#tab-basic"), "!document.querySelector('.cat-panel') && !!document.querySelector('[data-group-id=what]')"));
  }
  record("render.detailed (Basic → Detailed)", detailed);
  record("render.basic (Detailed → Basic)", basic);
  await page.click("#tab-detailed");

  const pages = ["상의", "헤어", "렌즈 및 원근감", "색상 및 색온도", "연령", "기본"];
  const nav: Array<{ dom: number; painted: number }> = [];
  for (let i = 0; i < REPEAT; i++) for (const label of pages) nav.push(await timed(page, js.row(label), js.heading(label)));
  record("category switch (6 pages)", nav);

  const select: Array<{ dom: number; painted: number }> = [];
  await timed(page, js.row("렌즈 및 원근감"), js.heading("렌즈 및 원근감"));
  for (let i = 0; i < REPEAT; i++) {
    select.push(await timed(page, js.chip("camera.lens_type", "망원"), js.prompt("telephoto")));
    select.push(await timed(page, js.chip("camera.lens_type", "광각"), js.prompt("wide-angle")));
  }
  record("attribute select → prompt (empty spec)", select);

  const slider: Array<{ dom: number; painted: number }> = [];
  await timed(page, js.row("초점 및 피사계 심도"), js.heading("초점 및 피사계 심도"));
  for (let i = 0; i < REPEAT; i++) {
    slider.push(await timed(page, js.setValue('[data-attribute-id="camera.depth_of_field"] input[type=range]', "2"), js.prompt("Depth of field: shallow")));
    slider.push(await timed(page, js.setValue('[data-attribute-id="camera.depth_of_field"] input[type=range]', "4"), js.prompt("Depth of field: deep")));
  }
  record("relative slider → prompt", slider);

  const palette: Array<{ dom: number; painted: number }> = [];
  await timed(page, js.row("상의"), js.heading("상의"));
  for (let i = 0; i < REPEAT; i++) {
    palette.push(await timed(page, js.click('[data-attribute-id="person.clothing.tops.primary_color"] .color-picker__toggle'), "!!document.querySelector('.color-palette')"));
    await page.keyboard.press("Escape");
  }
  record("color palette open (55 colors)", palette);

  const search: Array<{ dom: number; painted: number }> = [];
  for (let i = 0; i < REPEAT; i++) {
    search.push(await timed(page, js.setValue(".cat-search-input", i % 2 ? "보케" : "색상"), "document.querySelectorAll('.cat-search-results li').length > 0"));
    await timed(page, js.setValue(".cat-search-input", ""), "!!document.querySelector('.cat-tree')");
  }
  record("catalog search (348 attributes + options)", search);

  // Category reset (dialog → confirm) and restore
  const reset: Array<{ dom: number; painted: number }> = [];
  const restore: Array<{ dom: number; painted: number }> = [];
  await timed(page, js.row("렌즈 및 원근감"), js.heading("렌즈 및 원근감"));
  for (let i = 0; i < REPEAT; i++) {
    await timed(page, js.chip("camera.lens_type", "망원"), js.prompt("telephoto"));
    await timed(page, js.click("[data-testid=category-reset]"), "!!document.querySelector('[data-testid=category-reset-dialog]')");
    reset.push(await timed(page, js.clickText("[data-testid=category-reset-dialog] button", "값 초기화"), "!!document.querySelector('[data-testid=category-reset-bar]')"));
    restore.push(await timed(page, js.clickText("[data-testid=category-reset-bar] button", "되돌리기"), js.prompt("telephoto")));
  }
  record("category reset (confirm)", reset);
  record("category restore", restore);

  // ── Complex workspace (205 values, 196 sentences): edit latency incl. full compile ────────────
  const p = await context.newPage();
  await p.addInitScript(({ key, raw }) => localStorage.setItem(key, raw), { key: complex.storageKey, raw: complex.raw });
  await throttle(p, project);
  await load(p);
  await p.click("#tab-detailed");
  await timed(p, js.row("렌즈 및 원근감"), js.heading("렌즈 및 원근감"));
  const heavy: Array<{ dom: number; painted: number }> = [];
  for (let i = 0; i < REPEAT; i++) {
    heavy.push(await timed(p, js.chip("camera.perspective", "압축된"), js.prompt("compressed perspective")));
    heavy.push(await timed(p, js.chip("camera.perspective", "과장된"), js.prompt("exaggerated perspective")));
  }
  record(`attribute select → prompt (complex spec, ${complex.selections} values)`, heavy);
  const heavyNav: Array<{ dom: number; painted: number }> = [];
  for (let i = 0; i < REPEAT; i++) for (const label of ["상의", "헤어", "연령"]) heavyNav.push(await timed(p, js.row(label), js.heading(label)));
  record(`category switch (complex spec)`, heavyNav);
  await p.close();

  // ── Presets (test-only fixture page; the product catalog has no approved presets) ─────────────
  const f = await context.newPage();
  await throttle(f, project);
  await load(f, "/e2e-fixtures");
  await f.click("#tab-detailed");
  await timed(f, js.row("조명"), js.heading("조명"));
  const presetOpen: Array<{ dom: number; painted: number }> = [];
  const presetApply: Array<{ dom: number; painted: number }> = [];
  const presetUndo: Array<{ dom: number; painted: number }> = [];
  for (let i = 0; i < REPEAT; i++) {
    presetOpen.push(await timed(f, js.clickText(".preset-card button", "변경 내용 확인"), "!!document.querySelector('[role=dialog]')"));
    presetApply.push(await timed(f, js.clickText("[role=dialog] button", "적용"), "!document.querySelector('[role=dialog]') && !!document.querySelector('.preset-bar')"));
    presetUndo.push(await timed(f, js.clickText(".preset-bar button", "되돌리기"), js.noPrompt("golden")));
  }
  record("preset dialog open (plan)", presetOpen);
  record("preset apply", presetApply);
  record("preset undo", presetUndo);
  await f.close();

  const env = await page.evaluate(() => ({ userAgent: navigator.userAgent, hardwareConcurrency: navigator.hardwareConcurrency, viewport: `${innerWidth}×${innerHeight}`, dpr: devicePixelRatio }));
  mkdirSync("perf/results", { recursive: true });
  writeFileSync(`perf/results/${project}.json`, JSON.stringify({ project, repeat: REPEAT, cpuThrottle: project.startsWith("mobile") ? 4 : 1, env, results }, null, 2));
});
