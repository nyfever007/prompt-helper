// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { PrompterApp } from "@/components/PrompterApp";
import { createMemoryStore, getCoreRegistry, WORKSPACE_STORAGE_KEY, type KeyValueStore } from "@/domain";

afterEach(() => cleanup());

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

describe("facial areas in the Detailed editor (real core catalog)", () => {
  it("all 5 areas are editable with the approved attribute counts", async () => {
    const { go } = await open();
    for (const [label, n] of [["얼굴", 10], ["눈", 13], ["눈썹", 8], ["코", 8], ["입술", 8]] as const) {
      await go(label);
      expect(screen.queryByTestId("draft-placeholder"), label).toBeNull();
      expect(document.querySelectorAll(".cat-panel .attribute-list > [data-attribute-id]"), label).toHaveLength(n);
    }
  });

  it("relative slider: showing/focusing stores nothing; an input stores the raw number and shows only the band", async () => {
    const { go, store } = await open();
    await go("눈");
    const slider = within(field("person.eyes.size")).getByRole("slider");
    expect(slider).toHaveAttribute("aria-valuetext", "미설정");
    slider.focus();
    await waitFor(() => expect(screen.getByTestId("storage-status").textContent).toMatch(/로컬에 저장됨/));
    expect(saved(store)["person.eyes.size"]).toBeUndefined();
    fireEvent.change(slider, { target: { value: "4" } });
    expect(screen.getByTestId("slider-value-person.eyes.size")).toHaveTextContent(/^큼$/);
    expect(saved(store)["person.eyes.size"].value).toEqual({ kind: "number", value: 4 });
    expect(prompt()).toBe("Eye size: large.");
    expect(within(field("person.eyes.size")).getByText(/상대적인 정도이며 실제 측정값이 아닙니다/)).toBeInTheDocument();
  });

  it("palette color + custom color with a separate expression", async () => {
    const { user, go, store } = await open();
    await go("눈");
    await user.click(chip("person.eyes.iris_color", "짙은 갈색"));
    expect(prompt()).toBe("Iris color: dark brown.");
    await user.click(within(field("person.eyes.iris_color")).getByRole("button", { name: /사용자 정의 값 추가/ }));
    const form = within(field("person.eyes.iris_color")).getByRole("form");
    await user.type(within(form).getByRole("textbox", { name: /이름/ }), "오드아이");
    await user.type(within(form).getByRole("textbox", { name: /프롬프트 표현/ }), "heterochromatic irises, one blue and one amber");
    await user.click(within(form).getByRole("button", { name: "추가" }));
    expect(saved(store)["person.eyes.iris_color"].value).toEqual({ kind: "single", custom: { label: "오드아이", expression: "heterochromatic irises, one blue and one amber" } });
    expect(prompt()).toBe("Iris color: heterochromatic irises, one blue and one amber.");
  });

  it("combinable traits (multi) and a non-blocking notice for opposite traits; the face shape sets nothing else", async () => {
    const { user, go, store } = await open();
    await go("얼굴");
    await user.click(chip("person.face.shape", "계란형"));
    await user.click(chip("person.face.cheekbones", "높은"));
    await user.click(chip("person.face.cheekbones", "돌출된"));
    expect(prompt()).toBe("Face shape: oval. Cheekbones: prominent, high.");
    expect(within(field("person.face.cheekbones")).queryByText(/서로 반대되는 특징/)).toBeNull();
    await user.click(chip("person.face.cheekbones", "평평한"));
    expect(within(field("person.face.cheekbones")).getByText(/‘평평한’과\(와\) ‘돌출된’은\(는\) 서로 반대되는 특징/)).toBeInTheDocument();
    expect(saved(store)["person.face.cheekbones"].value.optionIds.sort()).toEqual(["flat", "high", "prominent"]);
    expect(Object.keys(saved(store)).sort()).toEqual(["person.face.cheekbones", "person.face.shape"]);
  });

  it("output toggle on a facial attribute; category reset clears only that area and can be undone", async () => {
    const { user, go, store } = await open();
    await go("입술");
    await user.click(chip("person.lips.natural_color", "장밋빛"));
    await user.click(within(field("person.lips.natural_color")).getByRole("switch", { name: /프롬프트에 포함/ }));
    expect(prompt()).not.toContain("rose");
    await go("코");
    await user.click(chip("person.nose.tip_shape", "둥근"));
    await go("입술");
    await user.click(screen.getByTestId("category-reset"));
    const dialog = screen.getByTestId("category-reset-dialog");
    expect(within(dialog).getByText("자연 입술 색상").parentElement).toHaveTextContent("프롬프트 제외");
    await user.click(within(dialog).getByRole("button", { name: "1개 값 초기화" }));
    expect(Object.keys(saved(store))).toEqual(["person.nose.tip_shape"]);
    await user.click(screen.getByRole("button", { name: "카테고리 초기화 되돌리기" }));
    expect(saved(store)["person.lips.natural_color"]).toEqual({ value: { kind: "single", optionId: "rose" }, source: "user", excludedFromPrompt: true });
  });
});
