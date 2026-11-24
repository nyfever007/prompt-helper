// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { PrompterApp } from "@/components/PrompterApp";
import { createMemoryStore, getCoreRegistry, WORKSPACE_STORAGE_KEY, type KeyValueStore } from "@/domain";

afterEach(() => cleanup());

const core = getCoreRegistry();
const P = "person.identity.";
const prompt = () => screen.queryByTestId("prompt-output")?.textContent ?? "";
const field = (id: string) => document.querySelector<HTMLElement>(`[data-attribute-id="${P}${id}"]`)!;
const nav = () => screen.getByRole("navigation", { name: "카테고리" });
const saved = (store: KeyValueStore) => JSON.parse(store.getItem(WORKSPACE_STORAGE_KEY) ?? "{}").spec?.selections ?? {};

const open = async (store: KeyValueStore = createMemoryStore()) => {
  const user = userEvent.setup();
  render(<PrompterApp registry={core} store={store} />);
  await waitFor(() => expect(screen.getByTestId("storage-status").textContent).not.toMatch(/불러오는 중/));
  await user.click(screen.getByRole("tab", { name: /Detailed/ }));
  const go = async (label: string) => user.click(within(nav()).getByRole("button", { name: label }));
  return { user, store, go };
};

describe("Identity navigation and editing (real core catalog)", () => {
  it("shows Identity with its 6 subcategories as editable; every person area is approved since 2-B.6 (pose included)", async () => {
    const { go } = await open();
    await go("인물 기본 정보");
    expect(screen.queryByTestId("draft-placeholder")).toBeNull();
    for (const sub of ["존재", "연령", "성별", "배경", "사회", "기타"]) expect(within(nav()).getByRole("button", { name: sub })).toBeInTheDocument();
    await go("자세 및 행동"); // approved in 2-B.6 (the draft placeholder is still covered on the fixture catalog: component/detailed)
    expect(screen.queryByTestId("draft-placeholder")).toBeNull();
  });

  it("hierarchical, typical-first species list; selection writes only the species", async () => {
    const { user, go, store } = await open();
    await go("존재");
    await user.click(within(field("entity_type")).getByRole("radio", { name: /^안드로이드/ }));
    // atypical options are listed (not hidden) under a separate heading
    expect(screen.getByTestId(`atypical-${P}species`)).toBeInTheDocument();
    const search = within(field("species")).getByRole("searchbox");
    await user.type(search, "고양이");
    expect(within(field("species")).getByRole("radio", { name: /수인족 › 고양이 수인/ })).toBeInTheDocument();
    await user.clear(search);
    await user.type(search, "엘프");
    await user.click(within(field("species")).getByRole("radio", { name: /^엘프/ }));
    expect(prompt()).toContain("Type of being: android. Species: elf.");
    expect(Object.keys(saved(store)).sort()).toEqual([P + "entity_type", P + "species"]);
    expect(within(field("species")).getByText(/일반적이지 않은 조합/)).toBeInTheDocument(); // non-blocking notice
  });

  it("covers: entity type stated by the species is output once, with an explanation", async () => {
    const { user, go } = await open();
    await go("존재");
    await user.click(within(field("entity_type")).getByRole("radio", { name: /^판타지 인간형 존재/ }));
    await user.type(within(field("species")).getByRole("searchbox"), "elf");
    await user.click(within(field("species")).getByRole("radio", { name: /^엘프/ }));
    expect(prompt()).toBe("Species: elf.");
    expect(screen.getByTestId(`covered-${P}entity_type`)).toHaveTextContent("종족");
  });
});

describe("large lists keep the selection visible", () => {
  it("multiple countries/regions: selected summary stays visible while filtering and can deselect", async () => {
    const { user, go, store } = await open();
    await go("배경");
    const nat = field("nationality");
    await user.type(within(nat).getByRole("searchbox"), "한국");
    await user.click(within(nat).getByRole("checkbox", { name: /^대한민국/ }));
    await user.clear(within(nat).getByRole("searchbox"));
    await user.type(within(nat).getByRole("searchbox"), "Japan");
    await user.click(within(nat).getByRole("checkbox", { name: /^일본/ }));
    await user.clear(within(nat).getByRole("searchbox"));
    await user.type(within(nat).getByRole("searchbox"), "무국적");
    await user.click(within(nat).getByRole("checkbox", { name: /^무국적/ }));
    expect(screen.getByTestId(`selected-${P}nationality`)).toHaveTextContent(/일본.*대한민국.*무국적/);
    expect(within(nat).getByText(/‘무국적’과 특정 국가·지역이 함께 선택/)).toBeInTheDocument(); // R2 warning
    await user.click(within(nat).getByRole("button", { name: "무국적 선택 해제" }));
    expect(saved(store)[P + "nationality"].value).toEqual({ kind: "multi", optionIds: ["kr", "jp"] });
    expect(prompt()).toBe("Nationality (country or region): Japanese, South Korean.");
  });
});

