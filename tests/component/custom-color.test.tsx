// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { PrompterApp } from "@/components/PrompterApp";
import { createMemoryStore, getCoreRegistry, WORKSPACE_STORAGE_KEY } from "@/domain";

afterEach(() => cleanup());

/** Sprint 3.2 — user-defined colors in the shared color control (picker, HEX, RGB) across modes. */
const core = getCoreRegistry();
const ID = "person.hair.primary_color";
const field = (id: string) => document.querySelector<HTMLElement>(`[data-attribute-id="${id}"]`)!;
const saved = (store: ReturnType<typeof createMemoryStore>) => JSON.parse(store.getItem(WORKSPACE_STORAGE_KEY) ?? "{}").spec?.selections ?? {};
const prompt = () => screen.queryByTestId("prompt-output")?.textContent ?? "";
const tab = (name: RegExp) => screen.getByRole("tab", { name });

const setUp = async () => {
  const user = userEvent.setup();
  const store = createMemoryStore();
  render(<PrompterApp registry={core} store={store} />);
  await waitFor(() => expect(screen.getByTestId("storage-status").textContent).not.toMatch(/불러오는 중/));
  await user.click(within(field("subject.kind")).getByRole("radio", { name: "인물 (1인)" }));
  await user.click(tab(/Detailed/));
  await user.click(within(screen.getByRole("navigation", { name: "카테고리" })).getByRole("treeitem", { name: "헤어" }));
  return { user, store };
};

describe("custom color", () => {
  it("opening the panel stores nothing; HEX, RGB numbers, sliders and the picker stay in sync; the prompt states the exact color", async () => {
    const { user, store } = await setUp();
    await user.click(screen.getByTestId(`custom-color-open-${ID}`));
    expect(saved(store)[ID]).toBeUndefined(); // no automatic value
    await user.click(screen.getByTestId(`custom-color-hex-${ID}`));
    await user.tab(); // focusing and leaving the untouched HEX field stores nothing either
    expect(saved(store)[ID]).toBeUndefined();

    const hex = screen.getByTestId(`custom-color-hex-${ID}`);
    await user.clear(hex);
    await user.type(hex, "#3a7bd5");
    expect(saved(store)[ID]).toEqual({ value: { kind: "single", custom: { label: "#3A7BD5", color: "#3A7BD5" } }, source: "user" });
    expect(screen.getByTestId(`custom-color-r-${ID}`)).toHaveValue(58);
    expect(screen.getByTestId(`custom-color-g-${ID}`)).toHaveValue(123);
    expect(screen.getByTestId(`custom-color-b-${ID}`)).toHaveValue(213);
    expect(screen.getByTestId(`custom-color-picker-${ID}`)).toHaveValue("#3a7bd5");
    expect(prompt()).toMatch(/Primary hair color: custom color #3A7BD5 \(RGB 58, 123, 213, close to [^)]+\)\./);
    expect(screen.getByTestId(`color-current-${ID}`)).toHaveTextContent("사용자 지정 #3A7BD5");
    expect(screen.getByText(/같은 색을 재현한다는 보장은 없습니다/)).toBeInTheDocument();

    // an RGB number updates HEX and the stored value
    const r = screen.getByTestId(`custom-color-r-${ID}`);
    await user.clear(r);
    await user.type(r, "255");
    expect(screen.getByTestId(`custom-color-hex-${ID}`)).toHaveValue("#FF7BD5");
    expect(saved(store)[ID].value.custom.color).toBe("#FF7BD5");
  });

  it("an invalid HEX is explained and not stored", async () => {
    const { user, store } = await setUp();
    await user.click(screen.getByTestId(`custom-color-open-${ID}`));
    const hex = screen.getByTestId(`custom-color-hex-${ID}`);
    await user.clear(hex);
    await user.type(hex, "#12345");
    await user.tab(); // the message appears once the field is left
    expect(hex).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByTestId(`custom-color-error-${ID}`)).toHaveTextContent("#RRGGBB");
    expect(saved(store)[ID]).toBeUndefined();
  });

  it("the same color in Precision; a lock disables the panel; clearing removes the value; the palette still works", async () => {
    const { user, store } = await setUp();
    await user.click(screen.getByTestId(`custom-color-open-${ID}`));
    const hex = screen.getByTestId(`custom-color-hex-${ID}`);
    await user.clear(hex);
    await user.type(hex, "#123456");
    await user.click(tab(/Precision/));
    expect(document.querySelector(`[data-attribute-row="${ID}"]`)).toHaveTextContent("#123456");
    await user.click(screen.getByTestId(`precision-lock-${ID}`));
    await user.click(tab(/Detailed/));
    await user.click(within(screen.getByRole("navigation", { name: "카테고리" })).getByRole("treeitem", { name: "헤어" }));
    expect(screen.getByTestId(`custom-color-hex-${ID}`)).toBeDisabled();
    await user.click(screen.getByTestId(`lock-${ID}`)); // unlock
    await user.click(screen.getByTestId(`custom-color-clear-${ID}`));
    expect(saved(store)[ID]).toBeUndefined();
    // the palette is unchanged: choosing a palette color outputs its usual wording
    await user.click(within(field(ID)).getByRole("button", { name: /색상 선택$/ }));
    await user.click(within(field(ID)).getByRole("radio", { name: "칠흑색" }));
    expect(prompt()).toContain("Primary hair color: jet black.");
  });
});
