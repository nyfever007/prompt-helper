import { expect, test, type Page } from "@playwright/test";
import { closePreview, ensurePreviewOpen, guardNetwork } from "./helpers";

/**
 * Sprint 2-B.4 — Person › Body on the PRODUCT catalog (/), desktop and mobile.
 * Screenshots: set E2E_SCREENSHOT_DIR (docs/screenshots/sprint-2b4).
 */
const SHOTS = process.env.E2E_SCREENSHOT_DIR;
const shot = async (page: Page, name: string, project: string) => {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${project}-${name}.png`, fullPage: true, scale: "css" });
};
const output = (page: Page) => page.getByTestId("prompt-output");
const field = (page: Page, id: string) => page.locator(`[data-attribute-id="${id}"]`);
const nav = (page: Page) => page.getByRole("navigation", { name: "카테고리" });
const go = async (page: Page, label: string) => {
  const toggle = page.locator(".nav-toggle");
  if ((await toggle.isVisible()) && (await toggle.getAttribute("aria-expanded")) !== "true") await toggle.click();
  await nav(page).getByRole("treeitem", { name: label, exact: true }).locator(":scope > .cat-row").click() // the row itself (an expanded item also contains its children);
};
const closeNav = async (page: Page) => {
  const toggle = page.locator(".nav-toggle");
  if ((await toggle.isVisible()) && (await toggle.getAttribute("aria-expanded")) === "true") await toggle.click();
};
/** Relative slider: the unset display sits in the middle; each arrow key is one explicit user step. */
const slide = async (page: Page, id: string, steps: number) => {
  const slider = field(page, id).getByRole("slider");
  await slider.focus();
  for (let i = 0; i < Math.abs(steps); i++) await slider.press(steps > 0 ? "ArrowRight" : "ArrowLeft");
};
const stored = async (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem("prompter:v1:workspace") ?? "{}").spec?.selections ?? {});

test("body: subcategories, build, relative sliders, heads tall, exclusion, reset — persisted", async ({ page, baseURL }, info) => {
  const external = guardNetwork(page, baseURL!);
  const project = info.project.name;
  await page.goto("/");
  await page.getByRole("tab", { name: /Detailed/ }).click();

  await go(page, "전체 신체");
  await slide(page, "person.body.height", 1);
  await expect(page.getByTestId("slider-value-person.body.height")).toHaveText("큼");
  await field(page, "person.body.build").getByRole("radio", { name: /^운동형/ }).check(); // visual cards (Sprint 2-D.3)
  await field(page, "person.body.proportions").getByRole("radio", { name: /^자연스러운/ }).check(); // visual cards (Sprint 2-D.3)
  await field(page, "person.body.muscle_mass").getByRole("slider").focus(); // focus alone stores nothing
  await shot(page, "general", project);

  await go(page, "신체 비율");
  await slide(page, "person.body.heads_tall", 4); // 6 → 8 heads tall (half steps)
  await expect(page.getByTestId("slider-value-person.body.heads_tall")).toHaveText("8 heads tall");
  await shot(page, "proportions", project);

  await go(page, "목·어깨");
  await slide(page, "person.body.shoulder_width", 1);
  await go(page, "팔·손");
  await slide(page, "person.body.arm_length", 1);
  await go(page, "다리·발");
  await slide(page, "person.body.leg_length", 1);
  await field(page, "person.body.leg_alignment").getByRole("radio", { name: /^곧은 다리/ }).check(); // visual cards (Sprint 2-D.3)
  await field(page, "person.body.leg_alignment").getByRole("switch", { name: /프롬프트에 포함/ }).uncheck();
  await shot(page, "legs-excluded", project);

  const expected =
    "Height: tall. Body build: athletic. Body proportions: natural. Head-to-body proportions: 8 heads tall. Shoulder width: broad. Arm length: long. Leg length: long.";
  await ensurePreviewOpen(page);
  await expect(output(page)).toHaveText(expected);
  await shot(page, "preview", project);

  const before = await stored(page);
  expect(Object.keys(before)).toHaveLength(8);
  expect(before["person.body.muscle_mass"]).toBeUndefined();
  expect(before["person.body.heads_tall"].value).toEqual({ kind: "number", value: 8 });
  expect(before["person.body.leg_alignment"].excludedFromPrompt).toBe(true);

  await page.reload();
  await page.getByRole("tab", { name: /Detailed/ }).click();
  await ensurePreviewOpen(page);
  await expect(output(page)).toHaveText(expected);
  expect(await stored(page)).toEqual(before);

  // Resetting the parent 신체 clears all subcategories (excluded value included) and can be undone.
  // On mobile the open preview sheet (taller since 2-D.7: detail and length / cost) can cover the reset button — keep it closed.
  await closePreview(page);
  await go(page, "신체");
  await closeNav(page);
  await page.getByTestId("category-reset").click();
  await expect(page.getByTestId("category-reset-dialog")).toContainText("8개를 모두 지웁니다");
  await shot(page, "reset-dialog", project);
  await page.getByTestId("category-reset-dialog").getByRole("button", { name: "8개 값 초기화" }).click();
  expect(await stored(page)).toEqual({});
  await page.getByRole("button", { name: "카테고리 초기화 되돌리기" }).click();
  expect(await stored(page)).toEqual(before);
  expect(external).toEqual([]);
});

test("figure builder (Sprint 2-D.3): body, garment and hair settings drawn on one neutral mannequin; nothing extra is stored", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("tab", { name: /Detailed/ }).click();
  await go(page, "전체 신체");
  const figure = page.getByTestId("figure-builder").getByRole("img", { name: /^전신 스케치/ });
  await expect(figure).toHaveAccessibleName("전신 스케치 — 설정 0개 반영");
  expect((await figure.boundingBox())!.height).toBeGreaterThan(150); // rendered, not collapsed (desktop and mobile)
  const before = await figure.innerHTML();
  await field(page, "person.body.build").getByRole("radio", { name: /^근육질/ }).check();
  expect(await figure.innerHTML()).not.toBe(before);
  const preview = page.getByTestId("slider-preview-person.body.height");
  const previewBefore = await preview.innerHTML();
  await slide(page, "person.body.height", 2);
  expect(await preview.innerHTML()).not.toBe(previewBefore);
  await go(page, "하의");
  await field(page, "person.clothing.bottoms.type").getByRole("radio", { name: /^와이드 청바지/ }).check();
  await expect(page.getByTestId("figure-builder").getByRole("img", { name: /^전신 스케치/ })).toHaveAccessibleName("전신 스케치 — 설정 3개 반영");
  expect(Object.keys(await stored(page)).sort()).toEqual(["person.body.build", "person.body.height", "person.clothing.bottoms.type"]);
});