describe("custom values (D4)", () => {
  it("adds a custom occupation with independent name and expression; edits keep them separate; nothing is merged", async () => {
    const { user, go, store } = await open();
    await go("사회");
    await user.click(within(field("occupation")).getByRole("checkbox", { name: /^요리사/ }));
    await user.click(within(field("occupation")).getByRole("button", { name: /사용자 정의 값 추가/ }));
    const form = within(field("occupation")).getByRole("form");
    await user.type(within(form).getByRole("textbox", { name: /이름/ }), "비행선 항해사");
    await user.type(within(form).getByRole("textbox", { name: /프롬프트 표현/ }), "airship navigator");
    await user.click(within(form).getByRole("button", { name: "추가" }));
    expect(prompt()).toBe("Occupation: chef, airship navigator.");
    expect(saved(store)[P + "occupation"].value).toEqual({ kind: "multi", optionIds: ["chef"], custom: [{ label: "비행선 항해사", expression: "airship navigator" }] });

    // renaming does not touch the expression (and vice versa)
    const entry = screen.getByTestId(`custom-entry-${P}occupation-0`);
    const name = within(entry).getByRole("textbox", { name: /이름/ });
    await user.clear(name);
    await user.type(name, "항해사");
    expect(saved(store)[P + "occupation"].value.custom).toEqual([{ label: "항해사", expression: "airship navigator" }]);
    expect(prompt()).toBe("Occupation: chef, airship navigator.");

    // a name equal to a registered option only gets a notice
    await user.click(within(field("occupation")).getByRole("button", { name: /사용자 정의 값 추가/ }));
    const form2 = within(field("occupation")).getByRole("form");
    await user.type(within(form2).getByRole("textbox", { name: /이름/ }), "Chef");
    expect(within(form2).getByTestId("custom-similar")).toHaveTextContent("요리사");
    await user.click(within(form2).getByRole("button", { name: "추가" }));
    expect(saved(store)[P + "occupation"].value).toEqual({ kind: "multi", optionIds: ["chef"], custom: [{ label: "항해사", expression: "airship navigator" }, { label: "Chef" }] });

    // toggling a registered option keeps custom entries
    await user.click(within(field("occupation")).getByRole("checkbox", { name: /^요리사/ }));
    expect(saved(store)[P + "occupation"].value).toEqual({ kind: "multi", optionIds: [], custom: [{ label: "항해사", expression: "airship navigator" }, { label: "Chef" }] });
  });

  it("“add as custom” from search; a Direct name-only value shows a notice and is output verbatim", async () => {
    const { user, go } = await open();
    await go("존재");
    await user.type(within(field("species")).getByRole("searchbox"), "루미아족");
    await user.click(within(field("species")).getByRole("button", { name: /‘루미아족’을\(를\) 사용자 정의 값으로 추가/ }));
    const form = within(field("species")).getByRole("form");
    expect(within(form).getByRole("textbox", { name: /이름/ })).toHaveValue("루미아족");
    await user.click(within(form).getByRole("button", { name: "추가" }));
    expect(prompt()).toBe("Species: 루미아족.");
    expect(within(field("species")).getByText(/이름만 입력된 사용자 정의 값/)).toBeInTheDocument();
  });
});

describe("quantity age input (D5)", () => {
  it("number or complete range with unit; partial/invalid input is never stored", async () => {
    const { user, go, store } = await open();
    await go("연령");
    const f = field("age");
    await user.click(within(f).getByRole("radio", { name: "범위" }));
    await user.type(within(f).getByRole("spinbutton", { name: /실제 연령 최솟값/ }), "28");
    expect(saved(store)[P + "age"]).toBeUndefined();
    expect(screen.getByTestId(`range-hint-${P}age`)).toBeInTheDocument();
    await user.type(within(f).getByRole("spinbutton", { name: /실제 연령 최댓값/ }), "32");
    expect(saved(store)[P + "age"].value).toEqual({ kind: "range", min: 28, max: 32, unit: "years" });
    expect(prompt()).toBe("Actual age: 28–32 years old.");
    await user.selectOptions(within(f).getByRole("combobox", { name: /실제 연령 단위/ }), "months");
    expect(saved(store)[P + "age"].value).toEqual({ kind: "range", min: 28, max: 32, unit: "months" });

    const ap = field("apparent_age");
    await user.type(within(ap).getByRole("spinbutton", { name: "외형적 연령" }), "30.5");
    expect(within(ap).getByRole("alert")).toBeInTheDocument();
    // live editing stores each complete valid value ("3", "30"); the invalid fraction is never stored
    expect(saved(store)[P + "apparent_age"].value).toEqual({ kind: "number", value: 30, unit: "years" });
  });

  it("gender wording follows the age assessment and explains it; the stored choice stays “woman”", async () => {
    const { user, go, store } = await open();
    await go("성별");
    await user.click(within(field("gender")).getByRole("radio", { name: "여성" }));
    expect(prompt()).toBe("Gender: female character.");
    expect(screen.getByTestId(`variant-${P}gender`)).toHaveTextContent("알 수 없음");
    await go("연령");
    await user.type(within(field("age")).getByRole("spinbutton", { name: "실제 연령" }), "28");
    expect(prompt()).toBe("Actual age: 28 years old. Gender: woman.");
    expect(saved(store)[P + "gender"].value).toEqual({ kind: "single", optionId: "woman" });
  });
});

