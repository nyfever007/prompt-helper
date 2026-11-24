import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";

const EXPECTED = "A quiet harbor at dawn. Main subject: a single person. Visual style: watercolor painting.";
const SHOTS = process.env.E2E_SCREENSHOT_DIR;

const output = (page: Page) => page.getByTestId("prompt-output");
/** Click the visible chip label, exactly as a user would. */
const chip = (page: Page, name: string) => page.locator("label.chip").filter({ has: page.getByText(name, { exact: true }) });

/** Fail if the page talks to anything other than the local app server. */
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

test("Basic flow: compose, copy, switch modes, reload, export, reset, import", async ({ page, baseURL }, testInfo) => {
  const external = guardNetwork(page, baseURL!);
  await page.goto("/");
  await expect(page.getByRole("tab", { name: /Basic/ })).toHaveAttribute("aria-selected", "true");
  await expect(output(page)).toContainText("아직 선택한 항목이 없습니다");

  // compose
  await chip(page, "인물 (1인)").click();
  await chip(page, "수채화").click();
  await page.getByRole("textbox", { name: /이미지 설명/ }).fill("A quiet harbor at dawn");
  await expect(output(page)).toHaveText(EXPECTED);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${testInfo.project.name}-basic.png`, fullPage: true, scale: "css" });

  // copy
  await page.getByRole("button", { name: "프롬프트 복사" }).click();
  await expect(page.getByRole("button", { name: "복사됨!" })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(EXPECTED);

  // modes share one spec
  await page.getByRole("tab", { name: /Detailed/ }).click();
  await expect(page.getByText("Detailed 모드는 후속 개발 예정입니다 (Sprint 2)")).toBeVisible();
  const summary = page.getByRole("region", { name: "현재 공유 명세" });
  await expect(summary.locator('[data-attribute-id="subject.kind"] dd')).toHaveText("인물 (1인)");
  await expect(output(page)).toHaveText(EXPECTED);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${testInfo.project.name}-detailed.png`, fullPage: true, scale: "css" });
  await page.getByRole("tab", { name: /Precision/ }).click();
  await expect(page.getByText("Precision 모드는 후속 개발 예정입니다 (Sprint 3)")).toBeVisible();
  await page.getByRole("tab", { name: /Basic/ }).click();
  await expect(page.getByRole("radio", { name: "수채화" })).toBeChecked();

  // reload restores
  await expect(page.getByTestId("storage-status")).toContainText("로컬에 저장됨");
  await page.reload();
  await expect(page.getByText("마지막 작업을 복원했습니다.")).toBeVisible();
  await expect(page.getByText("마지막 작업을 복원했습니다.")).toBeHidden({ timeout: 10_000 }); // auto-dismiss
  await expect(output(page)).toHaveText(EXPECTED);
  await expect(page.getByRole("textbox", { name: /이미지 설명/ })).toHaveValue("A quiet harbor at dawn");

  // export
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "JSON 내보내기" }).click()]);
  expect(download.suggestedFilename()).toMatch(/^prompter-spec-\d{8}-\d{6}\.json$/);
  const exportedPath = testInfo.outputPath("exported.json");
  await download.saveAs(exportedPath);
  const exported = JSON.parse(await readFile(exportedPath, "utf8"));
  expect(exported).toMatchObject({ kind: "prompter.image-spec", schemaVersion: "0.1.0", catalog: { id: "prompter.core" } });
  expect(Object.keys(exported.selections).sort()).toEqual(["intent.description", "style.preset", "subject.kind"]);

  // reset (cancel, then confirm) — then undo restores, then reset again for the import checks
  page.once("dialog", (d) => void d.dismiss());
  await page.getByRole("button", { name: "설정 초기화" }).click();
  await expect(output(page)).toHaveText(EXPECTED);
  page.once("dialog", (d) => void d.accept());
  await page.getByRole("button", { name: "설정 초기화" }).click();
  await expect(output(page)).toContainText("아직 선택한 항목이 없습니다");
  await expect(page.locator('[data-state="set"]')).toHaveCount(0);
  await page.getByRole("button", { name: "초기화 이전 상태 복원" }).click();
  await expect(output(page)).toHaveText(EXPECTED);
  page.once("dialog", (d) => void d.accept());
  await page.getByRole("button", { name: "설정 초기화" }).click();
  await expect(output(page)).toContainText("아직 선택한 항목이 없습니다");

  // invalid import is rejected and changes nothing
  await page.getByTestId("import-input").setInputFiles({ name: "bad.json", mimeType: "application/json", buffer: Buffer.from('{"kind":"nope"}') });
  await expect(page.getByRole("alert").filter({ hasText: "가져오기에 실패했습니다" })).toBeVisible();
  await expect(output(page)).toContainText("아직 선택한 항목이 없습니다");

  // import the exported file → identical prompt
  await page.getByTestId("import-input").setInputFiles(exportedPath);
  await expect(page.getByText("명세를 가져왔습니다.")).toBeVisible();
  await expect(output(page)).toHaveText(EXPECTED);

  // reload after import also restores
  await page.reload();
  await expect(output(page)).toHaveText(EXPECTED);

  expect(external, "no requests outside the local app").toEqual([]);
});

test("keyboard: options can be chosen without a mouse", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium");
  await page.goto("/");
  const first = page.getByRole("radio", { name: "인물 (1인)" });
  await first.focus();
  await page.keyboard.press("Space");
  await expect(first).toBeChecked();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("radio", { name: "여러 사람" })).toBeChecked();
  await expect(output(page)).toHaveText("Main subject: a group of people.");
});

test("English UI toggle keeps the spec and prompt", async ({ page }) => {
  await page.goto("/");
  await chip(page, "픽셀 아트").click();
  await page.getByRole("combobox").selectOption("en");
  await expect(page.getByRole("radio", { name: "Pixel art" })).toBeChecked();
  await expect(page.getByRole("tab", { name: /Detailed/ })).toContainText("Planned");
  await expect(output(page)).toHaveText("Visual style: pixel art.");
});

test("no horizontal overflow on this viewport", async ({ page }) => {
  await page.goto("/");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
