import { expect, test, type Page } from "@playwright/test";
import { closePreview, guardNetwork } from "./helpers";

/**
 * Sprint 3.1 — locks and the Precision tab end to end (desktop and mobile): lock values from a random design,
 * regenerate (locked values kept), filter and search in Precision, go to a field, reload (locks restored).
 * The accessible structure a screen reader announces is checked with an ARIA snapshot. Screenshots: E2E_SCREENSHOT_DIR.
 */
const SHOTS = process.env.E2E_SCREENSHOT_DIR;
const shot = async (page: Page, name: string, project: string) => {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${project}-${name}.png`, scale: "css" });
};
const stored = async (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem("prompter:v1:workspace") ?? "{}").spec?.selections ?? {});
const rows = (page: Page) => page.locator("[data-attribute-row]");

test("precision controls: lock random values, regenerate, filter, go to a field, reload", async ({ page, baseURL }, testInfo) => {
  const external = guardNetwork(page, baseURL!);
  const project = testInfo.project.name;
  await page.goto("/");
  await page.getByRole("tab", { name: /Random/ }).click();
  await page.getByTestId("random-generate").click();
  await closePreview(page);

  await page.getByRole("tab", { name: /Precision/ }).click();
  const total = Object.keys(await stored(page)).length;
  await expect(page.getByTestId("precision-count")).toHaveText(`${total}개 중 ${total}개 표시 · 잠김 0개`);
  await expect(page.getByTestId("precision-panel")).toMatchAriaSnapshot(`
    - heading "Precision — 설정 정밀 관리" [level=2]
    - search:
      - searchbox "속성·값·카테고리 검색"
      - text: 출처
      - combobox "출처"
      - text: 잠금
      - combobox "잠금"
      - text: 프롬프트
      - combobox "프롬프트"
    - status: /\\d+개 중 \\d+개 표시 · 잠김 0개/
  `);

  // lock the hair settings shown by a search, then regenerate
  await page.getByTestId("precision-search").fill("헤어");
  const hair = await rows(page).count();
  expect(hair).toBeGreaterThan(0);
  await page.getByTestId("precision-lock-shown").click();
  await expect(page.getByTestId("lock-status")).toContainText(`잠긴 속성 ${hair}개`);
  await shot(page, "precision-locked", project);
  const lockedIds = await rows(page).evaluateAll((els) => els.map((e) => e.getAttribute("data-attribute-row")!));
  const before = await stored(page);
  await page.getByRole("tab", { name: /Random/ }).click();
  await expect(page.getByTestId("random-locks")).toContainText(`잠긴 값 ${hair}개`);
  await page.getByTestId("random-generate").click();
  const after = await stored(page);
  for (const id of lockedIds) expect(after[id], id).toEqual(before[id]);

  // locked-only filter, then go to a field: it is locked there too
  await page.getByRole("tab", { name: /Precision/ }).click();
  await page.getByTestId("precision-search").fill("");
  await page.getByTestId("precision-lock").selectOption("locked");
  await expect(rows(page)).toHaveCount(hair);
  const first = lockedIds[0]!;
  await page.locator(`[data-attribute-row="${first}"]`).getByRole("button", { name: /편집으로 이동$/ }).click();
  await expect(page.getByRole("tab", { name: /Detailed/ })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByTestId(`lock-${first}`)).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId(`locked-note-${first}`)).toBeVisible();
  await shot(page, "field-locked", project);

  // reload: the locks come back with the design
  await page.reload();
  await expect(page.getByTestId("lock-status")).toContainText(`잠긴 속성 ${hair}개`);
  await page.getByTestId("unlock-all").click();
  await expect(page.getByTestId("lock-status")).toHaveCount(0);
  expect(external).toEqual([]);
});