describe("prompt inclusion toggle (D3)", () => {
  it("excludes from the prompt, keeps the value, persists across reload", async () => {
    const store = createMemoryStore();
    const first = await open(store);
    await first.go("사회");
    await first.user.click(within(field("social_status")).getByRole("radio", { name: /^귀족/ }));
    expect(prompt()).toBe("Social status: nobility.");
    await first.user.click(within(field("social_status")).getByRole("switch", { name: /프롬프트에 포함/ }));
    expect(screen.getByTestId(`state-${P}social_status`)).toHaveTextContent("설정됨 · 프롬프트 제외");
    expect(screen.queryByTestId("prompt-output")?.textContent).not.toContain("nobility");
    expect(saved(store)[P + "social_status"]).toEqual({ value: { kind: "single", optionId: "nobility" }, source: "user", excludedFromPrompt: true });
    cleanup();
    const second = await open(store);
    await second.go("사회");
    expect(screen.getByTestId(`state-${P}social_status`)).toHaveTextContent("프롬프트 제외");
    expect(within(field("social_status")).getByRole("switch")).not.toBeChecked();
  });
});

describe("category reset (N5)", () => {
  it("resets ALL stored identity values even while a list is filtered, lists states, and can be undone", async () => {
    const { user, go, store } = await open();
    await go("공통");
    await go("조명");
    await user.click(screen.getByRole("radio", { name: "골든아워" }));
    await go("사회");
    await user.click(within(field("occupation")).getByRole("checkbox", { name: /^요리사/ }));
    await user.click(within(field("occupation")).getByRole("switch", { name: /프롬프트에 포함/ }));
    await go("연령");
    await user.type(within(field("age")).getByRole("spinbutton", { name: "실제 연령" }), "40");
    await go("사회");
    // filter the occupation list so the selected option is the only visible one
    await user.type(within(field("occupation")).getByRole("searchbox"), "요리");
    await go("인물 기본 정보");
    await user.type(within(nav()).getByRole("searchbox"), "국적"); // catalog search active too
    await user.click(screen.getByTestId("category-reset"));
    const dialog = screen.getByTestId("category-reset-dialog");
    expect(within(dialog).getByText(/2개를 모두 지웁니다/)).toBeInTheDocument();
    expect(within(dialog).getByText("직업").parentElement).toHaveTextContent("프롬프트 제외");
    await user.click(within(dialog).getByRole("button", { name: "2개 값 초기화" }));
    expect(Object.keys(saved(store))).toEqual(["lighting.preset"]);
    expect(screen.getByTestId("category-reset-bar")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "카테고리 초기화 되돌리기" }));
    expect(Object.keys(saved(store)).sort()).toEqual(["lighting.preset", P + "age", P + "occupation"]);
    expect(saved(store)[P + "occupation"].excludedFromPrompt).toBe(true);
    expect(screen.getByTestId("category-restore-notice")).toHaveTextContent("2개를 복원");
  });

  it("cancel leaves everything untouched; an empty category cannot be reset", async () => {
    const { user, go, store } = await open();
    await go("인물 기본 정보");
    expect(screen.getByTestId("category-reset")).toBeDisabled();
    await go("기타");
    await user.type(within(field("description")).getByRole("textbox"), "keeper of the old library");
    await go("인물 기본 정보");
    await user.click(screen.getByTestId("category-reset"));
    await user.click(within(screen.getByTestId("category-reset-dialog")).getByRole("button", { name: "취소" }));
    expect(saved(store)[P + "description"].value.text).toBe("keeper of the old library");
  });
});
