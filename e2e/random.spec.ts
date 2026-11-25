import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import { closePreview, ensurePreviewOpen, guardNetwork, pickOption } from "./helpers";

/**
 * Sprint 2-D.6 — Random Composer end to end (desktop and mobile): generate from nothing, keep a value the user
 * sets in Basic, regenerate, check the result in Detailed and the Face Builder, undo, export as JSON.
 */
const stored = async (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem("prompter:v1:workspace") ?? "{}").spec?.selections ?? {});
const isRandom = (s: { source: string; origin?: { presetId: string } }) => s.source === "preset" && s.origin?.presetId === "random_composer";
const nav = (page: Page) => page.getByRole("navigation", { name: "카테고리", exact: true });
const go = async (page: Page, label: string) => {
  const toggle = page.locator(".nav-toggle");
  if ((await toggle.isVisible()) && (await toggle.getAttribute("aria-expanded")) !== "true") await toggle.click();
  await nav(page).getByRole("treeitem", { name: label, exact: true }).locator(":scope > .cat-row").click();
};

test("random composer: from nothing, keep the user's value, regenerate, edit, undo, export", async ({ page, baseURL }) => {
  const external = guardNetwork(page, baseURL!);
  await page.goto("/");
  // the five mode tabs fit without horizontal scrolling (also on a phone)
  const tabs = page.getByRole("tablist", { name: "Mode" });
  expect(await tabs.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);

  await page.getByRole("tab", { name: /Random/ }).click();
  await page.getByTestId("random-generate").click();
  let s = await stored(page);
  expect(Object.keys(s).length).toBeGreaterThan(150);
  expect(Object.values(s).every((x) => isRandom(x as never))).toBe(true);
  await ensurePreviewOpen(page);
  await expect(page.getByTestId("prompt-output")).toContainText("Main subject: a single person.");
  await closePreview(page);

  // a value the user sets in Basic is kept by the next run
  await page.getByRole("tab", { name: /Basic/ }).click();
  // choose a style different from the random one (clicking the checked option would not change anything)
  const target = s["style.preset"]?.value.optionId === "watercolor" ? { id: "oil_painting", name: "유화" } : { id: "watercolor", name: "수채화" };
  await pickOption(page, "style.preset", target.name);
  await page.getByRole("tab", { name: /Random/ }).click();
  await page.getByTestId("random-generate").click();
  s = await stored(page);
  expect(s["style.preset"]).toMatchObject({ source: "user", value: { optionId: target.id } });

  // the result is an ordinary spec: Detailed marks random values, the Face Builder draws them
  await page.getByRole("button", { name: "Detailed에서 편집" }).click();
  await go(page, "얼굴");
  await expect(page.getByTestId("random-person.face.shape")).toHaveText("랜덤 생성");
  await expect(page.getByTestId("face-builder").getByRole("img", { name: /^정면 스케치 — 설정 \d+개 반영/ })).toBeVisible();

  // undo the last run, then export the design as JSON
  await page.getByRole("tab", { name: /Random/ }).click();
  const before = Object.keys(await stored(page)).length;
  await page.getByTestId("random-undo").click();
  expect(Object.keys(await stored(page)).length).toBeGreaterThan(100); // the first run (plus the user's value) is back
  expect(before).toBeGreaterThan(100);
  // the JSON toolbar sits below the preview; on mobile the open preview sheet can cover it — keep it closed
  await closePreview(page);
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "JSON 내보내기" }).click()]);
  const json = JSON.parse(await readFile((await download.path())!, "utf8"));
  expect(json.selections["style.preset"].source).toBe("user");
  expect(Object.values(json.selections as Record<string, { origin?: { presetId: string } }>).some((x) => x.origin?.presetId === "random_composer")).toBe(true);
  expect(external).toEqual([]);
});
