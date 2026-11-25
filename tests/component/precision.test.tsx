// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PrompterApp } from "@/components/PrompterApp";
import { createMemoryStore, getCoreRegistry, LOCKS_STORAGE_KEY, WORKSPACE_STORAGE_KEY } from "@/domain";

afterEach(() => cleanup());

/** Sprint 3.1 — locks in every mode and the Precision tab, over the one shared ImageSpec. */
const core = getCoreRegistry();
const field = (id: string) => document.querySelector<HTMLElement>(`[data-attribute-id="${id}"]`)!;
const row = (id: string) => document.querySelector<HTMLElement>(`[data-attribute-row="${id}"]`);
const saved = (store: ReturnType<typeof createMemoryStore>) => JSON.parse(store.getItem(WORKSPACE_STORAGE_KEY) ?? "{}").spec?.selections ?? {};
const tab = (name: RegExp) => screen.getByRole("tab", { name });

const setUp = async (store = createMemoryStore()) => {
  const user = userEvent.setup();
  render(<PrompterApp registry={core} store={store} />);
  await waitFor(() => expect(screen.getByTestId("storage-status").textContent).not.toMatch(/불러오는 중/));
  return { user, store };
};

describe("locks", () => {
  it("a locked field cannot be edited or cleared until unlocked; prompt inclusion stays independent; the lock shows in every mode", async () => {
    const { user, store } = await setUp();
    await user.click(within(field("style.preset")).getByRole("radio", { name: "수채화" }));
    await user.click(screen.getByTestId("lock-style.preset"));
    expect(screen.getByTestId("lock-style.preset")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("locked-note-style.preset")).toBeInTheDocument();
    expect(within(field("style.preset")).getByRole("radio", { name: "유화" })).toBeDisabled();
    expect(within(field("style.preset")).getByRole("button", { name: /선택 해제/ })).toBeDisabled();
    expect(screen.getByTestId("lock-status")).toHaveTextContent("잠긴 속성 1개");

    // the same lock in Detailed and Precision
    await user.click(tab(/Detailed/));
    await user.click(screen.getByRole("treeitem", { name: "스타일" }));
    expect(screen.getByTestId("lock-style.preset")).toHaveAttribute("aria-pressed", "true");
    await user.click(tab(/Precision/));
    expect(screen.getByTestId("precision-lock-style.preset")).toHaveAttribute("aria-pressed", "true");

    // random regeneration keeps it
    await user.click(tab(/Random/));
    expect(screen.getByTestId("random-locks")).toHaveTextContent("잠긴 값 1개");
    await user.click(screen.getByTestId("random-generate"));
    expect(saved(store)["style.preset"]).toMatchObject({ source: "user", value: { optionId: "watercolor" } });

    // unlock all → editable again
    await user.click(screen.getByTestId("unlock-all"));
    expect(screen.queryByTestId("lock-status")).toBeNull();
    await user.click(tab(/Basic/));
    expect(within(field("style.preset")).getByRole("radio", { name: "유화" })).toBeEnabled();
  });

  it("a random value can be locked without editing it; a full reset keeps it; the lock survives a reload", async () => {
    const store = createMemoryStore();
    const first = await setUp(store);
    await first.user.click(tab(/Random/));
    await first.user.click(screen.getByTestId("random-generate"));
    const before = saved(store)["person.identity.species"];
    expect(before.origin.presetId).toBe("random_composer");
    // the five basics fold away after a result: open them
    await first.user.click(screen.getByText("기본 선택 다섯 가지 (모두 선택 사항)"));
    await first.user.click(screen.getByTestId("lock-person.identity.species"));
    vi.spyOn(window, "confirm").mockReturnValue(true);
    await first.user.click(screen.getByRole("button", { name: "설정 초기화" }));
    expect(Object.keys(saved(store))).toEqual(["person.identity.species"]);
    expect(saved(store)["person.identity.species"]).toEqual(before);
    expect(JSON.parse(store.getItem(LOCKS_STORAGE_KEY)!).attributeIds).toEqual(["person.identity.species"]);

    cleanup();
    await setUp(store);
    expect(screen.getByTestId("lock-status")).toHaveTextContent("잠긴 속성 1개");
  });

  it("a recommended concept never replaces a locked value, even with “replace my values”", async () => {
    const { user, store } = await setUp();
    await user.click(within(field("output.aspect_ratio")).getByRole("radio", { name: /정사각 1:1/ }));
    await user.click(screen.getByTestId("lock-output.aspect_ratio"));
    await user.click(tab(/Recommended/));
    await user.click(screen.getAllByRole("button", { name: /변경 내용 확인 후 적용/ })[4]!); // Cyberpunk sets 16:9
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByTestId("preset-locked")).toHaveTextContent("잠김 — 유지");
    expect(within(dialog).getByTestId("preset-locked-note")).toBeInTheDocument();
    await user.click(within(dialog).getAllByRole("button", { name: /적용/ })[0]!);
    expect(saved(store)["output.aspect_ratio"]).toMatchObject({ source: "user", value: { optionId: "square" } });
  });

  it("category lock in Detailed; a category reset keeps the locked values", async () => {
    const { user, store } = await setUp();
    await user.click(tab(/Detailed/));
    await user.click(screen.getByRole("treeitem", { name: "프레이밍 및 시점" }));
    await user.click(within(field("camera.angle")).getByRole("radio", { name: "로우 앵글 (올려다봄)" }));
    await user.click(within(field("composition.view_direction")).getAllByRole("radio")[0]!);
    await user.click(screen.getByTestId("category-lock"));
    expect(screen.getByTestId("category-locked-count")).toHaveTextContent("2개 잠김");
    expect(screen.getByTestId("category-reset")).toBeDisabled();
    await user.click(screen.getByTestId("category-unlock"));
    await user.click(screen.getByTestId("lock-camera.angle"));
    await user.click(screen.getByTestId("category-reset"));
    expect(screen.getByTestId("category-reset-locked")).toHaveTextContent("잠긴 1개");
    await user.click(screen.getByRole("button", { name: "1개 값 초기화" }));
    expect(Object.keys(saved(store))).toEqual(["camera.angle"]);
  });
});

