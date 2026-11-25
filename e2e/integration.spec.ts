import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { closePreview, ensurePreviewOpen, guardNetwork, pickColor, pickOption } from "./helpers";

/**
 * Sprint 2-C.4 — end-to-end usage scenarios A–G (directive §4) on the production build, desktop and
 * mobile, plus a layout sweep of every category page. Scenarios already covered elsewhere are only
 * extended where a step was missing (e.g. A reuses composer.spec's full Basic flow).
 */
const output = (page: Page) => page.getByTestId("prompt-output");
const SHOTS = process.env.E2E_SCREENSHOT_DIR;
const shot = async (page: Page, name: string, project: string) => {
  if (!SHOTS) return;
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SHOTS}/${project}-${name}.png`, scale: "css" });
};
const field = (page: Page, id: string) => page.locator(`[data-attribute-id="${id}"]`);
const nav = (page: Page) => page.getByRole("navigation", { name: "카테고리", exact: true });
const isMobile = async (page: Page) => page.locator(".nav-toggle").isVisible();
const openNav = async (page: Page) => {
  const toggle = page.locator(".nav-toggle");
  if ((await toggle.isVisible()) && (await toggle.getAttribute("aria-expanded")) !== "true") await toggle.click();
};
const go = async (page: Page, label: string) => {
  await openNav(page);
  await nav(page).getByRole("treeitem", { name: label, exact: true }).locator(":scope > .cat-row").click();
};
const chip = (page: Page, id: string, label: string) => pickOption(page, id, label); // chips or visual cards
const listed = async (page: Page, id: string, query: string, role: "radio" | "checkbox", name: RegExp) => {
  await field(page, id).getByRole("searchbox").fill(query);
  await field(page, id).getByRole(role, { name }).check();
  await field(page, id).getByRole("searchbox").fill("");
};
const stored = async (page: Page, key = "prompter:v1:workspace") => page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? "{}").spec?.selections ?? {}, key);
/** The test-only fixture page namespaces its storage (it can never touch real user data). */
const FIXTURE_KEY = "prompter-e2e-fixture:prompter:v1:workspace";
const promptText = async (page: Page) => {
  await ensurePreviewOpen(page);
  const t = (await output(page).textContent()) ?? "";
  await closePreview(page);
  return t;
};
/** Every stored, output attribute's own sentence (its provenance) appears in the prompt. */
const sentencesOf = async (page: Page) => page.locator("[data-testid^=provenance-] code").allTextContents();

test("A — simple design in Basic: subject, appearance, style, framing, place, light → preview → copy", async ({ page, context, baseURL }, info) => {
  const external = guardNetwork(page, baseURL!);
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");
  await chip(page, "subject.kind", "인물 (1인)");
  await listed(page, "person.appearance.direction", "우아한", "checkbox", /^우아한/);
  await chip(page, "style.preset", "수채화");
  await chip(page, "composition.framing", "상반신");
  await chip(page, "scene.setting", "카페");
  await chip(page, "lighting.preset", "자연광");
  const expected =
    "Main subject: a single person. Appearance direction: elegant. Visual style: watercolor painting. Framing: upper-body shot. Setting: a café. Lighting: soft natural daylight.";
  await ensurePreviewOpen(page);
  await expect(output(page)).toHaveText(expected);
  await shot(page, "light-scenario-a-basic", info.project.name);
  await page.getByRole("button", { name: "프롬프트 복사", exact: true }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(expected);
  expect(external).toEqual([]);
});

test("B — precise person in Detailed: identity, face, skin/hair/body, wardrobe/accessories, pose/camera/light → diagnostics + prompt", async ({ page }, info) => {
  await page.goto("/");
  await page.getByRole("tab", { name: /Detailed/ }).click();
  await go(page, "연령");
  await field(page, "person.identity.age").getByRole("spinbutton", { name: "실제 연령" }).fill("30");
  await go(page, "성별");
  await chip(page, "person.identity.gender", "여성");
  await go(page, "얼굴");
  await field(page, "person.face.shape").getByRole("radio", { name: /^계란형/ }).check(); // visual cards (Sprint 2-D.1)
  await go(page, "눈");
  await field(page, "person.eyes.shape").getByRole("radio", { name: /^아몬드형/ }).check(); // visual cards (Sprint 2-D.1)
  await go(page, "눈썹");
  await field(page, "person.eyebrows.shape").getByRole("radio", { name: /^완만한 아치/ }).check(); // visual cards (Sprint 2-D.1)
  await go(page, "코");
  await field(page, "person.nose.shape").getByRole("radio", { name: /^매부리형/ }).check(); // visual cards (Sprint 2-D.2)
  await go(page, "입술");
  await field(page, "person.lips.shape").getByRole("checkbox", { name: /^도톰한/ }).check(); // visual cards (Sprint 2-D.2)
  await go(page, "피부");
  await pickColor(page, "person.skin.tone", "밝은 베이지");
  await go(page, "헤어");
  await field(page, "person.hair.length").getByRole("radio", { name: /^어깨 길이/ }).check(); // visual cards (Sprint 2-D.3)
  await pickColor(page, "person.hair.primary_color", "짙은 갈색");
  await go(page, "전체 신체");
  await field(page, "person.body.build").getByRole("radio", { name: /^운동형/ }).check(); // visual cards (Sprint 2-D.3)
  await go(page, "상의");
  await listed(page, "person.clothing.tops.type", "블라우스", "radio", /^블라우스/);
  await pickColor(page, "person.clothing.tops.primary_color", "아이보리");
  await go(page, "액세서리");
  await chip(page, "person.accessories.earrings", "링 귀걸이");
  await go(page, "기본 자세");
  await chip(page, "person.pose.posture", "서 있는");
  await go(page, "프레이밍 및 시점");
  await chip(page, "composition.framing", "상반신");
  await go(page, "렌즈 및 원근감");
  await chip(page, "camera.focal_length", "85mm");
  await go(page, "주광");
  await chip(page, "lighting.direction", "측광");

  const sel = await stored(page);
  expect(Object.keys(sel)).toHaveLength(18);
  await ensurePreviewOpen(page);
  await shot(page, "light-scenario-b-detailed", info.project.name);
  await closePreview(page);
  const prompt = await promptText(page);
  await expect(page.getByTestId("prompt-blocked")).toHaveCount(0);
  expect(prompt).toContain("Actual age: 30 years old. Gender: woman."); // adult → gendered wording (existing rule)
  // every set attribute's own sentence is in the prompt (page by page)
  for (const label of ["얼굴", "상의", "주광"]) {
    await go(page, label);
    for (const s of await sentencesOf(page)) expect(prompt, s).toContain(s);
  }
  expect(prompt).toContain("Focal length: 85 mm.");
});

test("C — switching editors: Basic → Detailed edits → Basic; shared values match, Detailed-only values kept, prompt identical", async ({ page }) => {
  await page.goto("/");
  await chip(page, "subject.kind", "인물 (1인)");
  await chip(page, "style.preset", "수채화");
  await chip(page, "composition.framing", "상반신");
  const basicPrompt = await promptText(page);

  await page.getByRole("tab", { name: /Detailed/ }).click();
  expect(await promptText(page)).toBe(basicPrompt);
  await go(page, "프레이밍 및 시점");
  await chip(page, "composition.framing", "전신"); // shared with Basic
  await go(page, "렌즈 및 원근감");
  await chip(page, "camera.focal_length", "50mm"); // Detailed only
  const detailedPrompt = await promptText(page);
  expect(detailedPrompt).toContain("Framing: full-body shot.");
  expect(detailedPrompt).toContain("Focal length: 50 mm.");

  await page.getByRole("tab", { name: /Basic/ }).click();
  await expect(field(page, "composition.framing").getByRole("radio", { name: "전신" })).toBeChecked();
  await expect(field(page, "camera.focal_length")).toHaveCount(0); // not shown in Basic …
  expect((await stored(page))["camera.focal_length"].value).toEqual({ kind: "single", optionId: "mm_50" }); // … but kept
  expect(await promptText(page)).toBe(detailedPrompt);
});

test("D — preset plan/apply/edit/undo spares the user's edit; two category resets; restoring one keeps later edits elsewhere", async ({ page }) => {
  await page.goto("/e2e-fixtures");
  await page.getByRole("tab", { name: /Detailed/ }).click();
  await chip(page, "subject.kind", "인물 (1인)");
  await go(page, "프레이밍 및 시점");
  await chip(page, "composition.framing", "전신"); // user's explicit choice
  await go(page, "표정 및 시각적 인상");
  await page.getByRole("button", { name: /변경 내용 확인… 부드러운 인물 사진/ }).click();
  const dlg = page.getByRole("dialog", { name: /프리셋 적용: 부드러운 인물 사진/ });
  await expect(dlg.locator('[data-plan-kind="change"]')).toContainText("전신"); // plan shows the overwrite first
  await dlg.getByRole("button", { name: "기존 값을 덮어쓰고 적용" }).click();
  await field(page, "x.expression.smile").getByRole("slider").press("End"); // edit a preset value
  await page.getByRole("button", { name: "최근 프리셋 되돌리기" }).click();
  await expect(page.getByText(/직접 수정해서 유지한 항목: 미소 정도/)).toBeVisible();
  let sel = await stored(page, FIXTURE_KEY);
  expect(sel["composition.framing"].value).toEqual({ kind: "single", optionId: "full_body" }); // restored user choice
  expect(sel["x.expression.smile"]).toBeDefined(); // user's edit kept

  // two category resets, restore the older, later edits elsewhere stay
  await go(page, "프레이밍 및 시점");
  await page.getByTestId("category-reset").click();
  await page.getByTestId("category-reset-dialog").getByRole("button", { name: /값 초기화/ }).click();
  await go(page, "표정 및 시각적 인상");
  await page.getByTestId("category-reset").click();
  await page.getByTestId("category-reset-dialog").getByRole("button", { name: /값 초기화/ }).click();
  await go(page, "분위기");
  await chip(page, "mood.tone", "평온한"); // a later edit in another category
  const bar = page.getByTestId("category-reset-bar");
  await bar.getByText(/이전 초기화 1개/).click();
  await bar.getByRole("button", { name: /‘프레이밍 및 시점’ 초기화 되돌리기/ }).click();
  sel = await stored(page, FIXTURE_KEY);
  expect(sel["composition.framing"].value).toEqual({ kind: "single", optionId: "full_body" });
  expect(sel["x.expression.smile"]).toBeUndefined(); // the other reset is still pending
  expect(sel["mood.tone"].value).toEqual({ kind: "multi", optionIds: ["calm"] });
});

test("E — complex saved spec survives reload, JSON export/import; Sprint 0/1/2-A exports load; custom values, origin, exclusion kept", async ({ page }) => {
  const complex = JSON.parse(readFileSync("perf/fixtures/complex-workspace.json", "utf8")) as { storageKey: string; raw: string; selections: number };
  await page.addInitScript(({ key, raw }) => {
    if (!sessionStorage.getItem("seeded")) {
      localStorage.setItem(key, raw);
      sessionStorage.setItem("seeded", "1");
    }
  }, { key: complex.storageKey, raw: complex.raw });
  await page.goto("/");
  const before = await stored(page);
  expect(Object.keys(before)).toHaveLength(complex.selections);
  const prompt = await promptText(page);
  expect(prompt.length).toBeGreaterThan(4000);

  // a custom value and an exclusion on top
  await page.getByRole("tab", { name: /Detailed/ }).click();
  await go(page, "사회");
  await field(page, "person.identity.occupation").getByRole("searchbox").fill("별지도 제작자");
  await field(page, "person.identity.occupation").getByRole("button", { name: /사용자 정의 값으로 추가/ }).click();
  await field(page, "person.identity.occupation").getByRole("form").getByRole("button", { name: "추가", exact: true }).click();
  await field(page, "person.identity.occupation").getByRole("switch", { name: /프롬프트에 포함/ }).uncheck();
  const edited = await stored(page);
  expect(edited["person.identity.occupation"].excludedFromPrompt).toBe(true);
  const editedPrompt = await promptText(page);

  await page.reload();
  expect(await stored(page)).toEqual(edited);
  expect(await promptText(page)).toBe(editedPrompt);

  // The JSON toolbar sits below the preview; on mobile the open preview sheet can cover it — close it first
  // (same as composer.spec; found on a slower CI runner).
  await closePreview(page);
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "JSON 내보내기" }).click()]);
  const json = await readFile((await download.path())!, "utf8");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  expect(await stored(page)).toEqual({});
  await ensurePreviewOpen(page);
  await page.locator('input[type="file"]').setInputFiles({ name: "spec.json", mimeType: "application/json", buffer: Buffer.from(json) });
  await expect(page.getByText("명세를 가져왔습니다.").first()).toBeVisible();
  expect(await stored(page)).toEqual(edited);
  expect(await promptText(page)).toBe(editedPrompt);

  // exports of earlier sprints still import (IDs migrated where recorded), prompt produced
  for (const f of ["sprint0/export-full.json", "sprint1/export-full.json", "sprint2a/export-core-detailed.json"]) {
    await ensurePreviewOpen(page);
    await page.locator('input[type="file"]').setInputFiles(`tests/fixtures/${f}`);
    await expect(page.getByText("명세를 가져왔습니다.").first(), f).toBeVisible();
    expect((await promptText(page)).length, f).toBeGreaterThan(20);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem("prompter:v1:workspace") ?? "{}").spec?.catalog?.version), f).toBe("0.17.0");
  }
});

test("F — applicability and safety: no-subject edit, non-person subject keeps values, age policy, exclusion, gated outputs, original kept", async ({ page }, info) => {
  await page.goto("/");
  await page.getByRole("tab", { name: /Detailed/ }).click();
  await go(page, "인상 및 매력");
  await listed(page, "person.appearance.direction", "아름다운", "checkbox", /^아름다운/);
  expect(await promptText(page)).toBe("Appearance direction: beautiful.");
  await go(page, "기본");
  await chip(page, "subject.kind", "풍경");
  expect(await promptText(page)).toBe("Main subject: a landscape.");
  expect((await stored(page))["person.appearance.direction"]).toBeDefined();
  await chip(page, "subject.kind", "인물 (1인)");
  expect(await promptText(page)).toBe("Main subject: a single person. Appearance direction: beautiful.");

  await go(page, "인상 및 매력");
  await listed(page, "person.appearance.direction", "섹시", "checkbox", /^섹시한/);
  await field(page, "person.appearance.direction").getByRole("switch", { name: /프롬프트에 포함/ }).uncheck(); // exclusion does not release it
  await ensurePreviewOpen(page);
  await expect(page.getByTestId("prompt-blocked")).toContainText("성인 연령 정보를 명확하게 설정");
  await expect(page.getByRole("button", { name: "프롬프트 복사", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "프롬프트 .txt 내보내기" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "JSON 내보내기" })).toBeEnabled(); // the original spec stays exportable
  await shot(page, "light-scenario-f-withheld", info.project.name);
  await closePreview(page);
  await go(page, "연령");
  await field(page, "person.identity.age_group").getByRole("combobox").selectOption("adolescent");
  await ensurePreviewOpen(page);
  await expect(page.getByTestId("prompt-blocked")).toContainText("미성년자");
  await closePreview(page);
  await field(page, "person.identity.age_group").getByRole("combobox").selectOption("middle_aged");
  await ensurePreviewOpen(page);
  await expect(page.getByTestId("prompt-blocked")).toHaveCount(0);
  await expect(output(page)).toContainText("Age group: middle-aged adult."); // excluded appearance direction is not output
  const sel = await stored(page);
  expect(sel["person.appearance.direction"]).toEqual({ value: { kind: "multi", optionIds: ["beautiful", "sexy"] }, source: "user", excludedFromPrompt: true });
});

test("G — small-screen flow: drawer, search to attribute, inputs, palette, preview, dialog, related-setting link, copy", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");
  await page.getByRole("tab", { name: /Detailed/ }).click();
  await openNav(page);
  await nav(page).getByRole("searchbox").fill("초점 거리");
  await nav(page).getByRole("button", { name: /초점 거리/ }).first().click();
  await expect(field(page, "camera.focal_length")).toBeFocused();
  await chip(page, "camera.focal_length", "35mm");
  await go(page, "초점 및 피사계 심도");
  const dof = field(page, "camera.depth_of_field").getByRole("slider");
  await dof.focus();
  await dof.press("ArrowLeft");
  await go(page, "상의");
  await pickColor(page, "person.clothing.tops.primary_color", "네이비");
  await page.getByTestId("category-reset").click();
  await expect(page.getByTestId("category-reset-dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("category-reset")).toBeFocused();
  await go(page, "인상 및 매력");
  await listed(page, "person.appearance.direction", "섹시", "checkbox", /^섹시한/);
  await field(page, "person.appearance.direction").getByRole("button", { name: "연령대 (연령) — 이 설정으로 이동" }).click();
  await expect(field(page, "person.identity.age_group")).toBeFocused();
  await field(page, "person.identity.age_group").getByRole("combobox").selectOption("young_adult");
  if (await isMobile(page)) {
    const bar = page.getByRole("toolbar", { name: "프롬프트 도구" });
    await bar.getByRole("button", { name: "하단 도구: 프롬프트 복사" }).click();
  } else {
    await page.getByRole("button", { name: "프롬프트 복사", exact: true }).click();
  }
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain("Focal length: 35 mm.");
  expect(copied).toContain("Depth of field: shallow.");
  expect(copied).toContain("Top primary color: navy.");
  expect(copied).toContain("Appearance direction: sexy.");
});

test("layout sweep: every category page has no horizontal page scroll; long custom values wrap", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("tab", { name: /Detailed/ }).click();
  await openNav(page);
  const labels = await nav(page)
    .getByRole("treeitem")
    .evaluateAll((items) => items.map((i) => document.getElementById(i.getAttribute("aria-labelledby") ?? "")?.textContent ?? ""));
  expect(labels.length).toBeGreaterThan(60); // every category of the product catalog (63)
  const overflow: string[] = [];
  for (const label of labels) {
    await go(page, label);
    const [sw, cw] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    if (sw > cw + 1) overflow.push(`${label}: ${sw} > ${cw}`);
  }
  expect(overflow).toEqual([]);
  // a very long custom value (no spaces) does not widen the page
  await go(page, "사회");
  const long = "초장문사용자정의직업명".repeat(12);
  await field(page, "person.identity.occupation").getByRole("searchbox").fill(long);
  await field(page, "person.identity.occupation").getByRole("button", { name: /사용자 정의 값으로 추가/ }).click();
  await field(page, "person.identity.occupation").getByRole("form").getByRole("button", { name: "추가", exact: true }).click();
  const [sw, cw] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
  expect(sw).toBeLessThanOrEqual(cw + 1);
});
