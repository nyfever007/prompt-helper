// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
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

describe("skin, hair and facial hair in the Detailed editor", () => {
  it("the three areas are editable with 16 / 23 / 6 attributes", async () => {
    const { go } = await open();
    for (const [label, n] of [["피부", 16], ["헤어", 23], ["수염", 6]] as const) {
      await go(label);
      expect(screen.queryByTestId("draft-placeholder"), label).toBeNull();
      expect(document.querySelectorAll(".cat-panel .attribute-list > [data-attribute-id]"), label).toHaveLength(n);
    }
  });

  it("palette display groups (natural / fantasy skin tones; hair color families) — groups are never output", async () => {
    const { user, go } = await open();
    await go("피부");
    const groups = [...field("person.skin.tone").querySelectorAll(".swatch-group__title")].map((g) => g.textContent);
    expect(groups).toEqual(["자연색", "판타지"]);
    await user.click(chip("person.skin.tone", "밝은 베이지"));
    expect(prompt()).toBe("Skin tone: light beige.");
    await go("헤어");
    expect([...field("person.hair.primary_color").querySelectorAll(".swatch-group__title")].map((g) => g.textContent)).toEqual(["검정 계열", "갈색 계열", "금발 계열", "적색 계열", "회색 계열", "판타지 계열"]);
  });

  it("bald keeps hair values but stops outputting them (with a notice); choosing hair again restores them", async () => {
    const { user, go, store } = await open();
    await go("헤어");
    await user.click(chip("person.hair.texture", "웨이브"));
    await user.type(within(field("person.hair.style")).getByRole("searchbox"), "반묶음 번");
    await user.click(within(field("person.hair.style")).getByRole("radio", { name: /^반묶음 번/ }));
    expect(prompt()).toBe("Hair texture: wavy. Hairstyle: half-up bun.");
    await user.click(chip("person.hair.presence", "대머리"));
    expect(prompt()).toBe("Hair presence: bald head.");
    expect(within(field("person.hair.style")).getByText(/현재 선택에는 적용되지 않습니다/)).toBeInTheDocument();
    expect(saved(store)["person.hair.style"].value).toEqual({ kind: "single", optionId: "half_up_bun" });
    await user.click(chip("person.hair.presence", "모발 있음"));
    expect(prompt()).toBe("Hair presence: hair present. Hair texture: wavy. Hairstyle: half-up bun.");
  });

  it("explicit “none” is a choice distinct from unset: no bangs hides bangs length; clean-shaven hides beard details", async () => {
    const { user, go } = await open();
    await go("헤어");
    await user.click(chip("person.hair.bangs_length", "눈썹 길이"));
    expect(prompt()).toBe("Bangs length: eyebrow-length.");
    await user.click(chip("person.hair.bangs_style", "앞머리 없음"));
    expect(prompt()).toBe("Bangs: none.");
    await go("수염");
    await user.click(chip("person.facial_hair.grooming", "깔끔하게 다듬은"));
    await user.click(within(field("person.facial_hair.style")).getByRole("checkbox", { name: /^수염 없음/ }));
    expect(prompt()).toBe("Bangs: none. Facial hair: clean-shaven.");
    await user.click(within(field("person.facial_hair.style")).getByRole("checkbox", { name: /^콧수염/ }));
    expect(within(field("person.facial_hair.style")).getByText(/‘없음’\(수염 없음\)이 다른 항목과 함께/)).toBeInTheDocument();
  });
});
