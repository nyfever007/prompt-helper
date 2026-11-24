// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { PrompterApp } from "@/components/PrompterApp";
import { CatalogRegistry, createMemoryStore, getCoreRegistry, WORKSPACE_STORAGE_KEY, type CatalogRegistry as Registry, type KeyValueStore } from "@/domain";
import { buildFixtureCatalog, getFixtureRegistry } from "@/testing/fixtureCatalog";

afterEach(() => cleanup());

/** Sprint 2-C.1 — color picker (TD-13), category tree keyboard (TD-01), dialogs (TD-02), editing flow. */
const core = getCoreRegistry();
const prompt = () => screen.queryByTestId("prompt-output")?.textContent ?? "";
const field = (id: string) => document.querySelector<HTMLElement>(`[data-attribute-id="${id}"]`)!;
const nav = () => screen.getByRole("navigation", { name: "카테고리" });
const item = (label: string) => within(nav()).getByRole("treeitem", { name: label });
const saved = (store: KeyValueStore) => JSON.parse(store.getItem(WORKSPACE_STORAGE_KEY) ?? "{}").spec?.selections ?? {};
const toggle = (id: string) => within(field(id)).getByRole("button", { name: /색상 선택$|색상 변경$|팔레트 닫기$/ });
const current = (id: string) => screen.getByTestId(`color-current-${id}`);

const open = async (registry: Registry = core, store: KeyValueStore = createMemoryStore()) => {
  const user = userEvent.setup();
  const utils = render(<PrompterApp registry={registry} store={store} />);
  await waitFor(() => expect(screen.getByTestId("storage-status").textContent).not.toMatch(/불러오는 중/));
  await user.click(screen.getByRole("tab", { name: /Detailed/ }));
  const go = async (label: string) => user.click(item(label));
  return { user, store, go, ...utils };
};

