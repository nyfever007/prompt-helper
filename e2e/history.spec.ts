import { expect, test, type Page } from "@playwright/test";
import { closePreview, guardNetwork, pickOption } from "./helpers";

/**
 * Sprint 3.4 — undo / redo (buttons and keyboard), the History panel and snapshots end to end, desktop and mobile;
 * the history and snapshots survive a reload. Screenshots: E2E_SCREENSHOT_DIR.
 */
const SHOTS = process.env.E2E_SCREENSHOT_DIR;
const shot = async (page: Page, name: string, project: string) => {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${project}-${name}.png`, scale: "css" });
};
const stored = async (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem("prompter:v1:workspace") ?? "{}").spec?.selections ?? {});

test("history: undo / redo, restore from the panel, snapshots, kept after reload", async ({ page, baseURL }, testInfo) => {
  const external = guardNetwork(page, baseURL!);
  const project = testInfo.project.name;
  await page.goto("/");
  await pickOption(page, "style.preset", "수채화");
  await pickOption(page, "subject.kind", "인물 (1인)");
  await page.getByRole("tab", { name: /Random/ }).click();
  await page.getByTestId("random-generate").click();
  await closePreview(page);
  const random = await stored(page);
  await shot(page, "history-bar", project);

  // undo the random run (button), redo it (keyboard)
  await page.getByTestId("history-undo").click();
  expect(Object.keys(await stored(page)).sort()).toEqual(["style.preset", "subject.kind"]);
  await page.locator("body").press(process.platform === "darwin" ? "Meta+Shift+z" : "Control+Shift+z");
  expect(await stored(page)).toEqual(random);

  // save a snapshot, then restore an earlier state from the panel
  await page.getByTestId("history-open").click();
  const panel = page.getByTestId("history-panel");
  await panel.getByTestId("snapshot-name").fill("Random A");
  await panel.getByTestId("snapshot-save").click();
  await expect(panel.locator("[data-snapshot-id]")).toHaveCount(1);
  await expect(panel.locator("[data-history-id]").first()).toContainText("랜덤 생성 (Natural)");
  await shot(page, "history-panel", project);
  await panel.locator("[data-history-id]").nth(2).getByRole("button", { name: /이후 상태로 복원/ }).click();
  expect(Object.keys(await stored(page))).toEqual(["style.preset"]);

  // reload: the history (restore is undoable) and the snapshot are still there
  await page.reload();
  await expect(page.getByTestId("history-undo")).toBeEnabled();
  await page.getByTestId("history-undo").click();
  expect(await stored(page)).toEqual(random);
  await page.getByRole("tab", { name: /Basic/ }).click();
  await pickOption(page, "style.preset", "유화");
  await page.getByTestId("history-open").click();
  await page.getByTestId("history-panel").getByRole("button", { name: "복원: Random A" }).click();
  expect(await stored(page)).toEqual(random);
  expect(external).toEqual([]);
});
