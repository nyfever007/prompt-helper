import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { closePreview, ensurePreviewOpen, pickOption } from "./helpers";

const SHOTS = process.env.E2E_SCREENSHOT_DIR;
const WORKSPACE_KEY = "prompter:v1:workspace";

const output = (page: Page) => page.getByTestId("prompt-output");
const field = (page: Page, attributeId: string) => page.locator(`[data-attribute-id="${attributeId}"]`);
/** Click a chip by its exact visible label inside one attribute field (as a user would). */
const pick = (page: Page, attributeId: string, label: string) => pickOption(page, attributeId, label); // chips or visual cards
const shot = async (page: Page, name: string, project: string) => {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${project}-${name}.png`, fullPage: true, scale: "css" });
};
const moreSettings = (page: Page, groupId: string) => page.locator(`[data-group-id="${groupId}"] .more__toggle`);

/**
 * Seed localStorage BEFORE any app script runs on the first navigation (once per tab).
 * Writing after page load would race with the app's own hydration + autosave on slow
 * machines (seen on CI): the first page could migrate/save the data before the test reloads.
 */
const seedStorage = (page: Page, key: string, value: string) =>
  page.addInitScript(
    ([k, v]) => {
      if (sessionStorage.getItem("__seeded")) return;
      sessionStorage.setItem("__seeded", "1");
      localStorage.setItem(k, v);
    },
    [key, value] as const,
  );

/** Records every request that leaves the local app server. */
const guardNetwork = (page: Page, baseURL: string) => {
  const external: string[] = [];
  page.on("request", (req) => {
    const url = req.url();
    if (!url.startsWith(baseURL) && !url.startsWith("data:") && !url.startsWith("blob:")) external.push(url);
  });
  return external;
};

test.beforeEach(async ({ context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
});

test("Basic Composer: every attribute → exact prompt, parameters, copy and .txt export", async ({ page, baseURL }, info) => {
  const external = guardNetwork(page, baseURL!);
  await page.goto("/");
  await page.getByRole("textbox", { name: /이미지 설명/ }).fill("Someone reading a book by a rainy café window");
  await pick(page, "subject.kind", "인물 (1인)");
  await field(page, "style.preset").getByRole("searchbox").fill("수채");
  await expect(field(page, "style.preset").locator("label.chip")).toHaveCount(1);
  await pick(page, "style.preset", "수채화");
  await pick(page, "composition.framing", "상반신");
  await moreSettings(page, "composition").click();
  await pick(page, "composition.view_direction", "3/4 측면");
  await pick(page, "camera.angle", "눈높이");
  await pick(page, "scene.setting", "카페");
  await moreSettings(page, "scene").click();
  await pick(page, "scene.background", "흐릿한 배경");
  await pick(page, "mood.tone", "향수를 부르는");
  await pick(page, "mood.tone", "아늑한");
  await pick(page, "lighting.preset", "자연광");
  await pick(page, "output.aspect_ratio", "세로 4:5");

  const expected =
    "Someone reading a book by a rainy café window. Main subject: a single person. Visual style: watercolor painting. " +
    "Framing: upper-body shot. Viewing direction: three-quarter view. Camera angle: eye-level angle. Setting: a café. " +
    "Background: softly blurred background. Mood: cozy, nostalgic. Lighting: soft natural daylight. Aspect ratio: vertical 4:5.";
  await expect(output(page)).toHaveText(expected);
  await expect(page.getByTestId("prompt-parameters")).toContainText("aspectRatio=4:5");
  await expect(page.getByTestId("provenance-composition.framing")).toContainText("Framing: upper-body shot.");
  await expect(page.getByTestId("classification-style.preset")).toContainText("매체: 수채 물감");
  await shot(page, "composer-full", info.project.name);

  await ensurePreviewOpen(page);
  await page.getByRole("button", { name: "프롬프트 복사", exact: true }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(expected);

  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "프롬프트 .txt 내보내기" }).click()]);
  const txtPath = info.outputPath("prompt.txt");
  await download.saveAs(txtPath);
  expect(await readFile(txtPath, "utf8")).toBe(`${expected}\n\n# parameters\naspectRatio: 4:5\n`);

  await closePreview(page);
  // survives reload exactly
  await page.reload();
  await expect(output(page)).toHaveText(expected);
  expect(external).toEqual([]);
});

test("context change: inapplicable framing is kept, flagged, excluded, then restored", async ({ page }, info) => {
  await page.goto("/");
  await pick(page, "subject.kind", "인물 (1인)");
  await pick(page, "composition.framing", "전신");
  await expect(output(page)).toContainText("Framing: full-body shot.");
  await pick(page, "subject.kind", "풍경");
  await expect(field(page, "composition.framing")).toHaveAttribute("data-active", "false");
  await expect(field(page, "composition.framing")).toContainText("현재 선택에 적용되지 않습니다");
  await expect(page.getByText(/현재 선택에 적용되지 않게 됨: 구도/)).toBeVisible();
  await expect(output(page)).toHaveText("Main subject: a landscape.");
  await shot(page, "context-inactive", info.project.name);
  await pick(page, "subject.kind", "인물 (1인)");
  await expect(output(page)).toContainText("Framing: full-body shot.");
});

