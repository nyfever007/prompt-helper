import { expect, test, type Page } from "@playwright/test";
import { pickColor } from "./helpers";

/**
 * Sprint 2-C.4 (TD-16) — keyboard-only regression of the 2-C.1/2-C.2/2-C.3 interactions and the dark
 * theme (`prefers-color-scheme: dark`) in a real browser. This is AUTOMATED verification (roles, names,
 * states, focus); it is not a screen-reader check. Screenshots: E2E_SCREENSHOT_DIR (docs/screenshots/sprint-2c4).
 */
const SHOTS = process.env.E2E_SCREENSHOT_DIR;
const shot = async (page: Page, name: string, project: string) => {
  if (!SHOTS) return;
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SHOTS}/${project}-${name}.png`, scale: "css" });
};
const field = (page: Page, id: string) => page.locator(`[data-attribute-id="${id}"]`);
const nav = (page: Page) => page.getByRole("navigation", { name: "카테고리", exact: true });
const item = (page: Page, label: string) => nav(page).getByRole("treeitem", { name: label, exact: true });
const isMobile = async (page: Page) => page.locator(".nav-toggle").isVisible();
const openNav = async (page: Page) => {
  const toggle = page.locator(".nav-toggle");
  if ((await toggle.isVisible()) && (await toggle.getAttribute("aria-expanded")) !== "true") await toggle.click();
};
const focused = (page: Page) => page.evaluate(() => document.activeElement?.getAttribute("aria-label") ?? document.activeElement?.textContent?.trim().slice(0, 40) ?? "");

test("keyboard only: tree, search, palette, reset dialog + history, related-setting link, preview", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("tab", { name: /Detailed/ }).focus();
  await page.keyboard.press("Enter");
  await openNav(page);

  // tree → Shared › Camera › Lens & perspective
  await nav(page).getByRole("searchbox").focus();
  await page.keyboard.press("Tab");
  await expect(item(page, "기본")).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowLeft"); // collapse 인물
  await page.keyboard.press("ArrowDown");
  await expect(item(page, "공통")).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowDown");
  await expect(item(page, "렌즈 및 원근감")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { level: 2, name: "렌즈 및 원근감" })).toBeVisible();

  // search → Tab to the first result → Enter focuses the attribute
  await openNav(page);
  await nav(page).getByRole("searchbox").fill("주광 색상");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await expect(field(page, "lighting.key_color")).toBeFocused();

  // color palette: open with Enter, arrows browse (stays open), Space chooses → closed, focus on the toggle
  const toggle = field(page, "lighting.key_color").getByRole("button", { name: /색상 선택$/ });
  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(field(page, "lighting.key_color").getByRole("group", { name: /팔레트$/ })).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(field(page, "lighting.key_color").locator(".color-palette")).toHaveCount(1);
  await page.keyboard.press("Space");
  await expect(field(page, "lighting.key_color").locator(".color-palette")).toHaveCount(0);
  await expect(field(page, "lighting.key_color").getByRole("button", { name: /색상 변경$/ })).toBeFocused();

  // reset dialog: Enter opens (focus on Cancel), Tab stays inside, Escape restores; Shift+Tab → confirm → focus on undo
  const reset = page.getByTestId("category-reset");
  await reset.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByTestId("category-reset-dialog");
  await expect(dialog.getByRole("button", { name: "취소" })).toBeFocused();
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press("Tab");
    expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(reset).toBeFocused();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Shift+Tab");
  await expect(dialog.getByRole("button", { name: /값 초기화/ })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "카테고리 초기화 되돌리기" })).toBeFocused();

  // a second reset elsewhere; restore the OLDER one from the history with the keyboard
  await openNav(page);
  await item(page, "렌즈 및 원근감").locator(":scope > .cat-row").click();
  await field(page, "camera.lens_type").locator("label.chip").filter({ has: page.getByText("망원", { exact: true }) }).click();
  await reset.focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Enter");
  const summary = page.getByTestId("category-reset-history").locator("summary");
  await summary.focus();
  await page.keyboard.press("Enter");
  const older = page.getByRole("button", { name: /‘색상 및 색온도’ 초기화 되돌리기/ });
  await older.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("category-restore-notice")).toContainText("‘색상 및 색온도’의 값 1개를 복원했습니다.");

  // safety notice → related setting via keyboard → the age field is focused (nothing set)
  await openNav(page);
  await item(page, "인물").focus();
  await page.keyboard.press("ArrowRight"); // re-expand (collapsed above)
  await item(page, "인상 및 매력").locator(":scope > .cat-row").click();
  await field(page, "person.appearance.direction").getByRole("searchbox").fill("섹시");
  await field(page, "person.appearance.direction").getByRole("checkbox", { name: /^섹시한/ }).focus();
  await page.keyboard.press("Space");
  const link = field(page, "person.appearance.direction").getByRole("button", { name: "실제 연령 (연령) — 이 설정으로 이동" });
  await link.focus();
  await page.keyboard.press("Enter");
  await expect(field(page, "person.identity.age")).toBeFocused();

  // mobile preview sheet (non-modal): Enter opens (title focused), Escape closes (button focused)
  if (await isMobile(page)) {
    const button = page.getByRole("toolbar", { name: "프롬프트 도구" }).getByRole("button", { name: "미리보기" });
    await button.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { level: 2, name: "프롬프트 미리보기" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(button).toBeFocused();
  }
  expect(await focused(page)).not.toBe("");
});

test("keyboard only: preset dialog (test-only fixture page) opens with Enter, focus starts on Cancel, Escape returns to the opener", async ({ page }) => {
  await page.goto("/e2e-fixtures");
  await page.getByRole("tab", { name: /Detailed/ }).click();
  await openNav(page);
  await item(page, "조명").locator(":scope > .cat-row").click();
  const opener = page.getByRole("button", { name: /변경 내용 확인… 골든 장면/ });
  await opener.focus();
  await page.keyboard.press("Enter");
  const dlg = page.getByRole("dialog", { name: /프리셋 적용: 골든 장면/ });
  await expect(dlg.getByRole("button", { name: "취소" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dlg).toHaveCount(0);
  await expect(opener).toBeFocused();
});

test.describe("dark theme (prefers-color-scheme: dark)", () => {
  test.use({ colorScheme: "dark" });

  test("tokens apply; swatch rings, selection, warnings, safety notice, dialog, focus ring and preview stay distinguishable", async ({ page }, info) => {
    const project = info.project.name;
    await page.goto("/");
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(bg).toBe("rgb(20, 20, 19)"); // --bg dark
    expect(await page.evaluate(() => getComputedStyle(document.body).color)).toBe("rgb(236, 236, 234)");
    await page.locator("label.chip").filter({ has: page.getByText("인물 (1인)", { exact: true }) }).click();
    await shot(page, "dark-basic", project);

    await page.getByRole("tab", { name: /Detailed/ }).click();
    await openNav(page);
    await item(page, "상의").locator(":scope > .cat-row").click();
    await pickColor(page, "person.clothing.tops.primary_color", "블랙");
    // the ring around a black swatch is light in the dark theme (was a dark ring → invisible)
    expect(await field(page, "person.clothing.tops.primary_color").locator(".color-value .swatch").evaluate((e) => getComputedStyle(e).borderTopColor)).toBe("rgba(255, 255, 255, 0.45)");
    await field(page, "person.clothing.tops.primary_color").getByRole("button", { name: /색상 변경$/ }).click();
    await shot(page, "dark-palette", project);
    await page.keyboard.press("Escape");
    // focus ring uses the dark accent
    expect(await field(page, "person.clothing.tops.primary_color").getByRole("button", { name: /색상 변경$/ }).evaluate((e) => getComputedStyle(e).outlineColor)).toBe("rgb(124, 149, 255)");

    // a convention notice (info), a meaning-conflict warning and a safety hold together
    await openNav(page);
    await item(page, "렌즈 및 원근감").locator(":scope > .cat-row").click();
    await field(page, "camera.lens_type").locator("label.chip").filter({ has: page.getByText("망원", { exact: true }) }).click();
    await field(page, "camera.perspective").locator("label.chip").filter({ has: page.getByText("과장된", { exact: true }) }).click();
    await shot(page, "dark-diagnostics", project);
    await openNav(page);
    await item(page, "인상 및 매력").locator(":scope > .cat-row").click();
    await field(page, "person.appearance.direction").getByRole("searchbox").fill("섹시");
    await field(page, "person.appearance.direction").getByRole("checkbox", { name: /^섹시한/ }).check();
    const bar = page.getByRole("toolbar", { name: "프롬프트 도구" });
    if (await bar.isVisible()) await bar.getByRole("button", { name: /미리보기/ }).click();
    await expect(page.getByTestId("prompt-blocked")).toBeVisible();
    await shot(page, "dark-safety", project);
    if (await bar.isVisible()) await bar.getByRole("button", { name: /미리보기/ }).click();

    await page.getByTestId("category-reset").click();
    await expect(page.getByTestId("category-reset-dialog")).toBeVisible();
    await shot(page, "dark-dialog", project);
  });
});