describe("color picker (TD-13): collapsed by default, palette on request", () => {
  it("shows only the current value, a toggle and per-color clear; a choice closes the palette and returns focus", async () => {
    const { user, go, store } = await open();
    await go("상의");
    const id = "person.clothing.tops.primary_color";
    expect(within(field(id)).queryAllByRole("radio")).toHaveLength(0); // 55 swatches are NOT rendered while collapsed
    expect(current(id)).toHaveTextContent("미설정");
    expect(toggle(id)).toHaveAttribute("aria-expanded", "false");
    expect(toggle(id)).toHaveAccessibleName("상의 기본 색상: 색상 선택");

    await user.click(toggle(id));
    expect(toggle(id)).toHaveAttribute("aria-expanded", "true");
    const palette = within(field(id)).getByRole("group", { name: "상의 기본 색상 팔레트" });
    expect(toggle(id)).toHaveAttribute("aria-controls", palette.id);
    expect(within(palette).getAllByRole("radio")).toHaveLength(55);
    expect(document.activeElement).toBe(within(palette).getAllByRole("radio")[0]); // focus moves into the palette

    await user.click(within(palette).getByRole("radio", { name: "네이비" }));
    expect(within(field(id)).queryAllByRole("radio")).toHaveLength(0);
    expect(document.activeElement).toBe(toggle(id));
    expect(current(id)).toHaveTextContent("네이비");
    expect(toggle(id)).toHaveTextContent("색상 변경");
    expect(saved(store)[id].value).toEqual({ kind: "single", optionId: "navy" }); // value, ID and storage unchanged
    expect(prompt()).toBe("Top primary color: navy.");

    // Reopening puts focus on the current color; clearing from the collapsed view returns to unset.
    await user.click(toggle(id));
    expect(document.activeElement).toBe(within(field(id)).getByRole("radio", { name: "네이비" }));
    await user.keyboard("{Escape}");
    await user.click(within(current(id)).getByRole("button", { name: "네이비 선택 해제" }));
    expect(current(id)).toHaveTextContent("미설정");
    expect(saved(store)[id]).toBeUndefined();
    expect(prompt()).toMatch(/아직 선택한 항목이 없습니다/);
  });

  it("Escape and the toggle close without choosing (focus back on the toggle); a click outside closes too (non-modal)", async () => {
    const { user, go, store } = await open();
    await go("헤어");
    const id = "person.hair.primary_color";
    await user.click(toggle(id));
    await user.keyboard("{Escape}");
    expect(within(field(id)).queryAllByRole("radio")).toHaveLength(0);
    expect(document.activeElement).toBe(toggle(id));
    await user.click(toggle(id));
    await user.click(toggle(id)); // “팔레트 닫기”
    expect(toggle(id)).toHaveAttribute("aria-expanded", "false");
    await user.click(toggle(id));
    await user.click(screen.getByRole("heading", { level: 2, name: "헤어" })); // outside
    expect(within(field(id)).queryAllByRole("radio")).toHaveLength(0);
    expect(saved(store)[id]).toBeUndefined();
    // Non-modal: nothing else on the page became inert while it was open.
    await user.click(toggle(id));
    expect(document.querySelector("[inert]")).toBeNull();
  });

  it("arrow keys browse inside an open single-select palette without closing it; Space chooses and closes", async () => {
    const { user, go } = await open();
    await go("눈");
    const id = "person.eyes.iris_color";
    await user.click(toggle(id));
    const radios = within(field(id)).getAllByRole("radio");
    expect(document.activeElement).toBe(radios[0]);
    await user.keyboard("{ArrowRight}");
    expect(within(field(id)).getAllByRole("radio")).toHaveLength(radios.length); // still open
    expect(document.activeElement).toBe(within(field(id)).getAllByRole("radio")[1]);
    await user.keyboard(" ");
    expect(within(field(id)).queryAllByRole("radio")).toHaveLength(0);
    expect(document.activeElement).toBe(toggle(id));
    expect(current(id).textContent).not.toMatch(/미설정/);
  });

  it("multi-select (eyeshadow) stays open while picking; each chosen color has its own clear; Done closes", async () => {
    const { user, go, store } = await open();
    await go("메이크업");
    const id = "person.makeup.eyeshadow_color";
    await user.click(toggle(id));
    const palette = within(field(id)).getByRole("group", { name: /팔레트$/ });
    await user.click(within(palette).getByRole("checkbox", { name: "더스티 로즈" }));
    await user.click(within(palette).getByRole("checkbox", { name: "골드" }));
    expect(within(field(id)).getAllByRole("checkbox").length).toBeGreaterThan(2); // still open
    await user.click(within(palette).getByRole("button", { name: "완료" }));
    expect(document.activeElement).toBe(toggle(id));
    expect(current(id)).toHaveTextContent("더스티 로즈");
    expect(current(id)).toHaveTextContent("골드");
    await user.click(within(current(id)).getByRole("button", { name: "골드 선택 해제" }));
    expect(saved(store)[id].value).toEqual({ kind: "multi", optionIds: ["dusty_rose"] });
  });

  it("a custom color is shown as the current value; values are restored from storage after reload", async () => {
    const store = createMemoryStore();
    const first = await open(core, store);
    await first.go("눈");
    const id = "person.eyes.iris_color";
    await first.user.click(within(field(id)).getByRole("button", { name: /사용자 정의 값 추가/ }));
    const form = within(field(id)).getByRole("form");
    await first.user.type(within(form).getByRole("textbox", { name: /이름/ }), "오드아이");
    await first.user.type(within(form).getByRole("textbox", { name: /프롬프트 표현/ }), "heterochromatic irises");
    await first.user.click(within(form).getByRole("button", { name: /추가/ }));
    expect(current(id)).toHaveTextContent("사용자 정의: 오드아이");
    await first.go("헤어");
    await first.user.click(toggle("person.hair.primary_color"));
    await first.user.click(within(field("person.hair.primary_color")).getByRole("radio", { name: "짙은 갈색" }));
    first.unmount();

    const second = await open(core, store);
    await second.go("눈");
    expect(current(id)).toHaveTextContent("사용자 정의: 오드아이");
    await second.go("헤어");
    expect(current("person.hair.primary_color")).toHaveTextContent("짙은 갈색");
    expect(within(field("person.hair.primary_color")).queryAllByRole("radio")).toHaveLength(0); // restored collapsed
  });

  it("a color set by a preset is shown collapsed with the preset badge (test-only preset)", async () => {
    const c = buildFixtureCatalog();
    c.presets = [
      ...(c.presets ?? []),
      {
        id: "p_amber_key",
        version: "1.0.0",
        status: "approved",
        categoryId: "shared_lighting_color",
        label: { en: "Amber key (test)", ko: "앰버 주광 (테스트)" },
        provenance: { source: "e2e-fixture" },
        patches: [{ attributeId: "lighting.key_color", value: { kind: "single", optionId: "amber" } }],
      },
    ];
    const { user, go } = await open(CatalogRegistry.createOrThrow(c));
    await go("색상 및 색온도");
    await user.click(screen.getByRole("button", { name: /변경 내용 확인… 앰버 주광/ }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "적용" }));
    expect(current("lighting.key_color")).toHaveTextContent("앰버");
    expect(within(field("lighting.key_color")).getByText(/프리셋에서 설정됨: 앰버 주광/)).toBeInTheDocument();
    expect(prompt()).toBe("Key light color: amber.");
  });
});

