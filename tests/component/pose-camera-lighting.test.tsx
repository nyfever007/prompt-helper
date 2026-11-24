// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { PrompterApp } from "@/components/PrompterApp";
import { createMemoryStore, getCoreRegistry, WORKSPACE_STORAGE_KEY, type KeyValueStore } from "@/domain";

afterEach(() => cleanup());

/** Sprint 2-B.6 — appearance direction (Basic + Detailed), pose, camera and lighting on the product catalog. */
const core = getCoreRegistry();
const AD = "person.appearance.direction";
const prompt = () => screen.queryByTestId("prompt-output")?.textContent ?? "";
const field = (id: string) => document.querySelector<HTMLElement>(`[data-attribute-id="${id}"]`);
const nav = () => screen.getByRole("navigation", { name: "카테고리" });
const saved = (store: KeyValueStore) => JSON.parse(store.getItem(WORKSPACE_STORAGE_KEY) ?? "{}").spec?.selections ?? {};
const chip = (id: string, label: string) => within(field(id)!).getByText(label, { exact: true }).closest("label")!;
/** Color pickers are collapsed (Sprint 2-C.1, TD-13): open the palette first. */
const palette = (id: string) => within(field(id)!).getByRole("button", { name: /색상 선택$|색상 변경$|팔레트 닫기$/ });

const open = async (store: KeyValueStore = createMemoryStore()) => {
  const user = userEvent.setup();
  render(<PrompterApp registry={core} store={store} />);
  await waitFor(() => expect(screen.getByTestId("storage-status").textContent).not.toMatch(/불러오는 중/));
  const go = async (label: string) => user.click(within(nav()).getByRole("treeitem", { name: label }));
  return { user, store, go };
};

describe("appearance direction in Basic and Detailed (one ImageSpec value)", () => {
  it("appears in Basic right after choosing a person; the value is shared with Detailed › 인상 및 매력 both ways", async () => {
    const { user, store, go } = await open();
    expect(field(AD)).toBeNull(); // nothing shown before the subject is a person
    await user.click(within(field("subject.kind")!).getByRole("radio", { name: "인물 (1인)" }));
    const what = document.querySelector('[data-group-id="what"]')!;
    expect([...what.querySelectorAll("[data-attribute-id]")].map((e) => e.getAttribute("data-attribute-id"))).toEqual(["intent.description", "subject.kind", AD]);
    expect(saved(store)[AD]).toBeUndefined(); // no value is set automatically
    await user.click(within(field(AD)!).getByRole("checkbox", { name: /^아름다운/ }));
    await user.click(within(field(AD)!).getByRole("checkbox", { name: /^우아한/ }));
    expect(prompt()).toBe("Main subject: a single person. Appearance direction: beautiful, elegant.");

    await user.click(screen.getByRole("tab", { name: /Detailed/ }));
    await go("인상 및 매력");
    expect(within(field(AD)!).getByRole("checkbox", { name: /^아름다운/ })).toBeChecked();
    await user.click(within(field(AD)!).getByRole("checkbox", { name: /^우아한/ })); // deselect in Detailed
    await user.click(screen.getByRole("tab", { name: /Basic/ }));
    expect(within(field(AD)!).getByRole("checkbox", { name: /^우아한/ })).not.toBeChecked();
    expect(saved(store)[AD].value).toEqual({ kind: "multi", optionIds: ["beautiful"] });
    expect(prompt()).toBe("Main subject: a single person. Appearance direction: beautiful.");
  });

  it("choosing a non-person subject hides it in Basic but keeps the value (restored when back to person)", async () => {
    const { user, store } = await open();
    await user.click(within(field("subject.kind")!).getByRole("radio", { name: "인물 (1인)" }));
    await user.click(within(field(AD)!).getByRole("checkbox", { name: /^잘생긴/ }));
    await user.click(within(field("subject.kind")!).getByRole("radio", { name: "풍경" }));
    expect(prompt()).toBe("Main subject: a landscape.");
    expect(saved(store)[AD]).toBeDefined();
    await user.click(within(field("subject.kind")!).getByRole("radio", { name: "인물 (1인)" }));
    expect(prompt()).toBe("Main subject: a single person. Appearance direction: handsome.");
  });
});

describe("pose, camera and lighting in the Detailed editor", () => {
  it("pose has 5 subcategories with 22 attributes; camera and lighting pages hold reused + new attributes", async () => {
    const { user, go } = await open();
    await user.click(screen.getByRole("tab", { name: /Detailed/ }));
    // Sprint 2-C.1: Camera (5) and Lighting (6) are split into meaning groups — 18 + 18 attributes as before.
    for (const [label, n] of [
      ["기본 자세", 7], ["머리·시선", 4], ["팔·손 자세", 4], ["다리·발 자세", 3], ["동작", 4],
      ["프레이밍 및 시점", 5], ["렌즈 및 원근감", 4], ["초점 및 피사계 심도", 4], ["구도 및 배치", 3], ["카메라 효과", 2],
      ["조명 프리셋 및 광원", 2], ["주광", 4], ["보조광 및 환경광", 5], ["색상 및 색온도", 2], ["그림자 및 대비", 3], ["조명 효과", 2],
    ] as const) {
      await go(label);
      expect(screen.queryByTestId("draft-placeholder"), label).toBeNull();
      expect(document.querySelectorAll(".cat-panel .attribute-list > [data-attribute-id]"), label).toHaveLength(n);
    }
  });

  it("focal length and aperture show their real values; no rim light hides the rim color with a notice", async () => {
    const { user, go, store } = await open();
    await user.click(screen.getByRole("tab", { name: /Detailed/ }));
    await go("렌즈 및 원근감");
    await user.click(chip("camera.focal_length", "85mm"));
    await go("초점 및 피사계 심도");
    await user.click(chip("camera.aperture", "f/2.8"));
    expect(prompt()).toBe("Focal length: 85 mm. Aperture: f/2.8.");
    // Rim strength and rim color are on the same page (Sprint 2-C.1 final approval).
    await go("보조광 및 환경광");
    await user.click(chip("lighting.rim", "없음"));
    await user.click(palette("lighting.rim_color"));
    await user.click(chip("lighting.rim_color", "시안"));
    expect(screen.getByTestId("color-current-lighting.rim_color")).toHaveTextContent(/^시안/); // shown collapsed after the choice
    expect(prompt()).toBe("Focal length: 85 mm. Aperture: f/2.8. Rim light: none.");
    expect(within(field("lighting.rim_color")!).getByText(/현재 선택에는 적용되지 않습니다/)).toBeInTheDocument();
    expect(saved(store)["lighting.rim_color"].value).toEqual({ kind: "single", optionId: "cyan" });
  });
});
