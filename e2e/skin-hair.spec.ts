import { expect, test, type Page } from "@playwright/test";
import { pickColor, ensurePreviewOpen, guardNetwork } from "./helpers";

/**
 * Sprint 2-B.3 — Person › Skin, Hair, Facial hair on the PRODUCT catalog (/), desktop and mobile.
 * Screenshots: set E2E_SCREENSHOT_DIR (docs/screenshots/sprint-2b3).
 */
const SHOTS = process.env.E2E_SCREENSHOT_DIR;
const shot = async (page: Page, name: string, project: string) => {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${project}-${name}.png`, fullPage: true, scale: "css" });
};
const output = (page: Page) => page.getByTestId("prompt-output");
const field = (page: Page, id: string) => page.locator(`[data-attribute-id="${id}"]`);
const nav = (page: Page) => page.getByRole("navigation", { name: "카테고리" });
const pickChip = (page: Page, id: string, label: string) =>
  field(page, id).locator("label.chip").filter({ has: page.getByText(label, { exact: true }) }).click();
const go = async (page: Page, label: string) => {
  const toggle = page.locator(".nav-toggle");
  if ((await toggle.isVisible()) && (await toggle.getAttribute("aria-expanded")) !== "true") await toggle.click();
  await nav(page).getByRole("treeitem", { name: label, exact: true }).locator(":scope > .cat-row").click() // the row itself (an expanded item also contains its children);
};
const closeNav = async (page: Page) => {
  const toggle = page.locator(".nav-toggle");
  if ((await toggle.isVisible()) && (await toggle.getAttribute("aria-expanded")) === "true") await toggle.click();
};
const stored = async (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem("prompter:v1:workspace") ?? "{}").spec?.selections ?? {});

test("skin, hair and facial hair: palettes, groups, none vs unset, applicability with preserved values, reset — persisted", async ({ page, baseURL }, info) => {
  const external = guardNetwork(page, baseURL!);
  const project = info.project.name;
  await page.goto("/");
  await page.getByRole("tab", { name: /Detailed/ }).click();

  // Skin: grouped palette, explicit-none-aware freckles
  await go(page, "피부");
  await pickColor(page, "person.skin.tone", "밝은 베이지");
  await pickChip(page, "person.skin.undertone", "웜");
  await pickChip(page, "person.skin.freckle_density", "적음");
  await pickChip(page, "person.skin.freckle_placement", "코");
  await pickChip(page, "person.skin.freckle_placement", "볼");
  await shot(page, "skin", project);

  // Hair: bald hides (but keeps) the hairstyle; back to “hair present” restores it
  await go(page, "헤어");
  await pickChip(page, "person.hair.length", "허리 길이");
  await pickColor(page, "person.hair.primary_color", "짙은 갈색");
  await pickColor(page, "person.hair.secondary_color", "허니 블론드");
  await field(page, "person.hair.style").getByRole("searchbox").fill("반묶음 번");
  await field(page, "person.hair.style").getByRole("radio", { name: /^반묶음 번/ }).check();
  await field(page, "person.hair.style").getByRole("searchbox").fill("");
  await pickChip(page, "person.hair.presence", "대머리");
  await expect(field(page, "person.hair.style").getByText(/현재 선택에는 적용되지 않습니다/)).toBeVisible();
  await shot(page, "hair-bald-inactive", project);
  await pickChip(page, "person.hair.presence", "모발 있음");
  await shot(page, "hair", project);

  // Facial hair: combinable styles; color from the hair palette
  await go(page, "수염");
  await field(page, "person.facial_hair.style").getByRole("checkbox", { name: /^콧수염/ }).check();
  await field(page, "person.facial_hair.style").getByRole("checkbox", { name: /^염소수염/ }).check();
  await pickColor(page, "person.facial_hair.color", "희끗희끗한");
  await shot(page, "facial-hair", project);

  const expected =
    "Skin tone: light beige. Skin undertone: warm. Freckles: sparse. Freckle placement: nose, cheeks. Hair presence: hair present. Hair length: waist-length. " +
    "Primary hair color: dark brown. Secondary hair color: honey blonde. Hairstyle: half-up bun. Facial hair: mustache, goatee. Facial hair color: salt-and-pepper.";
  await ensurePreviewOpen(page);
  await expect(output(page)).toHaveText(expected);
  await shot(page, "preview", project);

  const before = await stored(page);
  expect(Object.keys(before)).toHaveLength(11);
  await page.reload();
  await page.getByRole("tab", { name: /Detailed/ }).click();
  await ensurePreviewOpen(page);
  await expect(output(page)).toHaveText(expected);
  expect(await stored(page)).toEqual(before);

  // Category reset of “헤어” clears only hair (5 values: presence, length, 2 colors, style) and can be undone
  await go(page, "헤어");
  await closeNav(page);
  await page.getByTestId("category-reset").click();
  await expect(page.getByTestId("category-reset-dialog")).toContainText("5개를 모두 지웁니다");
  await page.getByTestId("category-reset-dialog").getByRole("button", { name: "5개 값 초기화" }).click();
  expect(Object.keys(await stored(page)).filter((k) => k.startsWith("person.hair."))).toEqual([]);
  await page.getByRole("button", { name: "카테고리 초기화 되돌리기" }).click();
  expect(await stored(page)).toEqual(before);
  expect(external).toEqual([]);
});
