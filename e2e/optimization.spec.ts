import { expect, test, type Page } from "@playwright/test";
import { closePreview, ensurePreviewOpen, guardNetwork } from "./helpers";

/**
 * Sprint 2-D.7 — random styles, prompt detail and length / cost, end to end (desktop and mobile). Also the
 * automated part of TD-16: the accessible names and roles a screen reader would announce for the new controls
 * (an ARIA snapshot — not a substitute for listening with VoiceOver / NVDA). Screenshots: E2E_SCREENSHOT_DIR.
 */
const SHOTS = process.env.E2E_SCREENSHOT_DIR;
const shot = async (page: Page, name: string, project: string) => {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${project}-${name}.png`, scale: "css" });
};
const stored = async (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem("prompter:v1:workspace") ?? "{}").spec?.selections ?? {});
const chars = async (page: Page) => Number((await page.getByTestId("stat-chars").textContent())!.replace(/\D/g, ""));
const detail = (page: Page, name: string) => page.getByTestId("prompt-detail").getByText(name, { exact: true });

test("random styles and prompt detail: Natural by default, Balanced for a random design, Compact < Balanced < Full, local token count", async ({ page, baseURL }, testInfo) => {
  const external = guardNetwork(page, baseURL!);
  await page.goto("/");
  await page.getByRole("tab", { name: /Random/ }).click();
  await expect(page.getByRole("radio", { name: "Natural" })).toBeChecked();
  await expect(page.getByTestId("random-style")).toMatchAriaSnapshot(`
    - group "랜덤 방식":
      - radio "Natural" [checked]
      - radio "Creative"
      - radio "Chaos"
  `);
  await page.getByTestId("random-generate").click();
  await expect(page.getByTestId("random-result")).toContainText("방식: Natural");
  const natural = Object.keys(await stored(page)).length;
  expect(natural).toBeGreaterThan(50);
  expect(natural).toBeLessThan(200);
  await shot(page, "random-natural", testInfo.project.name);

  await ensurePreviewOpen(page);
  await expect(page.getByTestId("prompt-detail").getByRole("radio", { name: "Balanced" })).toBeChecked();
  await expect(page.getByTestId("prompt-detail")).toMatchAriaSnapshot(`
    - group "프롬프트 길이":
      - radio "Compact"
      - radio "Balanced" [checked]
      - radio "Full"
  `);
  await expect(page.getByTestId("stat-tokens")).toContainText("로컬 계산 (o200k_base)");
  await expect(page.getByTestId("stat-cost")).toHaveText(/^\$0\.\d+/);
  await page.getByTestId("prompt-stats").locator("summary").click(); // model and price settings
  await expect(page.getByTestId("prompt-stats")).toMatchAriaSnapshot(`
    - region "길이와 비용":
      - heading "길이와 비용" [level=3]
      - term: 설정 속성
      - definition: /\\d+/
      - term: 출력 속성
      - definition: /\\d+/
      - term: 글자 수
      - definition: /[\\d,]+/
      - term: 토큰
      - definition: /[\\d,]+ \\(로컬 계산 \\(o200k_base\\)\\)/
      - term: 텍스트 입력 비용 (이미지 생성 제외)
      - definition: /\\$0\\.\\d+/
      - group:
        - text: /OpenAI GPT Image 1\\.5 · 100만 토큰당 \\$5/
        - combobox "모델"
  `);
  const balanced = await chars(page);
  await shot(page, "preview-balanced", testInfo.project.name);
  await page.getByTestId("prompt-stats").scrollIntoViewIfNeeded();
  await shot(page, "preview-stats", testInfo.project.name);
  await detail(page, "Compact").click();
  const compact = await chars(page);
  await page.getByTestId("prompt-omitted").locator("summary").click();
  await shot(page, "preview-compact", testInfo.project.name);
  await detail(page, "Full").click();
  const full = await chars(page);
  expect(compact).toBeLessThan(balanced);
  expect(balanced).toBeLessThan(full);
  // a model without a local tokenizer or a confirmed price
  await page.getByTestId("token-model").selectOption("gemini-image");
  await expect(page.getByTestId("stat-tokens")).toContainText("추정");
  await expect(page.getByTestId("stat-cost")).toHaveText("—");
  await closePreview(page);

  // Creative and Chaos from the same tab
  await page.getByTestId("random-style").getByText("Chaos", { exact: true }).click();
  await page.getByTestId("random-generate").click();
  await expect(page.getByTestId("random-result")).toContainText("방식: Chaos");
  expect(Object.keys(await stored(page)).length).toBeGreaterThan(150);
  // the tokenizer is a local chunk: nothing leaves the app
  expect(external).toEqual([]);
});
