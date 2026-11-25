import { expect, test, type Page } from "@playwright/test";
import { ensurePreviewOpen, closePreview, guardNetwork, pickOption } from "./helpers";

/**
 * Sprint 2-D.5 — Recommended mode end to end: pick a concept, confirm, apply (the user's value is kept),
 * edit a suggested value in Detailed, then undo the concept — the user's edit stays.
 */
const nav = (page: Page) => page.getByRole("navigation", { name: "카테고리", exact: true });
const go = async (page: Page, label: string) => {
  const toggle = page.locator(".nav-toggle");
  if ((await toggle.isVisible()) && (await toggle.getAttribute("aria-expanded")) !== "true") await toggle.click();
  await nav(page).getByRole("treeitem", { name: label, exact: true }).locator(":scope > .cat-row").click();
};
const stored = async (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem("prompter:v1:workspace") ?? "{}").spec?.selections ?? {});

test("recommended concept: confirm, apply keeping the user's value, edit in Detailed, undo keeps the edit", async ({ page, baseURL }) => {
  const external = guardNetwork(page, baseURL!);
  await page.goto("/");
  await pickOption(page, "mood.tone", "아늑한"); // a value the user sets in Basic
  await page.getByRole("tab", { name: /Recommended/ }).click();
  await expect(page.locator("li.concept")).toHaveCount(12);
  await page.getByRole("button", { name: "변경 내용 확인 후 적용: 영화 속 주인공" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByTestId("kept-by-default")).toBeVisible();
  await dialog.getByRole("button", { name: "직접 설정한 값은 유지하고 적용" }).click();
  await expect(page.getByTestId("concept-bar")).toContainText("영화 속 주인공");
  let s = await stored(page);
  expect(s["mood.tone"].source).toBe("user");
  expect(s["style.preset"].origin.presetId).toBe("concept_cinematic_character");
  await ensurePreviewOpen(page);
  await expect(page.getByTestId("prompt-output")).toContainText("cinematic");
  await closePreview(page);

  // edit a suggested value in Detailed
  await page.getByTestId("concept-bar").getByRole("button", { name: "Detailed에서 편집" }).click();
  await go(page, "렌즈 및 원근감");
  await pickOption(page, "camera.focal_length", "85mm");
  s = await stored(page);
  expect(s["camera.focal_length"].source).toBe("user");

  // undo the concept: the user's edit and the user's own value stay, the rest goes
  await page.getByRole("tab", { name: /Recommended/ }).click();
  await page.getByTestId("concept-bar").getByRole("button", { name: "되돌리기" }).click();
  s = await stored(page);
  expect(Object.keys(s).sort()).toEqual(["camera.focal_length", "mood.tone"]);
  expect(external).toEqual([]);
});
