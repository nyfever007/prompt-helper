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

/** Records every request that leaves the local app server. */
export const guardNetwork = (page: Page, baseURL: string) => {
  const external: string[] = [];
  page.on("request", (req) => {
    const url = req.url();
    if (!url.startsWith(baseURL) && !url.startsWith("data:") && !url.startsWith("blob:")) external.push(url);
  });
  return external;
};