describe("category tree keyboard navigation (TD-01)", () => {
  it("one Tab stop; ↑/↓, →/←, Home/End move and expand/collapse; Enter opens the page", async () => {
    const { user } = await open();
    const items = () => within(nav()).getAllByRole("treeitem");
    expect(items().filter((el) => el.tabIndex === 0)).toEqual([item("기본")]); // roving tabindex: the current page
    expect(item("기본")).toHaveAttribute("aria-current", "page");
    expect(item("기본")).toHaveAttribute("aria-selected", "true");

    await user.click(within(nav()).getByRole("searchbox"));
    await user.tab();
    expect(document.activeElement).toBe(item("기본"));
    await user.keyboard("{ArrowDown}");
    expect(document.activeElement).toBe(item("인물"));
    expect(item("인물")).toHaveAttribute("aria-expanded", "true");
    await user.keyboard("{ArrowRight}"); // expanded → first child
    expect(document.activeElement).toBe(item("인물 기본 정보"));
    await user.keyboard("{ArrowLeft}"); // expanded child → collapses it
    expect(item("인물 기본 정보")).toHaveAttribute("aria-expanded", "false");
    await user.keyboard("{ArrowLeft}"); // collapsed → parent
    expect(document.activeElement).toBe(item("인물"));
    await user.keyboard("{ArrowLeft}"); // collapse the parent
    expect(item("인물")).toHaveAttribute("aria-expanded", "false");
    expect(within(nav()).queryByRole("treeitem", { name: "얼굴" })).toBeNull();
    await user.keyboard("{ArrowRight}"); // expand again
    expect(item("인물")).toHaveAttribute("aria-expanded", "true");
    await user.keyboard("{End}");
    expect(document.activeElement).toBe(items()[items().length - 1]);
    await user.keyboard("{Home}");
    expect(document.activeElement).toBe(item("기본"));

    // Keyboard only: reach Shared › Camera › Lens & perspective and open it.
    item("공통").focus();
    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(item("카메라"));
    await user.keyboard("{ArrowRight}{ArrowDown}");
    expect(document.activeElement).toBe(item("렌즈 및 원근감"));
    await user.keyboard("{Enter}");
    expect(screen.getByRole("heading", { level: 2, name: "렌즈 및 원근감" })).toBeInTheDocument();
    expect(item("렌즈 및 원근감")).toHaveAttribute("aria-current", "page");
    expect(items().filter((el) => el.tabIndex === 0)).toEqual([item("렌즈 및 원근감")]);
    expect(document.activeElement).toBe(item("렌즈 및 원근감")); // desktop: focus stays in the tree
    expect(document.querySelector('[data-attribute-id="camera.focal_length"]')).not.toBeNull();
  });

  it("names are the category label only; counts and warnings are the accessible description", async () => {
    const { user, go } = await open();
    await go("렌즈 및 원근감");
    await user.click(within(field("camera.focal_length")).getByText("85mm", { exact: true }).closest("label")!);
    expect(item("카메라")).toHaveAccessibleName("카메라");
    expect(item("카메라")).toHaveAccessibleDescription("1개 설정됨");
    expect(item("렌즈 및 원근감")).toHaveAccessibleDescription("1개 설정됨");
  });

  it("search announces the result count; a result opens its page and focuses the attribute", async () => {
    const { user } = await open();
    await user.type(within(nav()).getByRole("searchbox"), "보케");
    expect(screen.getByTestId("cat-search-count")).toHaveTextContent(/^검색 결과 \d+개$/);
    expect(screen.getByTestId("cat-search-count")).toHaveAttribute("role", "status");
    await user.click(within(nav()).getAllByRole("button", { name: /보케 형태/ })[0]!);
    expect(screen.getByRole("heading", { level: 2, name: "카메라 효과" })).toBeInTheDocument();
    expect(document.activeElement).toBe(field("camera.bokeh"));
    await user.type(within(nav()).getByRole("searchbox"), "zzzz-없음");
    expect(screen.getByTestId("cat-search-count")).toHaveTextContent("일치하는 속성이나 선택지가 없습니다");
  });
});

