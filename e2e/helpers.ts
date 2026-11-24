import { expect, type Page } from "@playwright/test";

/** On mobile the preview is a bottom sheet: open it through the bottom toolbar. No-op on desktop. */
export const ensurePreviewOpen = async (page: Page) => {
  const bar = page.getByRole("toolbar", { name: "프롬프트 도구" });
  if (!(await bar.isVisible())) return;
  const toggle = bar.getByRole("button", { name: /미리보기/ });
  if ((await toggle.getAttribute("aria-expanded")) !== "true") await toggle.click();
  await expect(page.locator("#preview-panel")).toBeVisible();
};

export const closePreview = async (page: Page) => {
  const bar = page.getByRole("toolbar", { name: "프롬프트 도구" });
  if (!(await bar.isVisible())) return;
  const toggle = bar.getByRole("button", { name: /미리보기/ });
  if ((await toggle.getAttribute("aria-expanded")) === "true") await toggle.click();
};

/** Color pickers are collapsed (Sprint 2-C.1, TD-13): open the palette, choose, and check the collapsed value. */
export const pickColor = async (page: Page, id: string, label: string) => {
  const f = page.locator(`[data-attribute-id="${id}"]`);
  await f.getByRole("button", { name: /색상 선택$|색상 변경$/ }).click();
  await f.locator("label.chip").filter({ has: page.getByText(label, { exact: true }) }).click();
  await expect(f.getByTestId(`color-current-${id}`)).toContainText(label);
  await expect(f.locator(".color-palette")).toHaveCount(0); // a single choice closes the palette
};

/** Records every request that leaves the local app server. */
export const guardNetwork = (page: Page, baseURL: string) => {
  const external: string[] = [];
  page.on("request", (req) => {
    const url = req.url();
    if (!url.startsWith(baseURL) && !url.startsWith("data:") && !url.startsWith("blob:")) external.push(url);
  });
  return external;
};
