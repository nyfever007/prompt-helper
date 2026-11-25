import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import { closePreview, ensurePreviewOpen, guardNetwork, pickOption } from "./helpers";

/**
 * Sprint 3.2 — user-defined colors (picker, HEX, RGB) drawn live in the Face Builder and the Lighting preview,
 * stated exactly in the prompt; ImageSpec 0.4.0 export carries colors and locks and imports back. Desktop and mobile.
 * Screenshots: E2E_SCREENSHOT_DIR.
 */
const SHOTS = process.env.E2E_SCREENSHOT_DIR;
const shot = async (page: Page, name: string, project: string) => {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${project}-${name}.png`, scale: "css" });
};
const nav = (page: Page) => page.getByRole("navigation", { name: "카테고리", exact: true });
const go = async (page: Page, label: string) => {
  const toggle = page.locator(".nav-toggle");
  if ((await toggle.isVisible()) && (await toggle.getAttribute("aria-expanded")) !== "true") await toggle.click();
  await nav(page).getByRole("treeitem", { name: label, exact: true }).locator(":scope > .cat-row").click();
};
const setHex = async (page: Page, id: string, hex: string) => {
  await page.getByTestId(`custom-color-open-${id}`).click();
  const input = page.getByTestId(`custom-color-hex-${id}`);
  await input.fill(hex);
  await input.blur();
};

test("custom colors: hair and key light drawn live, exact color in the prompt, export/import with locks (0.4.0)", async ({ page, baseURL }, testInfo) => {
  const external = guardNetwork(page, baseURL!);
  const project = testInfo.project.name;
  await page.goto("/");
  await pickOption(page, "subject.kind", "인물 (1인)");
  await page.getByRole("tab", { name: /Detailed/ }).click();

  await go(page, "헤어");
  const face = page.getByTestId("face-builder").getByRole("img", { name: /^정면 스케치/ });
  const before = await face.innerHTML();
  await setHex(page, "person.hair.primary_color", "#3a7bd5");
  await expect(page.getByTestId("custom-color-r-person.hair.primary_color")).toHaveValue("58");
  await expect(page.getByTestId("color-current-person.hair.primary_color")).toContainText("#3A7BD5");
  expect(await face.innerHTML()).not.toBe(before);
  expect(await face.innerHTML()).toMatch(/#3a7bd5|rgb\(58, 123, 213\)/i); // the browser may serialize the fill as rgb()
  await page.getByTestId("custom-color-person.hair.primary_color").scrollIntoViewIfNeeded();
  await shot(page, "custom-color-hair", project);

  await go(page, "색상 및 색온도");
  const light = page.getByTestId("light-preview").getByRole("img", { name: /^조명 미리보기/ });
  const l0 = await light.innerHTML();
  await setHex(page, "lighting.key_color", "#ff8800");
  // the preview blends the key color into its light and shadow tones (exact value: unit test of lightSketchState)
  expect(await light.innerHTML()).not.toBe(l0);
  await page.getByTestId("lock-lighting.key_color").click();
  await expect(page.getByTestId("custom-color-hex-lighting.key_color")).toBeDisabled();
  await shot(page, "custom-color-light-locked", project);

  await ensurePreviewOpen(page);
  await page.getByTestId("prompt-detail").getByText("Full", { exact: true }).click();
  await expect(page.getByTestId("prompt-output")).toContainText("Primary hair color: custom color #3A7BD5 (RGB 58, 123, 213, close to");
  await expect(page.getByTestId("prompt-output")).toContainText("Key light color: custom color #FF8800 (RGB 255, 136, 0, close to");
  await closePreview(page);

  // export (0.4.0: color + lock), reset everything else, import back
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "JSON 내보내기" }).click()]);
  const text = await readFile((await download.path())!, "utf8");
  const json = JSON.parse(text);
  expect(json.schemaVersion).toBe("0.4.0");
  expect(json.selections["person.hair.primary_color"].value.custom).toEqual({ label: "#3A7BD5", color: "#3A7BD5" });
  expect(json.selections["lighting.key_color"]).toMatchObject({ locked: true, value: { custom: { color: "#FF8800" } } });
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "설정 초기화" }).click();
  await expect(page.getByTestId("lock-status")).toContainText("잠긴 속성 1개"); // the locked key light survives a full reset
  await page.getByTestId("import-input").setInputFiles({ name: "design.json", mimeType: "application/json", buffer: Buffer.from(text) });
  await expect
    .poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("prompter:v1:workspace") ?? "{}").spec?.selections?.["person.hair.primary_color"]?.value?.custom?.color))
    .toBe("#3A7BD5");
  await go(page, "헤어");
  await expect(page.getByTestId("color-current-person.hair.primary_color")).toContainText("#3A7BD5");
  expect(external).toEqual([]);
});
