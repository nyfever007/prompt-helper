// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PrompterApp } from "@/components/PrompterApp";
import { createMemoryStore, getCoreRegistry, USER_PRESETS_STORAGE_KEY, WORKSPACE_STORAGE_KEY } from "@/domain";

afterEach(() => cleanup());

/** Sprint 3.3 — My Presets: save (all / category / attributes), apply through the preset dialog, manage, export/import. */
const core = getCoreRegistry();
const field = (id: string) => document.querySelector<HTMLElement>(`[data-attribute-id="${id}"]`)!;
const saved = (store: ReturnType<typeof createMemoryStore>) => JSON.parse(store.getItem(WORKSPACE_STORAGE_KEY) ?? "{}").spec?.selections ?? {};
const library = (store: ReturnType<typeof createMemoryStore>) => JSON.parse(store.getItem(USER_PRESETS_STORAGE_KEY) ?? '{"presets":[]}').presets as Array<{ id: string; name: string; favorite?: boolean; patches: Array<{ attributeId: string; locked?: true }> }>;
const tab = (name: RegExp) => screen.getByRole("tab", { name });
const card = (name: string) => [...document.querySelectorAll<HTMLElement>("[data-user-preset]")].find((el) => el.querySelector("h3")?.textContent?.startsWith(name))!;

const setUp = async (store = createMemoryStore()) => {
  const user = userEvent.setup();
  render(<PrompterApp registry={core} store={store} />);
  await waitFor(() => expect(screen.getByTestId("storage-status").textContent).not.toMatch(/불러오는 중/));
  return { user, store };
};

/** Basic: person, watercolor; Detailed hair: custom color, locked. */
const design = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(within(field("subject.kind")).getByRole("radio", { name: "인물 (1인)" }));
  await user.click(within(field("style.preset")).getByRole("radio", { name: "수채화" }));
  await user.click(tab(/Detailed/));
  await user.click(within(screen.getByRole("navigation", { name: "카테고리" })).getByRole("treeitem", { name: "헤어" }));
  await user.click(screen.getByTestId("custom-color-open-person.hair.primary_color"));
  const hex = screen.getByTestId("custom-color-hex-person.hair.primary_color");
  await user.clear(hex);
  await user.type(hex, "#3A7BD5");
  await user.click(screen.getByTestId("lock-person.hair.primary_color"));
};

const saveAll = async (user: ReturnType<typeof userEvent.setup>, name: string) => {
  await user.click(tab(/Recommended/));
  await user.click(screen.getByTestId("preset-save-current"));
  const dialog = screen.getByTestId("save-preset-dialog");
  await user.type(within(dialog).getByTestId("preset-name"), name);
  await user.click(within(dialog).getByTestId("preset-save"));
};