describe("dialogs (TD-02): initial focus, focus kept inside, Escape, focus restored", () => {
  it("preset dialog: focus starts on Cancel, Tab wraps inside, the page is inert, Escape returns focus to the opener", async () => {
    const { user, go } = await open(getFixtureRegistry());
    await go("조명");
    const opener = screen.getByRole("button", { name: /변경 내용 확인… 골든 장면/ });
    await user.click(opener);
    const dialog = screen.getByRole("dialog");
    expect(document.activeElement).toBe(within(dialog).getByRole("button", { name: "취소" }));
    expect(document.querySelector(".app__header")!.closest("[inert]")).not.toBeNull();
    expect(nav().closest("[inert]")).not.toBeNull();
    expect(dialog.closest("[inert]")).toBeNull();
    for (let i = 0; i < 6; i++) {
      await user.tab();
      expect(dialog.contains(document.activeElement), `tab ${i}`).toBe(true);
    }
    await user.tab({ shift: true });
    expect(dialog.contains(document.activeElement)).toBe(true);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(opener);
    expect(document.querySelector("[inert]")).toBeNull();
  });

  it("category reset dialog: after resetting (button now disabled) focus goes to the undo button", async () => {
    const { user, go } = await open();
    await go("프레이밍 및 시점");
    await user.click(within(field("camera.angle")).getByRole("radio", { name: "로우 앵글 (올려다봄)" }));
    await user.click(screen.getByTestId("category-reset"));
    const dialog = screen.getByTestId("category-reset-dialog");
    expect(document.activeElement).toBe(within(dialog).getByRole("button", { name: "취소" }));
    await user.click(within(dialog).getByRole("button", { name: "1개 값 초기화" }));
    expect(screen.getByTestId("category-reset")).toBeDisabled();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "카테고리 초기화 되돌리기" }));
    // Cancel path: focus returns to the reset button itself.
    await user.click(screen.getByRole("button", { name: "카테고리 초기화 되돌리기" }));
    await user.click(screen.getByTestId("category-reset"));
    await user.keyboard("{Escape}");
    expect(document.activeElement).toBe(screen.getByTestId("category-reset"));
  });

  it("example zoom dialog: Escape closes and returns focus to the zoom button", async () => {
    const { user, go } = await open(getFixtureRegistry());
    await go("얼굴");
    const zoom = within(field("x.face.shape")).getByRole("button", { name: "예시 크게 보기" });
    await user.click(zoom);
    expect(document.activeElement).toBe(within(screen.getByRole("dialog")).getByRole("button", { name: "닫기" }));
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(zoom);
  });
});

