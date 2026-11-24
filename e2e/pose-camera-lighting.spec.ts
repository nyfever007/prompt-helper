import { expect, test, type Page } from "@playwright/test";
import { closePreview, ensurePreviewOpen, guardNetwork } from "./helpers";

/**
 * Sprint 2-B.6 — appearance direction (Basic ↔ Detailed), pose, camera and lighting on the
 * PRODUCT catalog (/), desktop and mobile. Screenshots: set E2E_SCREENSHOT_DIR (docs/screenshots/sprint-2b6).
 */
const SHOTS = process.env.E2E_SCREENSHOT_DIR;
const shot = async (page: Page, name: string, project: string) => {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${project}-${name}.png`, fullPage: true, scale: "css" });
};
const output = (page: Page) => page.getByTestId("prompt-output");
const field = (page: Page, id: string) => page.locator(`[data-attribute-id="${id}"]`);
const nav = (page: Page) => page.getByRole("navigation", { name: "카테고리" });
const pickChip = (page: Page, id: string, label: string) =>
  field(page, id).locator("label.chip").filter({ has: page.getByText(label, { exact: true }) }).click();
const pickListed = async (page: Page, id: string, query: string, role: "radio" | "checkbox", name: RegExp) => {
  await field(page, id).getByRole("searchbox").fill(query);
  await field(page, id).getByRole(role, { name }).check();
  await field(page, id).getByRole("searchbox").fill("");
};
const go = async (page: Page, label: string) => {
  const toggle = page.locator(".nav-toggle");
  if ((await toggle.isVisible()) && (await toggle.getAttribute("aria-expanded")) !== "true") await toggle.click();
  await nav(page).getByRole("button", { name: label, exact: true }).click();
};
const closeNav = async (page: Page) => {
  const toggle = page.locator(".nav-toggle");
  if ((await toggle.isVisible()) && (await toggle.getAttribute("aria-expanded")) === "true") await toggle.click();
};
const slide = async (page: Page, id: string, steps: number) => {
  const slider = field(page, id).getByRole("slider");
  await slider.focus();
  for (let i = 0; i < Math.abs(steps); i++) await slider.press(steps > 0 ? "ArrowRight" : "ArrowLeft");
};
const stored = async (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem("prompter:v1:workspace") ?? "{}").spec?.selections ?? {});

const AD = "person.appearance.direction";

test("appearance direction in Basic and Detailed, pose, camera and lighting — persisted, reset and restored", async ({ page, baseURL }, info) => {
  const external = guardNetwork(page, baseURL!);
  const project = info.project.name;
  await page.goto("/");

  // Basic: the appearance direction appears right after choosing a person
  await expect(field(page, AD)).toHaveCount(0);
  await page.locator("label.chip").filter({ has: page.getByText("인물 (1인)", { exact: true }) }).click();
  await pickListed(page, AD, "아름다운", "checkbox", /^아름다운/);
  await pickListed(page, AD, "우아한", "checkbox", /^우아한/);
  await shot(page, "basic-appearance", project);

  // Detailed: the same value in 인상 및 매력
  await page.getByRole("tab", { name: /Detailed/ }).click();
  await go(page, "인상 및 매력");
  await expect(field(page, AD).getByRole("checkbox", { name: /^아름다운/ })).toBeChecked();

  await go(page, "기본 자세");
  await pickChip(page, "person.pose.posture", "서 있는");
  await pickChip(page, "person.pose.body_orientation", "3/4 방향");
  await go(page, "머리·시선");
  await pickChip(page, "person.pose.gaze_direction", "카메라를 보는");
  await shot(page, "pose", project);

  await go(page, "카메라");
  await pickChip(page, "composition.framing", "머리와 어깨 (바스트 샷)");
  await pickChip(page, "camera.focal_length", "85mm");
  await pickChip(page, "camera.aperture", "f/2.8");
  await slide(page, "camera.depth_of_field", -1);
  await expect(page.getByTestId("slider-value-camera.depth_of_field")).toHaveText("얕음");
  await shot(page, "camera", project);

  await go(page, "조명");
  await pickChip(page, "lighting.direction", "3/4 측광");
  await pickChip(page, "lighting.softness", "부드러운");
  await pickChip(page, "lighting.color_temperature", "따뜻한");
  await pickChip(page, "lighting.fill", "약간");
  await pickChip(page, "lighting.rim_color", "시안");
  await pickChip(page, "lighting.rim", "없음"); // rim color kept but not output
  await expect(field(page, "lighting.rim_color")).toContainText("현재 선택에는 적용되지 않습니다");
  await shot(page, "lighting", project);

  const expected =
    "Main subject: a single person. Appearance direction: beautiful, elegant. Posture: standing. Body orientation: three-quarter facing. " +
    "Gaze direction: looking at the camera. Framing: head-and-shoulders portrait. Focal length: 85 mm. Aperture: f/2.8. Depth of field: shallow. " +
    "Light direction: three-quarter lighting. Light quality: soft light. Color temperature: warm. Fill light: subtle. Rim light: none.";
  await ensurePreviewOpen(page);
  await expect(output(page)).toHaveText(expected);
  await shot(page, "preview", project);

  const before = await stored(page);
  expect(Object.keys(before)).toHaveLength(15);
  expect(before[AD].value).toEqual({ kind: "multi", optionIds: ["beautiful", "elegant"] });
  expect(before["lighting.rim_color"].value).toEqual({ kind: "single", optionId: "cyan" });

  await page.reload();
  await page.getByRole("tab", { name: /Detailed/ }).click();
  await ensurePreviewOpen(page);
  await expect(output(page)).toHaveText(expected);
  expect(await stored(page)).toEqual(before);

  // Resetting 자세 및 행동 clears every pose subcategory and can be undone
  await closePreview(page);
  await go(page, "자세 및 행동");
  await closeNav(page);
  await page.getByTestId("category-reset").click();
  await expect(page.getByTestId("category-reset-dialog")).toContainText("3개를 모두 지웁니다");
  await page.getByTestId("category-reset-dialog").getByRole("button", { name: "3개 값 초기화" }).click();
  expect(Object.keys(await stored(page))).toHaveLength(12);
  await page.getByRole("button", { name: "카테고리 초기화 되돌리기" }).click();
  expect(await stored(page)).toEqual(before);

  // Back in Basic: the shared value is still there
  await page.getByRole("tab", { name: /Basic/ }).click();
  await expect(field(page, AD).getByRole("checkbox", { name: /^우아한/ })).toBeChecked();
  expect(external).toEqual([]);
});
