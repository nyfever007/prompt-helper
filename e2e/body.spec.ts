import { expect, test, type Page } from "@playwright/test";
import { ensurePreviewOpen, guardNetwork } from "./helpers";

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
const pickChip = (page: Page, id: string, label: string) =>
  field(page, id).locator("label.chip").filter({ has: page.getByText(label, { exact: true }) }).click();
const go = async (page: Page, label: string) => {
  const toggle = page.locator(".nav-toggle");
  if ((await toggle.isVisible()) && (await toggle.getAttribute("aria-expanded")) !== "true") await toggle.click();
  await nav(page).getByRole("button", { name: label, exact: true }).click();
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
  await pickChip(page, "person.body.build", "운동형");
  await pickChip(page, "person.body.proportions", "자연스러운");
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
  await pickChip(page, "person.body.leg_alignment", "곧은 다리");
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

  // Resetting the parent 신체 clears all subcategories (excluded value included) and can be undone
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