describe("editing flow (Sprint 2-C.1 §5.4)", () => {
  it("previous / next page buttons walk the Camera and Lighting groups; focus lands on the page title", async () => {
    const { user, go } = await open();
    await go("프레이밍 및 시점");
    const seq = screen.getByTestId("category-sequence");
    await user.click(within(seq).getByRole("button", { name: /다음: 렌즈 및 원근감/ }));
    expect(screen.getByRole("heading", { level: 2, name: "렌즈 및 원근감" })).toBe(document.activeElement);
    await user.click(within(screen.getByTestId("category-sequence")).getByRole("button", { name: /이전: 프레이밍 및 시점/ }));
    expect(screen.getByRole("heading", { level: 2, name: "프레이밍 및 시점" })).toBeInTheDocument();
    await go("카메라 효과");
    await user.click(within(screen.getByTestId("category-sequence")).getByRole("button", { name: /다음: 조명 프리셋 및 광원/ }));
    expect(screen.getByRole("heading", { level: 2, name: "조명 프리셋 및 광원" })).toBeInTheDocument();
  });

  it("rim light strength and rim light color are on one page: search finds it, “none” keeps the color with its notice, restoring outputs it again", async () => {
    const { user, store } = await open();
    await user.type(within(nav()).getByRole("searchbox"), "림 라이트 색");
    await user.click(within(nav()).getAllByRole("button", { name: /림 라이트 색상/ })[0]!);
    expect(screen.getByRole("heading", { level: 2, name: "보조광 및 환경광" })).toBeInTheDocument();
    expect(document.activeElement).toBe(field("lighting.rim_color"));
    const page = document.querySelector<HTMLElement>(".cat-panel")!;
    expect(page.contains(field("lighting.rim")) && page.contains(field("lighting.rim_color"))).toBe(true);
    await user.click(toggle("lighting.rim_color"));
    await user.click(within(field("lighting.rim_color")).getByRole("radio", { name: "시안" }));
    await user.click(within(field("lighting.rim")).getByText("약간", { exact: true }).closest("label")!);
    expect(prompt()).toBe("Rim light: subtle. Rim light color: cyan.");
    await user.click(within(field("lighting.rim")).getByText("없음", { exact: true }).closest("label")!);
    expect(prompt()).toBe("Rim light: none.");
    expect(within(field("lighting.rim_color")).getByText(/현재 선택에는 적용되지 않습니다/)).toBeInTheDocument(); // same page
    expect(saved(store)["lighting.rim_color"].value).toEqual({ kind: "single", optionId: "cyan" });
    await user.click(within(field("lighting.rim")).getByText("강함", { exact: true }).closest("label")!);
    expect(prompt()).toBe("Rim light: strong. Rim light color: cyan.");
  });

  it("include/exclude and clear sit in the field header next to the state", async () => {
    const { user, go, store } = await open();
    await go("렌즈 및 원근감");
    await user.click(within(field("camera.lens_type")).getByText("망원", { exact: true }).closest("label")!);
    const header = field("camera.lens_type").querySelector("header")!;
    await user.click(within(header).getByRole("switch", { name: /프롬프트에 포함/ }));
    expect(saved(store)["camera.lens_type"].excludedFromPrompt).toBe(true);
    expect(within(header).getByTestId("state-camera.lens_type")).toHaveTextContent("프롬프트 제외");
    await user.click(within(header).getByRole("button", { name: "선택 해제: 렌즈 종류" }));
    expect(saved(store)["camera.lens_type"]).toBeUndefined();
  });

  it("mobile drawer: choosing a category closes it and focus continues on the page title", async () => {
    const { user } = await open();
    const drawer = screen.getByRole("button", { name: /카테고리/, expanded: false });
    expect(drawer).toHaveAttribute("aria-controls", "detailed-nav");
    await user.click(drawer);
    expect(drawer).toHaveAttribute("aria-expanded", "true");
    await user.click(item("조명 효과"));
    expect(drawer).toHaveAttribute("aria-expanded", "false");
    expect(document.activeElement).toBe(screen.getByRole("heading", { level: 2, name: "조명 효과" }));
  });

  it("mobile preview sheet (non-modal): opening focuses its title; Escape closes it and returns focus to the toolbar button", async () => {
    const { user } = await open();
    const bar = screen.getByRole("toolbar", { name: "프롬프트 도구" });
    const button = within(bar).getByRole("button", { name: "미리보기" });
    await user.click(button);
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("heading", { level: 2, name: "프롬프트 미리보기" })));
    expect(document.querySelector("[inert]")).toBeNull();
    await user.keyboard("{Escape}");
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(document.activeElement).toBe(button);
  });
});
