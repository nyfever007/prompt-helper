import { expect, test, type Page } from "@playwright/test";
import { pickColor, closePreview, ensurePreviewOpen, guardNetwork } from "./helpers";

/**
 * Sprint 2-B.5 — Expression, Impression, Makeup, Wardrobe & Accessories on the PRODUCT
 * catalog (/), desktop and mobile. Screenshots: set E2E_SCREENSHOT_DIR (docs/screenshots/sprint-2b5).
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
const pickListed = async (page: Page, id: string, query: string, role: "radio" | "checkbox", name: RegExp) => {
  await field(page, id).getByRole("searchbox").fill(query);
  await field(page, id).getByRole(role, { name }).check();
  await field(page, id).getByRole("searchbox").fill("");
};
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

test("expression, makeup, garments and accessories: independent values, none/applicability, exclusion, reset — persisted", async ({ page, baseURL }, info) => {
  const external = guardNetwork(page, baseURL!);
  const project = info.project.name;
  await page.goto("/");
  await page.getByRole("tab", { name: /Detailed/ }).click();

  await go(page, "표정");
  await slide(page, "person.expression.emotion_intensity", -1);
  await expect(page.getByTestId("slider-value-person.expression.emotion_intensity")).toHaveText("은은함");
  await pickChip(page, "person.expression.smile", "부드러운 미소");
  await shot(page, "expression", project);

  await go(page, "인상 및 매력");
  await pickChip(page, "person.impression.overall", "친근한");
  await pickChip(page, "person.impression.overall", "세련된");

  await go(page, "메이크업");
  await pickListed(page, "person.makeup.style", "내추럴", "checkbox", /^내추럴/);
  await pickChip(page, "person.makeup.base_finish", "듀이");
  await pickColor(page, "person.makeup.lip_color", "더스티 로즈");
  await shot(page, "makeup", project);

  await go(page, "전체 설정");
  await pickListed(page, "person.clothing.fashion_style", "스마트 캐주얼", "checkbox", /^스마트 캐주얼/);

  await go(page, "상의");
  await pickListed(page, "person.clothing.tops.type", "버튼다운", "radio", /^버튼다운 셔츠/);
  await pickColor(page, "person.clothing.tops.primary_color", "아이보리");
  await pickListed(page, "person.clothing.tops.material", "린넨", "radio", /^린넨/);
  await pickChip(page, "person.clothing.tops.fit", "오버사이즈");
  await field(page, "person.clothing.tops.fit").getByRole("switch", { name: /프롬프트에 포함/ }).uncheck();
  await shot(page, "tops", project);

  await go(page, "하의");
  await pickListed(page, "person.clothing.bottoms.type", "테일러드", "radio", /^테일러드 바지/);
  await pickColor(page, "person.clothing.bottoms.primary_color", "네이비");

  await go(page, "신발");
  await pickListed(page, "person.clothing.footwear.type", "로퍼", "radio", /^로퍼/);
  await pickColor(page, "person.clothing.footwear.primary_color", "초콜릿 브라운");
  await pickListed(page, "person.clothing.footwear.material", "가죽", "radio", /^가죽/);
  await pickChip(page, "person.clothing.footwear.heel_type", "블록 힐");
  await pickChip(page, "person.clothing.footwear.heel_height", "플랫"); // flat heels: the heel type is kept but not output
  await expect(field(page, "person.clothing.footwear.heel_type")).toContainText("현재 선택에는 적용되지 않습니다");
  await shot(page, "footwear-applicability", project);

  await go(page, "액세서리");
  await pickChip(page, "person.accessories.eyewear", "안경");
  await pickChip(page, "person.accessories.frame_shape", "둥근");
  await pickChip(page, "person.accessories.necklace", "펜던트 목걸이");
  await shot(page, "accessories", project);

  const expected =
    "Emotional expression intensity: subtle. Smile: gentle smile. Visual impression: approachable, refined. Makeup style: natural. Foundation finish: dewy. " +
    "Lip makeup color: dusty rose. Fashion style: smart casual. Top: button-down shirt. Top primary color: ivory. Top material: linen. " +
    "Bottom: tailored trousers. Bottom primary color: navy. Footwear: loafers. Footwear primary color: chocolate brown. Footwear material: leather. " +
    "Footwear heel height: flat. Eyewear: eyeglasses. Eyewear frame shape: round frames. Necklace: pendant necklace.";
  await ensurePreviewOpen(page);
  await expect(output(page)).toHaveText(expected);
  await shot(page, "preview", project);

  const before = await stored(page);
  expect(Object.keys(before)).toHaveLength(21);
  expect(before["person.clothing.tops.fit"].excludedFromPrompt).toBe(true);
  expect(before["person.clothing.footwear.heel_type"].value).toEqual({ kind: "single", optionId: "block" }); // kept while inactive
  expect(before["person.clothing.tops.primary_color"].value).toEqual({ kind: "single", optionId: "ivory" });
  expect(before["person.clothing.bottoms.primary_color"].value).toEqual({ kind: "single", optionId: "navy" });

  await page.reload();
  await page.getByRole("tab", { name: /Detailed/ }).click();
  await ensurePreviewOpen(page);
  await expect(output(page)).toHaveText(expected);
  expect(await stored(page)).toEqual(before);

  // Resetting the parent 의상 clears every garment subcategory (excluded + inactive values included) and can be undone
  await closePreview(page); // mobile: the long preview sheet would cover the reset button
  await go(page, "의상");
  await closeNav(page);
  await page.getByTestId("category-reset").click();
  await expect(page.getByTestId("category-reset-dialog")).toContainText("12개를 모두 지웁니다");
  await shot(page, "reset-dialog", project);
  await page.getByTestId("category-reset-dialog").getByRole("button", { name: "12개 값 초기화" }).click();
  expect(Object.keys(await stored(page))).toHaveLength(9);
  await page.getByRole("button", { name: "카테고리 초기화 되돌리기" }).click();
  expect(await stored(page)).toEqual(before);
  expect(external).toEqual([]);
});
