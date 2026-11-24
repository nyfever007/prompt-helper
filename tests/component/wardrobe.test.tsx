// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { PrompterApp } from "@/components/PrompterApp";
import { createMemoryStore, getCoreRegistry, WORKSPACE_STORAGE_KEY, type KeyValueStore } from "@/domain";

afterEach(() => cleanup());

/** Sprint 2-B.5 — expression, impression, makeup, wardrobe and accessories in the Detailed editor (product catalog). */
const core = getCoreRegistry();
const prompt = () => screen.queryByTestId("prompt-output")?.textContent ?? "";
const field = (id: string) => document.querySelector<HTMLElement>(`[data-attribute-id="${id}"]`)!;
const nav = () => screen.getByRole("navigation", { name: "카테고리" });
const saved = (store: KeyValueStore) => JSON.parse(store.getItem(WORKSPACE_STORAGE_KEY) ?? "{}").spec?.selections ?? {};
const chip = (id: string, label: string) => within(field(id)).getByText(label, { exact: true }).closest("label")!;

const open = async (store: KeyValueStore = createMemoryStore()) => {
  const user = userEvent.setup();
  render(<PrompterApp registry={core} store={store} />);
  await waitFor(() => expect(screen.getByTestId("storage-status").textContent).not.toMatch(/불러오는 중/));
  await user.click(screen.getByRole("tab", { name: /Detailed/ }));
  const go = async (label: string) => user.click(within(nav()).getByRole("button", { name: label }));
  return { user, store, go };
};

