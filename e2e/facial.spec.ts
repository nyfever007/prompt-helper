import { expect, test, type Page } from "@playwright/test";
import { pickColor, ensurePreviewOpen, guardNetwork, pickOption } from "./helpers";

/**
 * Sprint 2-B.2 — Person › Face, Eyes, Eyebrows, Nose, Lips on the PRODUCT catalog (/), desktop and mobile.
 * Screenshots: set E2E_SCREENSHOT_DIR (docs/screenshots/sprint-2b2).
 */
const SHOTS = process.env.E2E_SCREENSHOT_DIR;
const shot = async (page: Page, name: string, project: string) => {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${project}-${name}.png`, fullPage: true, scale: "css" });
};
const output = (page: Page) => page.getByTestId("prompt-output");
const field = (page: Page, id: string) => page.locator(`[data-attribute-id="${id}"]`);
const nav = (page: Page) => page.getByRole("navigation", { name: "카테고리" });
const pickChip = (page: Page, id: string, label: string) => pickOption(page, id, label); // chips or visual cards
const go = async (page: Page, label: string) => {
  const toggle = page.locator(".nav-toggle");
  if ((await toggle.isVisible()) && (await toggle.getAttribute("aria-expanded")) !== "true") await toggle.click();
  await nav(page).getByRole("treeitem", { name: label, exact: true }).locator(":scope > .cat-row").click() // the row itself (an expanded item also contains its children);
};
/** Relative slider: the unset display sits in the middle (3); each arrow key is one explicit user step. */
const slide = async (page: Page, id: string, steps: number) => {
  const slider = field(page, id).getByRole("slider");
  await slider.focus();
  for (let i = 0; i < Math.abs(steps); i++) await slider.press(steps > 0 ? "ArrowRight" : "ArrowLeft");
};
const stored = async (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem("prompter:v1:workspace") ?? "{}").spec?.selections ?? {});

test("facial features: shapes, relative sliders, colors, multi traits, custom values, exclusion, reset — persisted", async ({ page, baseURL }, info) => {
  const external = guardNetwork(page, baseURL!);
  const project = info.project.name;
  await page.goto("/");
  await page.getByRole("tab", { name: /Detailed/ }).click();

  // Face: shape + combinable traits; focusing a slider stores nothing
  await go(page, "얼굴");
  await field(page, "person.face.shape").getByRole("radio", { name: /^계란형/ }).check(); // visual cards (Sprint 2-D.1)
  await field(page, "person.face.jawline").getByRole("checkbox", { name: /^부드러운/ }).check(); // visual cards (Sprint 2-D.2)
  await field(page, "person.face.jawline").getByRole("checkbox", { name: /^둥근/ }).check();
  await pickChip(page, "person.face.cheeks", "통통한");
  await field(page, "person.face.length").getByRole("slider").focus();
  await expect(field(page, "person.face.length")).toHaveAttribute("data-state", "unset");
  await shot(page, "face", project);

  // Eyes: shape, relative sliders (band label only), palette color
  await go(page, "눈");
  await field(page, "person.eyes.shape").getByRole("radio", { name: /^아몬드형/ }).check(); // visual cards (Sprint 2-D.1)
  await slide(page, "person.eyes.size", 1);
  await expect(page.getByTestId("slider-value-person.eyes.size")).toHaveText("큼");
  await slide(page, "person.eyes.outer_corner_angle", 1);
  await pickColor(page, "person.eyes.iris_color", "짙은 갈색");
  await shot(page, "eyes", project);

  // Eyebrows, nose (shape covers the same bridge meaning), lips with exclusion
  await go(page, "눈썹");
  await field(page, "person.eyebrows.shape").getByRole("radio", { name: /^완만한 아치/ }).check(); // visual cards (Sprint 2-D.1)
  await go(page, "코");
  await field(page, "person.nose.shape").getByRole("radio", { name: /^매부리형/ }).check(); // visual cards (Sprint 2-D.2)
  await field(page, "person.nose.bridge_shape").getByRole("radio", { name: /^볼록한/ }).check();
  await expect(page.getByTestId("covered-person.nose.bridge_shape")).toBeVisible();
  await go(page, "입술");
  await slide(page, "person.lips.lower_thickness", 1);
  await pickColor(page, "person.lips.natural_color", "장밋빛");
  await field(page, "person.lips.natural_color").getByRole("switch", { name: /프롬프트에 포함/ }).uncheck();
  await shot(page, "lips", project);

  const expected =
    "Face shape: oval. Jawline: rounded, soft. Cheeks: full. Eye shape: almond-shaped. Eye size: large. Outer eye corners: slightly upturned. " +
    "Iris color: dark brown. Eyebrow shape: softly arched. Nose shape: aquiline. Lower lip: full.";
  await ensurePreviewOpen(page);
  await expect(output(page)).toHaveText(expected);
  await shot(page, "preview", project);

  const before = await stored(page);
  expect(before["person.eyes.size"].value).toEqual({ kind: "number", value: 4 });
  expect(before["person.face.length"]).toBeUndefined(); // focus/display never stores
  expect(before["person.lips.natural_color"].excludedFromPrompt).toBe(true);
  expect(Object.keys(before)).toHaveLength(12);

  await page.reload();
  await page.getByRole("tab", { name: /Detailed/ }).click();
  await ensurePreviewOpen(page);
  await expect(output(page)).toHaveText(expected);
  expect(await stored(page)).toEqual(before);

  // Category reset of “눈” clears only the eyes area; undo restores it
  await go(page, "눈");
  const toggle = page.locator(".nav-toggle");
  if ((await toggle.isVisible()) && (await toggle.getAttribute("aria-expanded")) === "true") await toggle.click();
  await page.getByTestId("category-reset").click();
  await expect(page.getByTestId("category-reset-dialog")).toContainText("4개를 모두 지웁니다");
  await page.getByTestId("category-reset-dialog").getByRole("button", { name: "4개 값 초기화" }).click();
  const afterReset = await stored(page);
  expect(Object.keys(afterReset).filter((k) => k.startsWith("person.eyes."))).toEqual([]);
  expect(Object.keys(afterReset)).toHaveLength(8);
  await page.getByRole("button", { name: "카테고리 초기화 되돌리기" }).click();
  expect(await stored(page)).toEqual(before);
  expect(external).toEqual([]);
});

test("face builder (Sprint 2-D.2): one sketch of the face settings, redrawn live by sliders and cards; nothing extra is stored", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("tab", { name: /Detailed/ }).click();
  await go(page, "눈");
  const builder = page.getByTestId("face-builder");
  const front = builder.getByRole("img", { name: /^정면 스케치/ });
  await expect(front).toHaveAccessibleName("정면 스케치 — 설정 0개 반영");
  const box = await front.boundingBox();
  expect(box!.width).toBeGreaterThan(100); // rendered, not collapsed (desktop and mobile)
  const before = await front.innerHTML();
  const preview = page.getByTestId("slider-preview-person.eyes.spacing");
  const previewBefore = await preview.innerHTML();
  await slide(page, "person.eyes.spacing", 2);
  await expect(page.getByTestId("slider-value-person.eyes.spacing")).toHaveText("아주 넓음");
  expect(await preview.innerHTML()).not.toBe(previewBefore);
  await field(page, "person.eyes.eyelids").getByRole("checkbox", { name: /^덮인 눈꺼풀/ }).check();
  expect(await front.innerHTML()).not.toBe(before);
  await expect(front).toHaveAccessibleName("정면 스케치 — 설정 2개 반영");
  expect(Object.keys(await stored(page)).sort()).toEqual(["person.eyes.eyelids", "person.eyes.spacing"]);
  // collapsing is a view choice only, kept while moving between face pages
  await builder.locator("summary").click();
  await go(page, "코");
  await expect(page.getByTestId("face-builder")).not.toHaveAttribute("open", "");
});
