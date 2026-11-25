import { expect, test, type Page } from "@playwright/test";
import { closePreview, ensurePreviewOpen, guardNetwork } from "./helpers";

/**
 * Sprint 2-C.3 — sexual appeal needs a set adult age (TD-15), person settings without a subject
 * (TD-14), intimate apparel as a classification (TD-12), on the PRODUCT catalog (/), desktop and mobile.
 * Screenshots: E2E_SCREENSHOT_DIR (docs/screenshots/sprint-2c3).
 */
const SHOTS = process.env.E2E_SCREENSHOT_DIR;
const shot = async (page: Page, name: string, project: string, fullPage = false) => {
  if (!SHOTS) return;
  await page.waitForTimeout(300); // screenshots only: let the mobile preview sheet finish sliding in
  await page.screenshot({ path: `${SHOTS}/${project}-${name}.png`, fullPage, scale: "css" });
};
const output = (page: Page) => page.getByTestId("prompt-output");
const field = (page: Page, id: string) => page.locator(`[data-attribute-id="${id}"]`);
const nav = (page: Page) => page.getByRole("navigation", { name: "카테고리", exact: true });
const go = async (page: Page, label: string) => {
  const toggle = page.locator(".nav-toggle");
  if ((await toggle.isVisible()) && (await toggle.getAttribute("aria-expanded")) !== "true") await toggle.click();
  await nav(page).getByRole("treeitem", { name: label, exact: true }).locator(":scope > .cat-row").click();
};
const stored = async (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem("prompter:v1:workspace") ?? "{}").spec?.selections ?? {});
const AD = "person.appearance.direction";
const pick = async (page: Page, query: string, name: RegExp) => {
  await field(page, AD).getByRole("searchbox").fill(query);
  await field(page, AD).getByRole("checkbox", { name }).check();
  await field(page, AD).getByRole("searchbox").fill("");
};

test("TD-15: “섹시한” in Basic is withheld until an adult age is set; the notice links to the age setting; every output path is gated", async ({ page, baseURL }, info) => {
  const external = guardNetwork(page, baseURL!);
  const project = info.project.name;
  await page.goto("/");
  await page.locator("label.chip").filter({ has: page.getByText("인물 (1인)", { exact: true }) }).click();
  await pick(page, "아름다운", /^아름다운/);
  await ensurePreviewOpen(page);
  await expect(output(page)).toHaveText("Main subject: a single person. Appearance direction: beautiful."); // general appearance: no age needed
  await closePreview(page);
  await pick(page, "섹시", /^섹시한/);
  await ensurePreviewOpen(page);
  const blocked = page.getByTestId("prompt-blocked");
  await expect(blocked).toContainText("이 표현을 사용하려면 인물의 성인 연령 정보를 명확하게 설정해야 합니다");
  await expect(page.getByRole("button", { name: "프롬프트 복사", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "프롬프트 .txt 내보내기" })).toBeDisabled();
  await shot(page, "withheld-basic", project);

  await blocked.getByRole("button", { name: "연령대 (연령) — 이 설정으로 이동" }).click();
  await expect(page.getByRole("tab", { name: /Detailed/ })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("heading", { level: 2, name: "연령" })).toBeVisible();
  await expect(field(page, "person.identity.age_group")).toBeFocused();
  expect(Object.keys(await stored(page)).sort()).toEqual([AD, "subject.kind"]); // nothing set automatically
  await shot(page, "age-setting", project);

  await field(page, "person.identity.age_group").getByRole("combobox").selectOption("young_adult");
  await ensurePreviewOpen(page);
  await expect(output(page)).toHaveText("Main subject: a single person. Appearance direction: beautiful, sexy. Age group: young adult.");
  await shot(page, "released-adult", project);
  await closePreview(page);
  expect(external).toEqual([]);
});

test("TD-14 / TD-12: person settings without a subject; intimate apparel is neutral for adults and blocked with a minor", async ({ page }, info) => {
  const project = info.project.name;
  await page.goto("/");
  await page.getByRole("tab", { name: /Detailed/ }).click();
  await go(page, "인상 및 매력");
  await pick(page, "우아한", /^우아한/);
  await go(page, "내의");
  await field(page, "person.clothing.innerwear.type").getByRole("searchbox").fill("브리프");
  await field(page, "person.clothing.innerwear.type").getByRole("radio", { name: /^브리프/ }).check();
  await ensurePreviewOpen(page);
  await expect(output(page)).toHaveText("Appearance direction: elegant. Innerwear: briefs."); // no subject sentence is invented
  await shot(page, "no-subject", project);
  await closePreview(page);
  expect(Object.keys(await stored(page)).sort()).toEqual([AD, "person.clothing.innerwear.type"]);

  await go(page, "연령");
  await field(page, "person.identity.age_group").getByRole("combobox").selectOption("adolescent");
  await ensurePreviewOpen(page);
  await expect(page.getByTestId("prompt-blocked")).toContainText("속옷류 의복");
  await shot(page, "minor-intimate", project);
  await closePreview(page);
  await field(page, "person.identity.age_group").getByRole("combobox").selectOption("middle_aged");
  await ensurePreviewOpen(page);
  await expect(output(page)).toContainText("Innerwear: briefs.");
});
