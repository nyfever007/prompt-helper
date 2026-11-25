// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { PrompterApp } from "@/components/PrompterApp";
import { createMemoryStore, getCoreRegistry, WORKSPACE_STORAGE_KEY } from "@/domain";

afterEach(() => cleanup());

/** Sprint 2-D.4 — pose view of the Figure Builder, camera preview and lighting preview (read-only views of the ImageSpec). */
const core = getCoreRegistry();
const field = (id: string) => document.querySelector<HTMLElement>(`[data-attribute-id="${id}"]`)!;
const saved = (store: ReturnType<typeof createMemoryStore>) => JSON.parse(store.getItem(WORKSPACE_STORAGE_KEY) ?? "{}").spec?.selections ?? {};
const open = async (page: string) => {
  const user = userEvent.setup();
  const store = createMemoryStore();
  render(<PrompterApp registry={core} store={store} />);
  await waitFor(() => expect(screen.getByTestId("storage-status").textContent).not.toMatch(/불러오는 중/));
  await user.click(screen.getByRole("tab", { name: /Detailed/ }));
  await user.click(within(screen.getByRole("navigation", { name: "카테고리" })).getByRole("treeitem", { name: page }));
  return { user, store };
};

describe("pose, camera and lighting previews", () => {
  it("pose pages show the posed mannequin; a pose card redraws it", async () => {
    const { user, store } = await open("기본 자세");
    const img = () => within(screen.getByTestId("figure-builder")).getByRole("img", { name: /^자세 스케치/ });
    const before = img().innerHTML;
    await user.click(within(field("person.pose.posture")).getByRole("radio", { name: "앉은" }));
    expect(img().innerHTML).not.toBe(before);
    expect(img()).toHaveAccessibleName("자세 스케치 — 설정 1개 반영");
    expect(Object.keys(saved(store))).toEqual(["person.pose.posture"]);
  });

  it("the camera preview combines framing and composition; a slider preview follows its value; nothing extra is stored", async () => {
    const { user, store } = await open("프레이밍 및 시점");
    const img = () => within(screen.getByTestId("camera-preview")).getByRole("img", { name: /^카메라 미리보기/ });
    expect(img()).toHaveAccessibleName("카메라 미리보기 — 설정 0개 반영");
    const before = img().innerHTML;
    await user.click(within(field("composition.framing")).getByRole("radio", { name: "상반신" }));
    expect(img().innerHTML).not.toBe(before);
    const preview = screen.getByTestId("slider-preview-camera.distance");
    const p0 = preview.innerHTML;
    fireEvent.change(within(field("camera.distance")).getByRole("slider"), { target: { value: "5" } });
    expect(screen.getByTestId("slider-preview-camera.distance").innerHTML).not.toBe(p0);
    expect(Object.keys(saved(store)).sort()).toEqual(["camera.distance", "composition.framing"]);
  });

  it("the lighting preview combines the lighting settings; the key-height slider has its own live preview", async () => {
    const { user, store } = await open("주광");
    const img = () => within(screen.getByTestId("light-preview")).getByRole("img", { name: /^조명 미리보기/ });
    const before = img().innerHTML;
    await user.click(within(field("lighting.direction")).getByRole("radio", { name: "역광" }));
    const backlit = img().innerHTML;
    expect(backlit).not.toBe(before);
    await user.click(within(field("lighting.softness")).getByRole("radio", { name: "아주 딱딱한" }));
    expect(img().innerHTML).not.toBe(backlit);
    const preview = screen.getByTestId("slider-preview-lighting.key_height");
    const p0 = preview.innerHTML;
    fireEvent.change(within(field("lighting.key_height")).getByRole("slider"), { target: { value: "1" } });
    expect(screen.getByTestId("slider-preview-lighting.key_height").innerHTML).not.toBe(p0);
    expect(Object.keys(saved(store)).sort()).toEqual(["lighting.direction", "lighting.key_height", "lighting.softness"]);
  });
});
