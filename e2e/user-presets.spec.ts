import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import { closePreview, guardNetwork } from "./helpers";

/**
 * Sprint 3.3 — My Presets end to end (desktop and mobile): save a random design as a preset (card with sketches),
 * apply it to a new design through the preset dialog (saved locks on request), export the library as JSON.
 * Screenshots: E2E_SCREENSHOT_DIR.
 */
const SHOTS = process.env.E2E_SCREENSHOT_DIR;
const shot = async (page: Page, name: string, project: string) => {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${project}-${name}.png`, scale: "css" });
};
const stored = async (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem("prompter:v1:workspace") ?? "{}").spec?.selections ?? {});

test("my presets: save a design, apply it to another one, export the library", async ({ page, baseURL }, testInfo) => {
  const external = guardNetwork(page, baseURL!);
  const project = testInfo.project.name;
  await page.goto("/");
  await page.getByRole("tab", { name: /Random/ }).click();
  await page.getByTestId("random-generate").click();
  await closePreview(page);
  const design = await stored(page);

  // lock two values in Precision, then save everything as a preset from Recommended
  await page.getByRole("tab", { name: /Precision/ }).click();
  await page.getByTestId("precision-lock-subject.kind").click();
  await page.getByTestId("precision-lock-style.preset").click();
  await page.getByRole("tab", { name: /Recommended/ }).click();
  await page.getByTestId("preset-save-current").click();
  const dialog = page.getByTestId("save-preset-dialog");
  await dialog.getByTestId("preset-name").fill("My random look");
  await dialog.getByTestId("preset-description").fill("Saved from a Natural random design");
  await expect(dialog.getByTestId("preset-selected-count")).toHaveText(`${Object.keys(design).length}개 선택`);
  await shot(page, "save-dialog", project);
  await dialog.getByTestId("preset-save").click();
  const card = page.locator("[data-user-preset]").first();
  await expect(card).toContainText(`속성 ${Object.keys(design).length}개`);
  await expect(card).toContainText("잠금 2개");
  await expect(card.getByRole("img", { name: "My random look 스케치" })).toBeVisible();
  await card.scrollIntoViewIfNeeded();
  await shot(page, "my-presets", project);

  // a new design: unlock and reset, then apply the preset with its saved locks
  await page.getByTestId("unlock-all").click();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "설정 초기화" }).click();
  expect(await stored(page)).toEqual({});
  await card.getByRole("button", { name: "“My random look” 변경 내용 확인 후 적용" }).click();
  const apply = page.getByRole("dialog");
  await apply.getByTestId("preset-apply-locks").locator("input").check();
  await shot(page, "apply-dialog", project);
  await apply.getByRole("button", { name: /적용/ }).first().click();
  const after = await stored(page);
  expect(Object.keys(after).sort()).toEqual(Object.keys(design).sort());
  for (const id of Object.keys(design)) expect(after[id].value, id).toEqual(design[id].value);
  expect(Object.keys(after).filter((id) => after[id].locked).sort()).toEqual(["style.preset", "subject.kind"]);
  await expect(page.getByTestId("lock-status")).toContainText("잠긴 속성 2개");

  // export the library
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "전체 내보내기 (JSON)" }).click()]);
  const json = JSON.parse(await readFile((await download.path())!, "utf8"));
  expect(json).toMatchObject({ kind: "prompter.user-presets", version: 1, presets: [{ name: "My random look" }] });
  expect(external).toEqual([]);
});