test("conflict: guidance shown on both fields; resolution only on user click", async ({ page }, info) => {
  await page.goto("/");
  await pick(page, "scene.setting", "스튜디오");
  await pick(page, "lighting.preset", "골든아워");
  await expect(field(page, "lighting.preset")).toContainText("해결 방법:");
  await expect(field(page, "scene.setting")).toContainText("스튜디오 안에서 햇빛");
  await expect(output(page)).toContainText("Setting: a studio.");
  await shot(page, "conflict", info.project.name);
  await field(page, "lighting.preset").getByRole("button", { name: "‘장소 / 환경’ 선택 해제" }).click();
  await expect(field(page, "scene.setting")).toHaveAttribute("data-state", "unset");
  await expect(field(page, "lighting.preset")).toHaveAttribute("data-state", "set");
});

test("safety: blocked output is not shown/copyable/exportable; JSON keeps the original", async ({ page }, info) => {
  await page.goto("/");
  await page.getByRole("textbox", { name: /이미지 설명/ }).fill("sexy schoolgirl");
  await ensurePreviewOpen(page);
  await expect(page.getByTestId("prompt-blocked")).toContainText("안전 정책에 의해 프롬프트 출력이 차단되었습니다");
  await expect(page.getByRole("button", { name: "프롬프트 복사", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "프롬프트 .txt 내보내기" })).toBeDisabled();
  await shot(page, "safety-blocked", info.project.name);
  await closePreview(page);
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "JSON 내보내기" }).click()]);
  const p = info.outputPath("blocked.json");
  await download.saveAs(p);
  expect(JSON.parse(await readFile(p, "utf8")).selections["intent.description"].value.text).toBe("sexy schoolgirl");

  await page.getByRole("textbox", { name: /이미지 설명/ }).fill("Confident adult model in an elegant evening gown");
  await expect(output(page)).toHaveText("Confident adult model in an elegant evening gown.");
});

test("mixed-language notice for Korean free text", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("textbox", { name: /이미지 설명/ }).fill("비 오는 카페 창가");
  await expect(page.getByTestId("mixed-language")).toContainText("Hangul");
  await expect(output(page)).toHaveText("비 오는 카페 창가.");
});

test("reset → edit → undo restores the pre-reset state after confirmation", async ({ page }) => {
  await page.goto("/");
  await pick(page, "subject.kind", "동물");
  await pick(page, "style.preset", "유화");
  page.once("dialog", (d) => void d.accept());
  await page.getByRole("button", { name: "설정 초기화" }).click();
  await pick(page, "subject.kind", "탈것");
  page.once("dialog", (d) => {
    expect(d.message()).toContain("덮어써집니다");
    void d.accept();
  });
  await page.getByRole("button", { name: "초기화 이전 상태 복원" }).click();
  await expect(output(page)).toHaveText("Main subject: an animal. Visual style: oil painting.");
});

test("Sprint 0 saved data is migrated on load with the reason shown and the original kept", async ({ page }, info) => {
  const raw = readFileSync(join(__dirname, "../tests/fixtures/sprint0/localstorage-workspace.txt"), "utf8");
  await seedStorage(page, WORKSPACE_KEY, raw);
  await page.goto("/");
  await expect(page.getByText("이전 버전 데이터를 현재 카탈로그에 맞게 변환했습니다")).toBeVisible();
  await expect(page.getByText(/style\.visual → style\.preset/)).toBeVisible();
  await expect(output(page)).toContainText("Visual style: watercolor painting.");
  await expect(field(page, "style.preset").getByRole("radio", { name: "수채화" })).toBeChecked();
  expect(await page.evaluate((k) => localStorage.getItem(`${k}:pre-migration-backup`), WORKSPACE_KEY)).toBe(raw);
  await shot(page, "migration", info.project.name);
});

test("partially damaged saved data: recovery requires confirmation and keeps the original", async ({ page }, info) => {
  const damaged = JSON.stringify({
    kind: "prompter.workspace",
    storageVersion: 1,
    savedAt: "2026-11-24T00:00:00.000Z",
    spec: {
      kind: "prompter.image-spec",
      schemaVersion: "0.1.0",
      task: "text-to-image",
      catalog: { id: "prompter.core", version: "0.2.0" },
      selections: {
        "intent.description": { value: { kind: "text", text: "Keep me" }, source: "user" },
        "subject.kind": { value: { kind: "single", optionId: "dragon" }, source: "user" },
      },
    },
  });
  await seedStorage(page, WORKSPACE_KEY, damaged);
  await page.goto("/");
  const dialog = page.getByRole("alertdialog", { name: "저장된 작업 일부를 복원할 수 없습니다" });
  await expect(dialog).toContainText("selections.subject.kind");
  await expect(page.getByTestId("storage-status")).toContainText("일시 중지");
  expect(await page.evaluate((k) => localStorage.getItem(k), WORKSPACE_KEY)).toBe(damaged);
  await shot(page, "recovery", info.project.name);
  await dialog.getByRole("button", { name: "이 항목을 제외하고 복구" }).click();
  await expect(output(page)).toHaveText("Keep me.");
  expect(await page.evaluate((k) => localStorage.getItem(`${k}:corrupt-backup`), WORKSPACE_KEY)).toBe(damaged);
});

test("Detailed is the editor; Precision remains clearly marked as a future milestone", async ({ page }, info) => {
  await page.goto("/");
  await pick(page, "subject.kind", "건축물");
  await page.getByRole("tab", { name: /Detailed/ }).click();
  await expect(field(page, "subject.kind").getByRole("radio", { name: "건축물" })).toBeChecked();
  await page.getByRole("tab", { name: /Precision/ }).click();
  await expect(page.getByText("Precision 모드는 후속 개발 예정입니다 (Sprint 3)")).toBeVisible();
  await shot(page, "precision-placeholder", info.project.name);
  await page.getByRole("tab", { name: /Basic/ }).click();
  await expect(output(page)).toHaveText("Main subject: an architectural structure.");
});
