import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import { ensurePreviewOpen, guardNetwork } from "./helpers";

/**
 * Sprint 2-B.1 — Person › Identity on the PRODUCT catalog (/), desktop and mobile.
 * Screenshots: set E2E_SCREENSHOT_DIR (docs/screenshots/sprint-2b1).
 */
const SHOTS = process.env.E2E_SCREENSHOT_DIR;
const shot = async (page: Page, name: string, project: string, locator?: ReturnType<Page["locator"]>) => {
  if (!SHOTS) return;
  if (locator) await locator.screenshot({ path: `${SHOTS}/${project}-${name}.png`, scale: "css" });
  else await page.screenshot({ path: `${SHOTS}/${project}-${name}.png`, fullPage: true, scale: "css" });
};
const P = "person.identity.";
const output = (page: Page) => page.getByTestId("prompt-output");
const field = (page: Page, id: string) => page.locator(`[data-attribute-id="${id}"]`);
const nav = (page: Page) => page.getByRole("navigation", { name: "카테고리" });
/** Chips hide their input visually (pointer-events: none): click the chip label, as users do. */
const pickChip = (page: Page, id: string, label: string) =>
  field(page, id).locator("label.chip").filter({ has: page.getByText(label, { exact: true }) }).click();
const go = async (page: Page, label: string) => {
  const toggle = page.locator(".nav-toggle");
  if ((await toggle.isVisible()) && (await toggle.getAttribute("aria-expanded")) !== "true") await toggle.click();
  await nav(page).getByRole("treeitem", { name: label, exact: true }).locator(":scope > .cat-row").click() // the row itself (an expanded item also contains its children);
};
const stored = async (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem("prompter:v1:workspace") ?? "{}").spec?.selections ?? {});