describe("Sprint 2-B.5 areas in the Detailed editor", () => {
  it("all new areas are editable with the approved attribute counts (no draft placeholder)", async () => {
    const { go } = await open();
    for (const [label, n] of [
      ["표정", 10], ["인상 및 매력", 8], ["메이크업", 16],
      ["전체 설정", 8], ["상의", 12], ["하의", 10], ["원피스 및 일체형", 13], ["아우터", 11], ["내의", 4], ["신발", 8], ["양말 및 스타킹", 6],
      ["액세서리", 18],
    ] as const) {
      await go(label);
      expect(screen.queryByTestId("draft-placeholder"), label).toBeNull();
      expect(document.querySelectorAll(".cat-panel .attribute-list > [data-attribute-id]"), label).toHaveLength(n);
    }
    await go("자세 및 행동");
    expect(screen.getByTestId("draft-placeholder")).toBeInTheDocument(); // pose stays draft (2-B.6)
  });

  it("emotion intensity is a band-label slider that stores nothing until moved; emotions combine", async () => {
    const { user, go, store } = await open();
    await go("표정");
    const slider = within(field("person.expression.emotion_intensity")).getByRole("slider");
    slider.focus();
    await waitFor(() => expect(screen.getByTestId("storage-status").textContent).toMatch(/로컬에 저장됨/));
    expect(saved(store)["person.expression.emotion_intensity"]).toBeUndefined();
    fireEvent.change(slider, { target: { value: "2" } });
    expect(screen.getByTestId("slider-value-person.expression.emotion_intensity")).toHaveTextContent(/^은은함$/);
    await user.type(within(field("person.expression.emotion")).getByRole("searchbox"), "기쁨");
    await user.click(within(field("person.expression.emotion")).getByRole("checkbox", { name: /^기쁨/ }));
    expect(prompt()).toBe("Emotion: happy. Emotional expression intensity: subtle.");
    expect(Object.keys(saved(store)).sort()).toEqual(["person.expression.emotion", "person.expression.emotion_intensity"]);
  });

  it("“no makeup” keeps makeup values but stops outputting them (with a notice); “makeup applied” restores them", async () => {
    const { user, go, store } = await open();
    await go("메이크업");
    await user.click(chip("person.makeup.lip_color", "더스티 로즈"));
    await user.click(chip("person.makeup.base_finish", "듀이"));
    expect(prompt()).toBe("Foundation finish: dewy. Lip makeup color: dusty rose.");
    expect([...field("person.makeup.lip_color").querySelectorAll(".swatch-group__title")].map((g) => g.textContent)).toEqual(["뉴트럴", "핑크", "레드", "오렌지", "퍼플", "다크", "메탈릭", "크리에이티브"]);
    await user.click(chip("person.makeup.presence", "메이크업 없음"));
    expect(prompt()).toBe("Makeup: no makeup.");
    expect(within(field("person.makeup.lip_color")).getByText(/현재 선택에는 적용되지 않습니다/)).toBeInTheDocument();
    expect(saved(store)["person.makeup.lip_color"].value).toEqual({ kind: "single", optionId: "dusty_rose" });
    await user.click(chip("person.makeup.presence", "메이크업 함"));
    expect(prompt()).toBe("Makeup: makeup applied. Foundation finish: dewy. Lip makeup color: dusty rose.");
  });

  it("garment type + its own color; “none” hides only that garment's details; resetting 의상 clears every garment and can be undone", async () => {
    const { user, go, store } = await open();
    await go("상의");
    await user.type(within(field("person.clothing.tops.type")).getByRole("searchbox"), "블라우스");
    await user.click(within(field("person.clothing.tops.type")).getByRole("radio", { name: /^블라우스/ }));
    await user.click(chip("person.clothing.tops.primary_color", "아이보리"));
    expect([...field("person.clothing.tops.primary_color").querySelectorAll(".swatch-group__title")]).toHaveLength(10);
    await go("하의");
    await user.click(chip("person.clothing.bottoms.primary_color", "네이비"));
    expect(prompt()).toBe("Top: blouse. Top primary color: ivory. Bottom primary color: navy.");
    await go("상의");
    await user.clear(within(field("person.clothing.tops.type")).getByRole("searchbox"));
    await user.click(within(field("person.clothing.tops.type")).getByRole("radio", { name: /^없음/ }));
    expect(prompt()).toBe("Top: no separate top garment. Bottom primary color: navy.");
    expect(within(field("person.clothing.tops.primary_color")).getByText(/현재 선택에는 적용되지 않습니다/)).toBeInTheDocument();
    await go("의상");
    await user.click(screen.getByTestId("category-reset"));
    await user.click(within(screen.getByTestId("category-reset-dialog")).getByRole("button", { name: "3개 값 초기화" }));
    expect(saved(store)).toEqual({});
    await user.click(screen.getByRole("button", { name: "카테고리 초기화 되돌리기" }));
    expect(Object.keys(saved(store)).sort()).toEqual(["person.clothing.bottoms.primary_color", "person.clothing.tops.primary_color", "person.clothing.tops.type"]);
  });

  it("accessories: multi-select earrings; “none” with others warns; no eyewear hides the frame shape", async () => {
    const { user, go } = await open();
    await go("액세서리");
    await user.click(within(field("person.accessories.earrings")).getByRole("checkbox", { name: /^스터드/ }));
    await user.click(within(field("person.accessories.earrings")).getByRole("checkbox", { name: /^링 귀걸이/ }));
    expect(prompt()).toBe("Earrings: stud earrings, hoop earrings.");
    await user.click(within(field("person.accessories.earrings")).getByRole("checkbox", { name: /^없음/ }));
    expect(within(field("person.accessories.earrings")).getByText(/‘없음’\(귀걸이\)이 다른 항목과 함께/)).toBeInTheDocument();
    await user.click(chip("person.accessories.frame_shape", "둥근"));
    await user.click(chip("person.accessories.eyewear", "없음"));
    expect(within(field("person.accessories.frame_shape")).getByText(/현재 선택에는 적용되지 않습니다/)).toBeInTheDocument();
    expect(prompt()).toBe("Eyewear: none. Earrings: none, stud earrings, hoop earrings.");
  });
});
