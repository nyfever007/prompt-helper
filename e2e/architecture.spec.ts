import { expect, test, type Page } from "@playwright/test";
import { closePreview, ensurePreviewOpen, guardNetwork, pickOption } from "./helpers";

/**
 * Sprint 2-C.2 — category reset history (TD-09) and contradiction / convention diagnostics (TD-10)
 * on the PRODUCT catalog (/), desktop and mobile. Screenshots: E2E_SCREENSHOT_DIR (docs/screenshots/sprint-2c2).
 */
const SHOTS = process.env.E2E_SCREENSHOT_DIR;
const shot = async (page: Page, name: string, project: string, fullPage = false) => {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${project}-${name}.png`, fullPage, scale: "css" });
};
const output = (page: Page) => page.getByTestId("prompt-output");
const field = (page: Page, id: string) => page.locator(`[data-attribute-id="${id}"]`);
const nav = (page: Page) => page.getByRole("navigation", { name: "카테고리", exact: true });
const go = async (page: Page, label: string) => {
  const toggle = page.locator(".nav-toggle");
  if ((await toggle.isVisible()) && (await toggle.getAttribute("aria-expanded")) !== "true") await toggle.click();
  await nav(page).getByRole("treeitem", { name: label, exact: true }).locator(":scope > .cat-row").click();
};
const pickChip = (page: Page, id: string, label: string) => pickOption(page, id, label); // chips or visual cards
const stored = async (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem("prompter:v1:workspace") ?? "{}").spec?.selections ?? {});
const resetPage = async (page: Page, n: number) => {
  await page.getByTestId("category-reset").click();
  await page.getByTestId("category-reset-dialog").getByRole("button", { name: `${n}개 값 초기화` }).click();
};

test("diagnostics: meaning conflict vs convention, related settings, prompt unchanged", async ({ page, baseURL }, info) => {
  const external = guardNetwork(page, baseURL!);
  const project = info.project.name;
  await page.goto("/");
  await page.getByRole("tab", { name: /Detailed/ }).click();

  await go(page, "코");
  await field(page, "person.nose.shape").getByRole("radio", { name: /^들린 코/ }).check(); // visual cards (Sprint 2-D.2)
  const tip = field(page, "person.nose.tip_angle").getByRole("slider");
  await tip.focus();
  await tip.press("ArrowLeft"); // unset display 3 → 2 (an explicit user step)
  const conflict = field(page, "person.nose.shape").locator('[data-code="rule.nose-upturned-shape-vs-downward-tip"]');
  await expect(conflict).toContainText("의미 충돌");
  await expect(conflict).toContainText("관련 설정: 코끝 각도 (코)");
  await conflict.scrollIntoViewIfNeeded();
  await shot(page, "diagnostic-contradiction", project);

  await go(page, "렌즈 및 원근감");
  await pickChip(page, "camera.lens_type", "망원");
  await pickChip(page, "camera.perspective", "과장된");
  const convention = field(page, "camera.lens_type").locator('[data-code="rule.camera-telephoto-vs-exaggerated-perspective"]');
  await expect(convention).toContainText("관례와 다름");
  await expect(convention).toContainText("일반적인 사진 촬영 관례와 다를 수 있습니다");
  await convention.scrollIntoViewIfNeeded();
  await shot(page, "diagnostic-convention", project);

  await ensurePreviewOpen(page);
  await expect(output(page)).toHaveText("Nose shape: upturned. Nasal tip angle: slightly downward-pointing. Lens: telephoto lens. Perspective: exaggerated perspective.");
  await expect(page.locator('.preview__notes [data-basis="convention"]')).toHaveCount(1);
  await expect(page.locator('.preview__notes [data-basis="contradiction"]')).toHaveCount(1);
  await shot(page, "diagnostic-preview", project);
  await closePreview(page);
  expect(external).toEqual([]);
});

test("reset history: two resets, restore the older one, a later edit is kept; history is session-only", async ({ page }, info) => {
  const project = info.project.name;
  await page.goto("/");
  await page.getByRole("tab", { name: /Detailed/ }).click();
  await go(page, "렌즈 및 원근감");
  await pickChip(page, "camera.lens_type", "망원");
  await go(page, "주광");
  await pickChip(page, "lighting.direction", "측광");
  await pickChip(page, "lighting.softness", "부드러운");

  await go(page, "렌즈 및 원근감");
  await resetPage(page, 1);
  await go(page, "주광");
  await resetPage(page, 2);
  await pickChip(page, "lighting.direction", "역광"); // a later edit

  const bar = page.getByTestId("category-reset-bar");
  await expect(bar).toContainText("‘주광’을(를) 초기화했습니다 (값 2개)");
  await expect(bar).toContainText("이후 1개 직접 수정 — 현재 값 유지");
  await bar.getByText("이전 초기화 1개").click();
  await expect(bar.getByTestId("category-reset-history")).toContainText("‘렌즈 및 원근감’ — 값 1개");
  await shot(page, "reset-history", project);

  await bar.getByRole("button", { name: /‘렌즈 및 원근감’ 초기화 되돌리기/ }).click();
  expect((await stored(page))["camera.lens_type"].value).toEqual({ kind: "single", optionId: "telephoto" });
  await page.getByRole("button", { name: "카테고리 초기화 되돌리기" }).click();
  await expect(page.getByTestId("category-restore-notice")).toContainText("초기화 후 직접 수정해서 현재 상태를 유지한 항목: 빛의 방향.");
  await shot(page, "reset-restored", project);
  const after = await stored(page);
  expect(after["lighting.direction"].value).toEqual({ kind: "single", optionId: "back" });
  expect(after["lighting.softness"].value).toEqual({ kind: "single", optionId: "soft" });

  // Session only: the values persist, the history does not.
  await go(page, "주광");
  await resetPage(page, 2);
  await page.reload();
  await page.getByRole("tab", { name: /Detailed/ }).click();
  await expect(page.getByTestId("category-reset-bar")).toHaveCount(0);
  expect(Object.keys(await stored(page))).toEqual(["camera.lens_type"]);
});