test.describe("Person › Identity (product catalog)", () => {
  test("edit all identity areas, custom values, units and output exclusion; persists across reload and JSON", async ({ page, baseURL }, info) => {
    const external = guardNetwork(page, baseURL!);
    const project = info.project.name;
    await page.goto("/");
    await page.getByRole("tab", { name: /Detailed/ }).click();
    await go(page, "기본");
    await pickChip(page, "subject.kind", "인물 (1인)");

    // 존재
    await go(page, "존재");
    await field(page, P + "entity_type").getByRole("radio", { name: /^인간\s/ }).check();
    await field(page, P + "species").getByRole("searchbox").fill("고양이");
    await expect(field(page, P + "species").getByRole("radio", { name: /수인족 › 고양이 수인/ })).toBeVisible();
    await shot(page, "identity-being-search", project, field(page, P + "species"));
    await field(page, P + "species").getByRole("searchbox").fill("");

    // 연령 — number with unit
    await go(page, "연령");
    await field(page, P + "age").getByRole("spinbutton", { name: "실제 연령" }).fill("28");
    await field(page, P + "age_group").getByRole("combobox").selectOption("young_adult");
    await shot(page, "identity-age", project);

    // 성별
    await go(page, "성별");
    await pickChip(page, P + "gender", "여성");
    await expect(page.getByTestId(`variant-${P}gender`)).toContainText("성인");

    // 배경 — multiple countries/regions with Korean search
    await go(page, "배경");
    const nat = field(page, P + "nationality");
    await nat.getByRole("searchbox").fill("대한민국");
    await nat.getByRole("checkbox", { name: /^대한민국/ }).check();
    await nat.getByRole("searchbox").fill("일본");
    await nat.getByRole("checkbox", { name: /^일본/ }).check();
    await nat.getByRole("searchbox").fill("");
    await shot(page, "identity-nationality", project, nat);

    // 사회 — registered + custom (name and expression are separate)
    await go(page, "사회");
    const occ = field(page, P + "occupation");
    await occ.getByRole("searchbox").fill("건축");
    await occ.getByRole("checkbox", { name: /^건축가/ }).check();
    await occ.getByRole("searchbox").fill("비행선 항해사");
    await occ.getByRole("button", { name: /사용자 정의 값으로 추가/ }).click();
    await occ.getByRole("form").getByRole("textbox", { name: /프롬프트 표현/ }).fill("airship navigator");
    await occ.getByRole("form").getByRole("button", { name: "추가" }).click();
    await field(page, P + "social_status").getByRole("radio", { name: /^귀족/ }).check();
    await field(page, P + "social_status").getByRole("switch", { name: /프롬프트에 포함/ }).uncheck();
    await expect(page.getByTestId(`state-${P}social_status`)).toHaveText("설정됨 · 프롬프트 제외");
    await shot(page, "identity-social-custom-excluded", project);

    const expected =
      "Main subject: a single person. Type of being: human. Age group: young adult. Actual age: 28 years old. Gender: woman. " +
      "Nationality (country or region): Japanese, South Korean. Occupation: architect, airship navigator.";
    await ensurePreviewOpen(page);
    await expect(output(page)).toHaveText(expected);
    await shot(page, "identity-preview", project);

    const before = await stored(page);
    expect(before[P + "social_status"]).toEqual({ value: { kind: "single", optionId: "nobility" }, source: "user", excludedFromPrompt: true });
    expect(before[P + "occupation"].value).toEqual({ kind: "multi", optionIds: ["architect"], custom: [{ label: "비행선 항해사", expression: "airship navigator" }] });
    expect(before[P + "age"].value).toEqual({ kind: "number", value: 28, unit: "years" });
    expect(Object.keys(before).sort()).toEqual(
      ["subject.kind", ...["entity_type", "age_group", "age", "gender", "nationality", "occupation", "social_status"].map((x) => P + x)].sort(),
    );

    // reload: same spec, same prompt, exclusion kept
    await page.reload();
    await page.getByRole("tab", { name: /Detailed/ }).click();
    await ensurePreviewOpen(page);
    await expect(output(page)).toHaveText(expected);
    expect(await stored(page)).toEqual(before);

    // JSON export → reset all → import: lossless
    if (project !== "mobile") {
      const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "JSON 내보내기" }).click()]);
      const path = test.info().outputPath("identity.json");
      await download.saveAs(path);
      const exported = JSON.parse(await readFile(path, "utf8"));
      expect(exported.schemaVersion).toBe("0.3.0");
      expect(exported.selections).toEqual(before);
      page.once("dialog", (d) => d.accept());
      await page.getByRole("button", { name: "설정 초기화" }).click();
      expect(await stored(page)).toEqual({});
      await page.locator('input[type="file"]').setInputFiles(path);
      await expect(output(page)).toHaveText(expected);
      expect(await stored(page)).toEqual(before);
    }
    expect(external).toEqual([]);
  });

  test("safety: an EXCLUDED minor apparent age still blocks sexualized output on every path", async ({ page }, info) => {
    await page.goto("/");
    await page.getByRole("tab", { name: /Detailed/ }).click();
    await go(page, "기본");
    await page.getByRole("textbox", { name: /이미지 설명/ }).fill("a sexy pose");
    await go(page, "존재");
    await field(page, P + "species").getByRole("searchbox").fill("엘프");
    await field(page, P + "species").getByRole("radio", { name: /^엘프/ }).check();
    await go(page, "연령");
    await field(page, P + "age").getByRole("spinbutton", { name: "실제 연령" }).fill("300");
    await field(page, P + "apparent_age").getByRole("spinbutton", { name: "외형적 연령" }).fill("12");
    await field(page, P + "apparent_age").getByRole("switch", { name: /프롬프트에 포함/ }).uncheck();
    await ensurePreviewOpen(page);
    await expect(page.getByTestId("prompt-blocked")).toBeVisible();
    await expect(page.getByTestId("blocked-sources").first()).toContainText("외형적 연령 (프롬프트 제외)");
    await expect(page.getByTestId("blocked-sources").first()).toContainText("미성년자·아동 표현"); // signal label, not the raw tag id
    await expect(page.getByTestId("blocked-sources").first()).not.toContainText("age.minor");
    await expect(page.getByRole("button", { name: "프롬프트 복사", exact: true })).toBeDisabled();
    await expect(page.getByRole("button", { name: "프롬프트 .txt 내보내기" })).toBeDisabled();
    if (info.project.name === "mobile") await expect(page.getByRole("toolbar", { name: "프롬프트 도구" }).getByRole("button", { name: /복사/ })).toBeDisabled();
    await shot(page, "identity-safety-excluded", info.project.name);
    // the apparent age itself is kept (and still excluded)
    expect((await stored(page))[P + "apparent_age"]).toEqual({ value: { kind: "number", value: 12, unit: "years" }, source: "user", excludedFromPrompt: true });
  });

  test("category reset clears ALL stored identity values even while searching, then undo restores them", async ({ page }, info) => {
    await page.goto("/");
    await page.getByRole("tab", { name: /Detailed/ }).click();
    await go(page, "조명 프리셋 및 광원");
    await pickChip(page, "lighting.preset", "골든아워");
    await go(page, "사회");
    await field(page, P + "occupation").getByRole("searchbox").fill("요리");
    await field(page, P + "occupation").getByRole("checkbox", { name: /^요리사/ }).check();
    await field(page, P + "occupation").getByRole("switch", { name: /프롬프트에 포함/ }).uncheck();
    await go(page, "기타");
    await field(page, P + "description").getByRole("textbox").fill("keeper of the old library");
    await go(page, "인물 기본 정보");
    await expect(page.locator(".cat-panel h2")).toContainText("2개 설정");
    const toggle = page.locator(".nav-toggle");
    if ((await toggle.isVisible()) && (await toggle.getAttribute("aria-expanded")) === "true") await toggle.click(); // close nav on mobile
    await page.getByTestId("category-reset").click();
    const dialog = page.getByTestId("category-reset-dialog");
    await expect(dialog).toContainText("2개를 모두 지웁니다");
    await expect(dialog).toContainText("직업 (프롬프트 제외)");
    await shot(page, "identity-category-reset-dialog", info.project.name);
    await dialog.getByRole("button", { name: "2개 값 초기화" }).click();
    expect(Object.keys(await stored(page))).toEqual(["lighting.preset"]);
    await page.getByRole("button", { name: "카테고리 초기화 되돌리기" }).click();
    const back = await stored(page);
    expect(Object.keys(back).sort()).toEqual(["lighting.preset", P + "description", P + "occupation"]);
    expect(back[P + "occupation"].excludedFromPrompt).toBe(true);
    await expect(page.getByTestId("category-restore-notice")).toContainText("2개를 복원");
  });
});
