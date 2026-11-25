import { expect, test, type Page } from "@playwright/test";
import { writeFileSync } from "node:fs";
import { closePreview, ensurePreviewOpen, guardNetwork, pickColor, pickOption } from "./helpers";

/**
 * Sprint 2-C.1 — collapsed color picker (TD-13), category tree keyboard (TD-01), dialog focus (TD-02),
 * camera/lighting subcategories and the editing flow, on the PRODUCT catalog (/), desktop and mobile.
 * Screenshots: E2E_SCREENSHOT_DIR (docs/screenshots/sprint-2c1). Page heights: E2E_METRICS_DIR (optional).
 */
const SHOTS = process.env.E2E_SCREENSHOT_DIR;
const METRICS = process.env.E2E_METRICS_DIR;
const shot = async (page: Page, name: string, project: string, fullPage = true) => {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/after-${project}-${name}.png`, fullPage, scale: "css" });
};
const output = (page: Page) => page.getByTestId("prompt-output");
const field = (page: Page, id: string) => page.locator(`[data-attribute-id="${id}"]`);
const nav = (page: Page) => page.getByRole("navigation", { name: "카테고리", exact: true });
const tree = (page: Page) => nav(page).getByRole("tree");
const item = (page: Page, label: string) => tree(page).getByRole("treeitem", { name: label, exact: true });
const isMobile = async (page: Page) => page.locator(".nav-toggle").isVisible();
const openNav = async (page: Page) => {
  const toggle = page.locator(".nav-toggle");
  if ((await toggle.isVisible()) && (await toggle.getAttribute("aria-expanded")) !== "true") await toggle.click();
};
const go = async (page: Page, label: string) => {
  await openNav(page);
  await item(page, label).locator(":scope > .cat-row").click(); // the row itself (an expanded item also contains its children)
};
const stored = async (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem("prompter:v1:workspace") ?? "{}").spec?.selections ?? {});
const height = (page: Page) => page.evaluate(() => document.documentElement.scrollHeight);

test("color pickers are collapsed; the palette opens on request, closes after a choice and keeps values across reload", async ({ page, baseURL }, info) => {
  const external = guardNetwork(page, baseURL!);
  const project = info.project.name;
  await page.goto("/");
  await page.locator("label.chip").filter({ has: page.getByText("인물 (1인)", { exact: true }) }).click();
  await page.getByRole("tab", { name: /Detailed/ }).click();

  const heights: Record<string, number> = {};
  for (const [label, name] of [["상의", "tops"], ["메이크업", "makeup"], ["헤어", "hair"], ["카메라", "camera"], ["조명", "lighting"]] as const) {
    await go(page, label);
    await expect(page.getByRole("heading", { level: 2, name: label })).toBeVisible();
    await expect(page.locator(".color-palette")).toHaveCount(0); // nothing expanded by default
    heights[name] = await height(page);
    await shot(page, name, project);
  }
  // Camera / Lighting pages after the split (first group of each)
  for (const [label, name] of [["프레이밍 및 시점", "camera-framing"], ["색상 및 색온도", "lighting-color"]] as const) {
    await go(page, label);
    heights[name] = await height(page);
    await shot(page, name, project);
  }
  if (METRICS) writeFileSync(`${METRICS}/heights-after-${project}.json`, JSON.stringify(heights));

  // Tops: open → choose → closed, current value shown; the palette is a labelled group
  await go(page, "상의");
  const id = "person.clothing.tops.primary_color";
  await expect(field(page, id).getByTestId(`color-current-${id}`)).toHaveText("미설정");
  await field(page, id).getByRole("button", { name: "상의 기본 색상: 색상 선택" }).click();
  const palette = field(page, id).getByRole("group", { name: "상의 기본 색상 팔레트" });
  await expect(palette.getByRole("radio")).toHaveCount(55);
  await expect(palette.getByRole("radio").first()).toBeFocused();
  await shot(page, "palette-open", project, false);
  await palette.locator("label.chip").filter({ has: page.getByText("네이비", { exact: true }) }).click();
  await expect(palette).toHaveCount(0);
  await expect(field(page, id).getByRole("button", { name: "상의 기본 색상: 색상 변경" })).toBeFocused();
  await expect(field(page, id).getByTestId(`color-current-${id}`)).toContainText("네이비");

  // Escape closes without choosing; a click outside closes (non-modal)
  await field(page, "person.clothing.tops.secondary_color").getByRole("button", { name: /색상 선택$/ }).click();
  await page.keyboard.press("Escape");
  await expect(field(page, "person.clothing.tops.secondary_color").locator(".color-palette")).toHaveCount(0);
  await expect(field(page, "person.clothing.tops.secondary_color").getByRole("button", { name: /색상 선택$/ })).toBeFocused();
  await field(page, "person.clothing.tops.secondary_color").getByRole("button", { name: /색상 선택$/ }).click();
  await page.getByRole("heading", { level: 2, name: "상의" }).click();
  await expect(field(page, "person.clothing.tops.secondary_color").locator(".color-palette")).toHaveCount(0);

  // Other palettes use the same component (hair, makeup, lighting)
  await go(page, "헤어");
  await pickColor(page, "person.hair.primary_color", "짙은 갈색");
  await go(page, "색상 및 색온도");
  await pickColor(page, "lighting.key_color", "앰버");

  await ensurePreviewOpen(page);
  await expect(output(page)).toHaveText("Main subject: a single person. Primary hair color: dark brown. Top primary color: navy. Key light color: amber.");
  await closePreview(page);
  const before = await stored(page);
  expect(before[id].value).toEqual({ kind: "single", optionId: "navy" });

  await page.reload();
  await page.getByRole("tab", { name: /Detailed/ }).click();
  await go(page, "상의");
  await expect(field(page, id).getByTestId(`color-current-${id}`)).toContainText("네이비");
  await expect(page.locator(".color-palette")).toHaveCount(0);
  expect(await stored(page)).toEqual(before);
  expect(external).toEqual([]);
});

test("category tree: keyboard only — Tab in, arrows, Enter opens Camera › Lens; search result jumps to the attribute", async ({ page }, info) => {
  const project = info.project.name;
  await page.goto("/");
  await page.getByRole("tab", { name: /Detailed/ }).click();
  await openNav(page);
  await nav(page).getByRole("searchbox").focus();
  await page.keyboard.press("Tab");
  await expect(item(page, "기본")).toBeFocused();
  await expect(item(page, "기본")).toHaveAttribute("aria-current", "page");
  await page.keyboard.press("End");
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("Home");
  await expect(item(page, "기본")).toBeFocused();
  // 공통 (Shared) is the next sibling of 인물 after collapsing it
  await page.keyboard.press("ArrowDown");
  await expect(item(page, "인물")).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(item(page, "인물")).toHaveAttribute("aria-expanded", "false");
  await page.keyboard.press("ArrowDown");
  await expect(item(page, "공통")).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(item(page, "카메라")).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowDown");
  await expect(item(page, "렌즈 및 원근감")).toBeFocused();
  await shot(page, "tree-keyboard", project, false);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { level: 2, name: "렌즈 및 원근감" })).toBeVisible();
  await expect(field(page, "camera.focal_length")).toBeVisible();
  if (await isMobile(page)) await expect(page.getByRole("heading", { level: 2, name: "렌즈 및 원근감" })).toBeFocused();
  else await expect(item(page, "렌즈 및 원근감")).toBeFocused();

  await openNav(page);
  await nav(page).getByRole("searchbox").fill("보케");
  await expect(nav(page).getByTestId("cat-search-count")).toHaveText(/검색 결과 \d+개/);
  await nav(page).getByRole("button", { name: /보케 형태/ }).first().click();
  await expect(page.getByRole("heading", { level: 2, name: "카메라 효과" })).toBeVisible();
  await expect(field(page, "camera.bokeh")).toBeFocused();
});

test("dialogs: focus starts inside, Tab stays inside, Escape closes and focus returns; after reset it goes to undo", async ({ page }, info) => {
  const project = info.project.name;
  await page.goto("/");
  await page.getByRole("tab", { name: /Detailed/ }).click();
  await go(page, "프레이밍 및 시점");
  await pickOption(page, "camera.angle", "로우 앵글 (올려다봄)");
  const reset = page.getByTestId("category-reset");
  await reset.click();
  const dialog = page.getByTestId("category-reset-dialog");
  await expect(dialog.getByRole("button", { name: "취소" })).toBeFocused();
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press("Tab");
    expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true);
  }
  await shot(page, "reset-dialog", project, false);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(reset).toBeFocused();
  await reset.click();
  await dialog.getByRole("button", { name: "1개 값 초기화" }).click();
  await expect(page.getByRole("button", { name: "카테고리 초기화 되돌리기" })).toBeFocused();
  await page.getByRole("button", { name: "카테고리 초기화 되돌리기" }).click();
  expect(Object.keys(await stored(page))).toEqual(["camera.angle"]);
});

test("editing flow: previous/next pages, header include/exclude, mobile drawer and preview sheet", async ({ page }, info) => {
  const project = info.project.name;
  await page.goto("/");
  await page.getByRole("tab", { name: /Detailed/ }).click();
  await go(page, "프레이밍 및 시점");
  const seq = page.getByTestId("category-sequence");
  await seq.getByRole("button", { name: /다음: 렌즈 및 원근감/ }).click();
  await expect(page.getByRole("heading", { level: 2, name: "렌즈 및 원근감" })).toBeFocused();
  await pickOption(page, "camera.lens_type", "망원");
  await field(page, "camera.lens_type").locator("header").getByRole("switch", { name: /프롬프트에 포함/ }).uncheck();
  expect((await stored(page))["camera.lens_type"].excludedFromPrompt).toBe(true);
  await shot(page, "lens-page", project);

  if (await isMobile(page)) {
    // The category bar stays on screen while scrolling a long page.
    await go(page, "상의");
    await page.evaluate(() => window.scrollTo(0, 2500));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(2000);
    await expect(page.locator(".nav-toggle")).toBeInViewport();
    expect((await page.locator(".detailed__navbar").boundingBox())!.y).toBeLessThan(2); // stuck to the top
    await shot(page, "mobile-sticky-nav", project, false);
    // The preview sheet: opening focuses its title; Escape closes and returns to the toolbar button.
    const button = page.getByRole("toolbar", { name: "프롬프트 도구" }).getByRole("button", { name: "미리보기" });
    await button.click();
    await expect(page.getByRole("heading", { level: 2, name: "프롬프트 미리보기" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(button).toBeFocused();
    await expect(button).toHaveAttribute("aria-expanded", "false");
  }
});
