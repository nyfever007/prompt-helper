// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { PrompterApp } from "@/components/PrompterApp";
import { createMemoryStore, getCoreRegistry, WORKSPACE_STORAGE_KEY } from "@/domain";

afterEach(() => cleanup());

/** Sprint 2-D.3 — Figure Builder (body + wardrobe pages), hair in the Face Builder, list thumbnails. */
const core = getCoreRegistry();
const field = (id: string) => document.querySelector<HTMLElement>(`[data-attribute-id="${id}"]`)!;
const prompt = () => screen.queryByTestId("prompt-output")?.textContent ?? "";
const figure = () => within(screen.getByTestId("figure-builder")).getByRole("img", { name: /^전신 스케치/ });
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

describe("Figure Builder", () => {
  it("draws body proportions live on a neutral mannequin; only the slider's own value is stored", async () => {
    const { store } = await open("전체 신체");
    expect(figure()).toHaveAccessibleName("전신 스케치 — 설정 0개 반영");
    expect(within(screen.getByTestId("figure-builder")).getByText(/저장되지 않고 프롬프트에도 추가되지 않습니다/)).toBeInTheDocument();
    const before = figure().innerHTML;
    const preview = screen.getByTestId("slider-preview-person.body.height");
    const previewBefore = preview.innerHTML;
    expect(saved(store)).toEqual({});
    fireEvent.change(within(field("person.body.height")).getByRole("slider"), { target: { value: "5" } });
    expect(figure().innerHTML).not.toBe(before);
    expect(screen.getByTestId("slider-preview-person.body.height").innerHTML).not.toBe(previewBefore);
    expect(Object.keys(saved(store))).toEqual(["person.body.height"]);
    expect(prompt()).toBe("Height: very tall.");
  });

  it("garment lists show thumbnails for drawn types; the chosen garment is drawn; undrawable traits are listed", async () => {
    const { user } = await open("상의");
    const f = field("person.clothing.tops.type");
    const row = f.querySelector<HTMLElement>('[data-option-id="hoodie"]')!;
    expect(row.querySelector("img.list-thumb")).toHaveAttribute("src", "/visual/person/top-type/hoodie.svg");
    expect(row.querySelector("img.list-thumb")).toHaveAttribute("alt", ""); // decorative: the label names it
    const before = figure().innerHTML;
    await user.click(within(f).getByRole("radio", { name: /^후드티/ }));
    expect(figure().innerHTML).not.toBe(before);
    expect(figure()).toHaveAccessibleName("전신 스케치 — 설정 1개 반영");
    await user.click(within(field("person.clothing.tops.material")).getByRole("radio", { name: /^면/ }));
    expect(screen.getByTestId("figure-builder-not-drawn")).toHaveTextContent("상의 소재");
  });

  it("hair is drawn on the Face Builder's reference face", async () => {
    const { user } = await open("헤어");
    const face = () => within(screen.getByTestId("face-builder")).getByRole("img", { name: /^정면 스케치/ });
    const before = face().innerHTML;
    await user.click(within(field("person.hair.length")).getByRole("radio", { name: /^가슴 길이/ }));
    expect(face().innerHTML).not.toBe(before);
    expect(face()).toHaveAccessibleName("정면 스케치 — 설정 1개 반영");
  });
});