describe("My Presets", () => {
  it("saves the whole design (custom color and lock kept), shows a card, applies it back keeping the user's own value; saved locks on request; undo", async () => {
    const { user, store } = await setUp();
    await design(user);
    await saveAll(user, "Blue watercolor");
    const lib = library(store);
    expect(lib).toHaveLength(1);
    expect(lib[0]!.patches.map((p) => p.attributeId).sort()).toEqual(["person.hair.primary_color", "style.preset", "subject.kind"]);
    expect(lib[0]!.patches.find((p) => p.attributeId === "person.hair.primary_color")!.locked).toBe(true);
    const c = card("Blue watercolor");
    expect(c).toHaveTextContent("속성 3개");
    expect(c).toHaveTextContent("잠금 1개");
    expect(c).toHaveTextContent("내 프리셋");
    expect(document.querySelector('[data-preset-id] .badge--system')).toHaveTextContent("시스템");

    // change the design: unlock everything, clear the hair color, choose another style
    await user.click(screen.getByTestId("unlock-all"));
    await user.click(tab(/Basic/));
    await user.click(within(field("style.preset")).getByRole("radio", { name: "유화" }));
    await user.click(tab(/Detailed/));
    await user.click(within(screen.getByRole("navigation", { name: "카테고리" })).getByRole("treeitem", { name: "헤어" }));
    await user.click(within(field("person.hair.primary_color")).getByRole("button", { name: "선택 해제: 기본 헤어 색상" }));

    await user.click(tab(/Recommended/));
    await user.click(within(card("Blue watercolor")).getByRole("button", { name: "“Blue watercolor” 변경 내용 확인 후 적용" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByTestId("kept-by-default")).toBeInTheDocument(); // the user's style is kept by default
    await user.click(within(dialog).getByTestId("preset-apply-locks").querySelector("input")!);
    await user.click(within(dialog).getAllByRole("button", { name: /적용/ })[0]!);
    const s = saved(store);
    expect(s["style.preset"]).toMatchObject({ source: "user", value: { optionId: "oil_painting" } });
    expect(s["person.hair.primary_color"]).toMatchObject({ source: "preset", origin: { presetId: lib[0]!.id }, locked: true, value: { custom: { color: "#3A7BD5" } } });
    expect(screen.getByTestId("user-preset-bar")).toHaveTextContent("Blue watercolor");
    // provenance shows the preset's name in the field
    await user.click(tab(/Detailed/));
    await user.click(within(screen.getByRole("navigation", { name: "카테고리" })).getByRole("treeitem", { name: "헤어" }));
    expect(field("person.hair.primary_color")).toHaveTextContent("프리셋에서 설정됨: Blue watercolor");

    await user.click(tab(/Recommended/));
    await user.click(within(screen.getByTestId("user-preset-bar")).getByRole("button", { name: "되돌리기" }));
    expect(saved(store)["person.hair.primary_color"]).toBeUndefined();
  });

  it("saves only chosen categories or attributes from Precision; two presets combine; Precision shows “My preset” as the source", async () => {
    const { user, store } = await setUp();
    await design(user);
    await user.click(tab(/Precision/));
    await user.type(screen.getByTestId("precision-search"), "watercolor");
    await user.click(screen.getByTestId("precision-save-preset"));
    let dialog = screen.getByTestId("save-preset-dialog");
    expect(within(dialog).getByTestId("preset-selected-count")).toHaveTextContent("1개 선택");
    await user.type(within(dialog).getByTestId("preset-name"), "Style only");
    await user.click(within(dialog).getByTestId("preset-save"));
    expect(library(store)[0]!.patches.map((p) => p.attributeId)).toEqual(["style.preset"]);

    // a second preset: everything but the style (one attribute unticked)
    await user.clear(screen.getByTestId("precision-search"));
    await user.click(screen.getByTestId("precision-save-preset"));
    dialog = screen.getByTestId("save-preset-dialog");
    await user.click(within(dialog).getByText((_, el) => el?.getAttribute("data-preset-attr") === "style.preset"));
    await user.type(within(dialog).getByTestId("preset-name"), "Hair");
    await user.click(within(dialog).getByTestId("preset-save"));
    expect(library(store)[0]!.patches.map((p) => p.attributeId).sort()).toEqual(["person.hair.primary_color", "subject.kind"]);

    // apply both to an empty design, one after another
    await user.click(screen.getByTestId("unlock-all"));
    vi.spyOn(window, "confirm").mockReturnValue(true);
    await user.click(screen.getByRole("button", { name: "설정 초기화" }));
    expect(saved(store)).toEqual({});
    await user.click(tab(/Recommended/));
    for (const name of ["Style only", "Hair"]) {
      await user.click(within(card(name)).getByRole("button", { name: `“${name}” 변경 내용 확인 후 적용` }));
      await user.click(within(screen.getByRole("dialog")).getAllByRole("button", { name: /적용/ })[0]!);
    }
    expect(Object.keys(saved(store)).sort()).toEqual(["person.hair.primary_color", "style.preset", "subject.kind"]);
    await user.click(tab(/Precision/));
    await user.selectOptions(screen.getByTestId("precision-source"), "mine");
    expect(document.querySelectorAll("[data-attribute-row]").length).toBe(3);
    expect(document.querySelector('[data-attribute-row="style.preset"]')).toHaveTextContent("내 프리셋");
  });

  it("rename, duplicate, favorite (first, filter), search, delete; export and import (new ids); kept after reload", async () => {
    const store = createMemoryStore();
    const { user } = await setUp(store);
    await user.click(within(field("style.preset")).getByRole("radio", { name: "수채화" }));
    await saveAll(user, "Alpha");
    await user.click(screen.getByTestId("preset-save-current"));
    await user.type(within(screen.getByTestId("save-preset-dialog")).getByTestId("preset-name"), "Beta");
    await user.click(within(screen.getByTestId("save-preset-dialog")).getByTestId("preset-save"));

    await user.click(within(card("Alpha")).getByRole("button", { name: "이름 변경: Alpha" }));
    const dialog = screen.getByTestId("save-preset-dialog");
    await user.clear(within(dialog).getByTestId("preset-name"));
    await user.type(within(dialog).getByTestId("preset-name"), "Alpha 2");
    await user.type(within(dialog).getByTestId("preset-description"), "renamed");
    await user.click(within(dialog).getByTestId("preset-save"));
    expect(card("Alpha 2")).toHaveTextContent("renamed");

    await user.click(within(card("Alpha 2")).getByRole("button", { name: "복제: Alpha 2" }));
    expect(card("Alpha 2 (사본)")).toBeDefined();
    await user.click(within(card("Alpha 2 (사본)")).getByRole("button", { name: "즐겨찾기: Alpha 2 (사본)" }));
    expect(document.querySelector("[data-user-preset] h3")).toHaveTextContent("Alpha 2 (사본)"); // favorites first
    await user.click(screen.getByTestId("preset-favorites-only"));
    expect(document.querySelectorAll("[data-user-preset]").length).toBe(1);
    await user.click(screen.getByTestId("preset-favorites-only"));
    await user.type(screen.getByTestId("preset-search"), "beta");
    expect(document.querySelectorAll("[data-user-preset]").length).toBe(1);
    await user.clear(screen.getByTestId("preset-search"));

    vi.spyOn(window, "confirm").mockReturnValue(true);
    await user.click(within(card("Beta")).getByRole("button", { name: "삭제: Beta" }));
    expect(library(store).map((p) => p.name).sort()).toEqual(["Alpha 2", "Alpha 2 (사본)"]);

    // import the current library file → two more presets with new ids
    const text = store.getItem(USER_PRESETS_STORAGE_KEY)!;
    await user.upload(screen.getByTestId("preset-import-input"), new File([text], "presets.json", { type: "application/json" }));
    await waitFor(() => expect(library(store)).toHaveLength(4));
    expect(new Set(library(store).map((p) => p.id)).size).toBe(4);
    expect(screen.getByText(/프리셋 2개를 가져왔습니다/)).toBeInTheDocument();
    await user.upload(screen.getByTestId("preset-import-input"), new File(["{}"], "x.json", { type: "application/json" }));
    await waitFor(() => expect(screen.getByText(/올바른 프리셋이 아닌 항목 1개/)).toBeInTheDocument());

    cleanup();
    await setUp(store);
    await userEvent.setup().click(tab(/Recommended/));
    expect(document.querySelectorAll("[data-user-preset]").length).toBe(4);
  });
});