describe("Precision tab", () => {
  it("lists every set attribute with category, value, source, lock and prompt state; search, filters, bulk lock, prompt toggle and go-to work", async () => {
    const { user, store } = await setUp();
    expect(tab(/Precision/).textContent).toBe("Precision"); // no longer “planned”
    await user.click(tab(/Precision/));
    expect(screen.getByTestId("precision-empty")).toBeInTheDocument();

    await user.click(tab(/Basic/));
    await user.click(within(field("style.preset")).getByRole("radio", { name: "수채화" }));
    await user.click(tab(/Random/));
    await user.click(screen.getByTestId("random-generate"));
    await user.click(tab(/Precision/));
    const total = Object.keys(saved(store)).length;
    expect(screen.getByTestId("precision-count")).toHaveTextContent(`${total}개 중 ${total}개 표시 · 잠김 0개`);
    const style = row("style.preset")!;
    expect(style).toHaveTextContent("수채화");
    expect(style).toHaveTextContent("직접 설정");
    expect(style).toHaveTextContent("스타일"); // category
    expect(row("person.identity.species")).toHaveTextContent("랜덤");

    // filters: source and search
    await user.selectOptions(screen.getByTestId("precision-source"), "user");
    expect(document.querySelectorAll("[data-attribute-row]").length).toBe(1);
    await user.selectOptions(screen.getByTestId("precision-source"), "all");
    await user.type(screen.getByTestId("precision-search"), "watercolor");
    expect([...document.querySelectorAll("[data-attribute-row]")].map((e) => e.getAttribute("data-attribute-row"))).toEqual(["style.preset"]);
    await user.clear(screen.getByTestId("precision-search"));

    // lock shown (all random) via the source filter, then the locked-only filter
    await user.selectOptions(screen.getByTestId("precision-source"), "random");
    const randomCount = document.querySelectorAll("[data-attribute-row]").length;
    await user.click(screen.getByTestId("precision-lock-shown"));
    await user.selectOptions(screen.getByTestId("precision-source"), "all");
    await user.selectOptions(screen.getByTestId("precision-lock"), "locked");
    expect(document.querySelectorAll("[data-attribute-row]").length).toBe(randomCount);
    expect(screen.getByTestId("lock-status")).toHaveTextContent(`잠긴 속성 ${randomCount}개`);
    // a regeneration now keeps every value
    const before = saved(store);
    await user.click(tab(/Random/));
    await user.click(screen.getByTestId("random-generate"));
    for (const id of Object.keys(before)) expect(saved(store)[id], id).toEqual(before[id]);

    // prompt toggle (independent of the lock) and go-to
    await user.click(tab(/Precision/));
    await user.selectOptions(screen.getByTestId("precision-lock"), "all");
    // (only attributes whose catalog offers the include switch get one; the others show their state)
    expect(within(row("style.preset")!).queryByRole("switch")).toBeNull();
    const toggle = document.querySelector<HTMLInputElement>('[data-testid^="precision-output-"]')!;
    const toggledId = toggle.dataset.testid!.replace("precision-output-", "");
    expect(screen.getByTestId(`precision-lock-${toggledId}`)).toHaveAttribute("aria-pressed", "true"); // locked random value
    await user.click(toggle);
    expect(saved(store)[toggledId].excludedFromPrompt).toBe(true);
    await user.selectOptions(screen.getByTestId("precision-output"), "excluded");
    expect([...document.querySelectorAll("[data-attribute-row]")].map((e) => e.getAttribute("data-attribute-row"))).toEqual([toggledId]);
    await user.selectOptions(screen.getByTestId("precision-output"), "all");
    await user.click(within(row("style.preset")!).getByRole("button", { name: /편집으로 이동$/ }));
    expect(tab(/Detailed/)).toHaveAttribute("aria-selected", "true");
    await waitFor(() => expect(field("style.preset")).toBeInTheDocument());
  });
});
