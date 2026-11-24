import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { closePreview, ensurePreviewOpen, guardNetwork } from "./helpers";

const SHOTS = process.env.E2E_SCREENSHOT_DIR;
const shot = async (page: Page, name: string, project: string) => {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${project}-${name}.png`, fullPage: true, scale: "css" });
};
const output = (page: Page) => page.getByTestId("prompt-output");
const field = (page: Page, id: string) => page.locator(`[data-attribute-id="${id}"]`);
const pick = (page: Page, id: string, label: string) =>
  field(page, id).locator("label.chip").filter({ has: page.getByText(label, { exact: true }) }).click();
const nav = (page: Page) => page.getByRole("navigation", { name: "카테고리" });
/** Open a category; on narrow screens the navigation is behind a toggle. */
const go = async (page: Page, label: string) => {
  const toggle = page.locator(".nav-toggle");
  if (await toggle.isVisible()) {
    if ((await toggle.getAttribute("aria-expanded")) !== "true") await toggle.click();
  }
  await nav(page).getByRole("treeitem", { name: label, exact: true }).locator(":scope > .cat-row").click() // the row itself (an expanded item also contains its children);
};
const isMobile = (project: string) => project === "mobile";

test.beforeEach(async ({ context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
});

test.describe("product catalog (/)", () => {
  test("Detailed is a superset of Basic sharing one spec; only approved attributes are editable", async ({ page, baseURL }, info) => {
    const external = guardNetwork(page, baseURL!);
    await page.goto("/");
    await pick(page, "subject.kind", "인물 (1인)");
    await pick(page, "style.preset", "수채화");
    await page.getByRole("tab", { name: /Detailed/ }).click();
    await expect(field(page, "subject.kind").getByRole("radio", { name: "인물 (1인)" })).toBeChecked();

    await go(page, "조명 프리셋 및 광원"); // Lighting subcategories (Sprint 2-C.1)
    await pick(page, "lighting.preset", "골든아워");
    await go(page, "색상 및 색온도");
    await pick(page, "lighting.color_temperature", "차가운");
    await expect(output(page)).toHaveText(
      "Main subject: a single person. Visual style: watercolor painting. Lighting: golden-hour sunlight. Color temperature: cool.",
    );
    await expect(page.getByTestId("takeover-lighting.color_temperature")).toContainText("직접 설정으로 대체했습니다");
    await expect(page.getByTestId("count-shared_lighting")).toHaveText("2");
    await shot(page, "detailed-lighting", info.project.name);

    await go(page, "스타일");
    await expect(field(page, "style.preset")).toBeVisible();
    await expect(field(page, "style.medium")).toHaveCount(0); // deferred until Sprint 4

    await go(page, "자세 및 행동"); // every product person area is approved since 2-B.6 (draft placeholder: fixture test below)
    await expect(page.getByTestId("draft-placeholder")).toHaveCount(0);

    // back to Basic: same values, lighting properties stay (not editable in Basic, but in the prompt)
    await page.getByRole("tab", { name: /Basic/ }).click();
    await expect(field(page, "lighting.preset").getByRole("radio", { name: "골든아워" })).toBeChecked();
    await expect(output(page)).toContainText("Color temperature: cool.");
    expect(external).toEqual([]);
  });

  test("search jumps to a category and attribute", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("tab", { name: /Detailed/ }).click();
    const toggle = page.locator(".nav-toggle");
    if (await toggle.isVisible()) await toggle.click();
    await nav(page).getByRole("searchbox").fill("색온도");
    await nav(page).getByRole("button", { name: /색온도/ }).first().click();
    await expect(page.getByRole("heading", { level: 2, name: "색상 및 색온도" })).toBeVisible();
    await expect(field(page, "lighting.color_temperature")).toBeFocused();
  });

  test("Sprint 1 saved work opens unchanged (no migration notice) with the same prompt", async ({ page }) => {
    const raw = readFileSync(join(__dirname, "../tests/fixtures/sprint1/localstorage-workspace.txt"), "utf8");
    const expected = JSON.parse(readFileSync(join(__dirname, "../tests/fixtures/sprint1/expected-prompts.json"), "utf8")).full;
    await page.addInitScript(
      ([v]) => {
        if (sessionStorage.getItem("__seeded")) return;
        sessionStorage.setItem("__seeded", "1");
        localStorage.setItem("prompter:v1:workspace", v!);
      },
      [raw],
    );
    await page.goto("/");
    await expect(page.getByText("마지막 작업을 복원했습니다.")).toBeVisible();
    await expect(page.getByText("이전 버전 데이터를 현재 카탈로그에 맞게 변환했습니다")).toHaveCount(0);
    await expect(output(page)).toHaveText(expected);
  });

  test("mobile toolbar: count, status, preview sheet and copy; blocked prompt cannot be copied", async ({ page }, info) => {
    test.skip(!isMobile(info.project.name), "mobile layout only");
    await page.goto("/");
    const bar = page.getByRole("toolbar", { name: "프롬프트 도구" });
    await expect(bar).toBeVisible();
    await expect(page.locator("#preview-panel")).toBeHidden(); // does not cover the editor by default
    await pick(page, "subject.kind", "동물");
    await expect(bar.getByTestId("mobile-applied")).toHaveText("1개 설정");
    await expect(bar.getByTestId("mobile-status")).toHaveText("정상");
    await bar.getByRole("button", { name: "하단 도구: 프롬프트 복사" }).click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("Main subject: an animal.");
    await bar.getByRole("button", { name: "미리보기" }).click();
    await expect(page.locator("#preview-panel")).toBeVisible();
    await shot(page, "mobile-sheet-open", info.project.name);
    await page.locator("#preview-panel").getByRole("button", { name: "미리보기 닫기" }).click();
    await expect(page.locator("#preview-panel")).toBeHidden();

    await page.getByRole("textbox", { name: /이미지 설명/ }).fill("sexy schoolgirl");
    await expect(bar.getByTestId("mobile-status")).toHaveText("차단됨");
    await expect(bar.getByRole("button", { name: "하단 도구: 프롬프트 복사" })).toBeDisabled();
    await shot(page, "mobile-toolbar-blocked", info.project.name);
  });
});

test.describe("E2E-only fixture catalog (/e2e-fixtures)", () => {
  const openFixture = async (page: Page) => {
    await page.goto("/e2e-fixtures");
    await expect(page.locator(".fixture-banner")).toBeVisible();
    await page.getByRole("tab", { name: /Detailed/ }).click();
  };

  test("generic controls: cards with zoom, color, searchable list, dropdown, slider, number, range", async ({ page, baseURL }, info) => {
    const external = guardNetwork(page, baseURL!);
    await openFixture(page);
    await go(page, "자세 및 행동"); // DRAFT in the fixture catalog only: honest placeholder with its design document
    await expect(page.getByTestId("draft-placeholder")).toContainText("docs/catalogs/person/pose.md");
    await shot(page, "detailed-draft", info.project.name);
    await go(page, "얼굴");
    await expect(field(page, "x.face.shape").getByText("예시 이미지 준비 중").first()).toBeVisible();
    await field(page, "x.face.shape").getByRole("button", { name: "예시 크게 보기" }).click();
    await expect(page.getByRole("dialog", { name: "계란형" })).toBeVisible();
    await shot(page, "fixture-card-zoom", info.project.name);
    await page.getByRole("dialog", { name: "계란형" }).getByRole("button", { name: "닫기" }).click();
    await field(page, "x.face.shape").getByRole("radio", { name: /계란형/ }).check();
    await shot(page, "fixture-cards", info.project.name);

    await go(page, "눈");
    await field(page, "x.eyes.color").getByRole("button", { name: /색상 선택$/ }).click(); // collapsed picker (Sprint 2-C.1)
    await field(page, "x.eyes.color").locator("label.chip").filter({ hasText: "헤이즐" }).click();
    await go(page, "메이크업");
    await field(page, "x.makeup.finish").getByRole("combobox").selectOption("dewy");
    await go(page, "의상");
    await field(page, "x.wardrobe.style").getByRole("searchbox").fill("정장");
    await field(page, "x.wardrobe.style").getByRole("radio", { name: /비즈니스 정장/ }).check();

    // slider: visible position is not a value
    await go(page, "표정 및 시각적 인상");
    const slider = field(page, "x.expression.smile").getByRole("slider");
    await expect(slider).toHaveAttribute("aria-valuetext", "미설정");
    await slider.focus();
    await expect(field(page, "x.expression.smile")).toHaveAttribute("data-state", "unset");
    await slider.press("ArrowRight"); // an explicit user input
    await expect(field(page, "x.expression.smile")).toHaveAttribute("data-state", "set");
    // 50 → 55 by one ArrowRight step: the “Clear” band (≤ 80); degree sliders show the band, not the number
    await expect(page.getByTestId("slider-value-x.expression.smile")).toHaveText("또렷하게");
    await shot(page, "fixture-slider", info.project.name);

    // range: half input is not stored
    await go(page, "장소와 배경");
    await field(page, "x.scene.people_count").getByRole("spinbutton", { name: /최솟값/ }).fill("2");
    await expect(field(page, "x.scene.people_count")).toHaveAttribute("data-state", "unset");
    await field(page, "x.scene.people_count").getByRole("spinbutton", { name: /최댓값/ }).fill("4");
    await expect(field(page, "x.scene.people_count")).toHaveAttribute("data-state", "set");

    await expect(output(page)).toHaveText(
      "Face shape: oval face. Eye color: hazel eyes. Expression: a warm, clear smile. Makeup: dewy finish. Outfit: business suit. Number of people: 2 to 4.",
    );
    // fixture data never touches the real workspace key
    const keys = await page.evaluate(() => Object.keys(localStorage));
    expect(keys.some((k) => k.startsWith("prompter-e2e-fixture:prompter:v1:workspace"))).toBe(true);
    expect(keys).not.toContain("prompter:v1:workspace");
    expect(external).toEqual([]);
  });

  test("composite preset: preview, overwrite confirmation, apply, undo that spares user edits", async ({ page }, info) => {
    await openFixture(page);
    await pick(page, "subject.kind", "인물 (1인)");
    await go(page, "프레이밍 및 시점");
    await pick(page, "composition.framing", "전신");
    await go(page, "표정 및 시각적 인상");
    await page.getByRole("button", { name: /변경 내용 확인… 부드러운 인물 사진/ }).click();
    const dlg = page.getByRole("dialog", { name: /프리셋 적용: 부드러운 인물 사진/ });
    await expect(dlg.locator('[data-plan-kind="change"]')).toContainText("전신");
    await expect(dlg.locator('[data-plan-kind="new"]')).toContainText("새로 설정 (3)");
    await shot(page, "fixture-preset-dialog", info.project.name);
    await dlg.getByRole("button", { name: "기존 값을 덮어쓰고 적용" }).click();
    await expect(page.getByText(/적용했습니다 \(속성 4개\)/)).toBeVisible();
    await ensurePreviewOpen(page);
    await expect(output(page)).toContainText("Framing: head-and-shoulders portrait.");
    await closePreview(page);
    await field(page, "x.expression.smile").getByRole("slider").press("End"); // user edit after the preset
    await page.getByRole("button", { name: "최근 프리셋 되돌리기" }).click();
    await expect(page.getByText(/직접 수정해서 유지한 항목: 미소 정도/)).toBeVisible();
    await expect(output(page)).toContainText("Framing: full-body shot.");
    await expect(output(page)).toContainText("Expression: a broad, beaming smile.");
    await shot(page, "fixture-preset-undone", info.project.name);
  });

  test("policy restriction: disabled with reason; imported restricted spec blocks output everywhere", async ({ page }, info) => {
    await openFixture(page);
    await go(page, "인물 기본 정보");
    await pick(page, "x.identity.age_group", "미성년");
    await go(page, "표정 및 시각적 인상");
    await expect(field(page, "x.expression.appeal").getByRole("radio", { name: "매혹적인" })).toBeDisabled();
    await expect(field(page, "x.expression.appeal").getByTestId("restricted-note")).toContainText("미성년자에게는 성적 매력 표현을 제공하지 않습니다");
    await shot(page, "fixture-restricted", info.project.name);

    const spec = {
      kind: "prompter.image-spec",
      schemaVersion: "0.2.0",
      task: "text-to-image",
      catalog: { id: "prompter.e2e-fixture", version: "0.3.0" },
      selections: {
        "x.identity.age_group": { value: { kind: "single", optionId: "minor" }, source: "user" },
        "x.expression.appeal": { value: { kind: "single", optionId: "alluring" }, source: "user" },
      },
    };
    await page.getByTestId("import-input").setInputFiles({ name: "x.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(spec)) });
    await ensurePreviewOpen(page);
    await expect(page.getByTestId("prompt-blocked")).toContainText("사용이 제한된 선택지");
    await expect(page.getByRole("button", { name: "프롬프트 복사", exact: true })).toBeDisabled();
    if (isMobile(info.project.name)) await expect(page.getByRole("button", { name: "하단 도구: 프롬프트 복사" })).toBeDisabled();
  });
});
