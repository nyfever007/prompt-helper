// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PrompterApp } from "@/components/PrompterApp";
import { createMemoryStore, exportSpecJson, WORKSPACE_STORAGE_KEY, type KeyValueStore } from "@/domain";
import { getFixtureRegistry } from "@/testing/fixtureCatalog";
import { buildSpec, single } from "../fixtures/specs";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const fx = getFixtureRegistry();
const prompt = () => screen.queryByTestId("prompt-output")?.textContent ?? "";
const fieldFor = (id: string) => document.querySelector<HTMLElement>(`[data-attribute-id="${id}"]`);
const field = (id: string) => fieldFor(id)!;
const nav = () => screen.getByRole("navigation", { name: "카테고리" });
const go = async (user: ReturnType<typeof userEvent.setup>, label: string) => user.click(within(nav()).getByRole("button", { name: label }));
const saved = (store: KeyValueStore) => JSON.parse(store.getItem(WORKSPACE_STORAGE_KEY) ?? "{}").spec?.selections ?? {};

const open = async (store: KeyValueStore = createMemoryStore()) => {
  const user = userEvent.setup();
  const utils = render(<PrompterApp registry={fx} store={store} />);
  await waitFor(() => expect(screen.getByTestId("storage-status").textContent).not.toMatch(/불러오는 중/));
  await user.click(screen.getByRole("tab", { name: /Detailed/ }));
  return { user, store, ...utils };
};

describe("Detailed navigation (data-driven)", () => {
  it("builds the category tree from the catalog and starts at the first editable category", async () => {
    await open();
    const n = nav();
    for (const label of ["기본", "인물", "얼굴", "눈썹", "공통", "카메라", "조명"]) expect(within(n).getByRole("button", { name: label })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "기본" })).toBeInTheDocument();
    expect(fieldFor("subject.kind")).not.toBeNull();
  });

  it("collapses and expands branches", async () => {
    const { user } = await open();
    expect(within(nav()).getByRole("button", { name: "얼굴" })).toBeInTheDocument();
    await user.click(within(nav()).getByRole("button", { name: "인물 −" }));
    expect(within(nav()).queryByRole("button", { name: "얼굴" })).toBeNull();
    await user.click(within(nav()).getByRole("button", { name: "인물 +" }));
    expect(within(nav()).getByRole("button", { name: "얼굴" })).toBeInTheDocument();
  });

  it("shows set counts and warning/blocked badges that follow the spec", async () => {
    const { user } = await open();
    await go(user, "조명");
    await user.click(within(field("lighting.preset")).getByRole("radio", { name: "골든아워" }));
    expect(screen.getByTestId("count-shared_lighting")).toHaveTextContent("1");
    expect(screen.getByTestId("count-shared")).toHaveTextContent("1");
    await go(user, "장소와 배경");
    await user.click(within(field("scene.setting")).getByRole("radio", { name: "스튜디오" }));
    expect(screen.getByTestId("warn-shared_lighting")).toHaveTextContent("⚠ 1");
    await go(user, "기본");
    await user.type(screen.getByRole("textbox", { name: /이미지 설명/ }), "sexy schoolgirl");
    expect(screen.getByTestId("blocked-essentials")).toBeInTheDocument();
  });

  it("search (ko/en/alias) jumps to the category and focuses the attribute", async () => {
    const { user } = await open();
    await user.type(within(nav()).getByRole("searchbox"), "윤곽");
    await user.click(within(nav()).getAllByRole("button", { name: /얼굴형 \(테스트\)/ })[0]!); // attribute hit ranks first
    expect(screen.getByRole("heading", { level: 2, name: "얼굴" })).toBeInTheDocument();
    expect(document.activeElement).toBe(field("x.face.shape"));
    await user.type(within(nav()).getByRole("searchbox"), "golden");
    await user.click(within(nav()).getAllByRole("button", { name: /골든아워/ })[0]!);
    expect(screen.getByRole("heading", { level: 2, name: "조명" })).toBeInTheDocument();
  });

  it("draft areas are honest placeholders with their design document", async () => {
    const { user } = await open();
    await go(user, "피부"); // eyebrows were approved in Sprint 2-B.2; skin stays DRAFT
    expect(screen.getByTestId("draft-placeholder")).toHaveTextContent("docs/catalogs/person/skin.md");
    expect(document.querySelectorAll(".cat-panel [data-attribute-id]")).toHaveLength(0);
  });

  it("never renders unapproved, deferred or precision-only attributes", async () => {
    const { user } = await open();
    await go(user, "얼굴");
    expect(fieldFor("x.face.shape")).not.toBeNull();
    for (const id of ["x.hidden.deferred", "x.hidden.draft", "x.hidden.precision"]) expect(fieldFor(id)).toBeNull();
    await go(user, "스타일");
    for (const id of ["style.medium", "style.realism", "style.technique", "style.movement", "style.aesthetic"]) expect(fieldFor(id)).toBeNull();
  });

  it("person areas are flagged as not applicable for a non-person subject (values kept)", async () => {
    const { user } = await open();
    await go(user, "얼굴");
    await user.click(within(field("x.face.shape")).getByRole("radio", { name: /계란형/ }));
    await go(user, "기본");
    await user.click(within(field("subject.kind")).getByRole("radio", { name: "풍경" }));
    await go(user, "얼굴");
    expect(screen.getByText(/인물 피사체에 적용됩니다/)).toBeInTheDocument();
    expect(field("x.face.shape").dataset.state).toBe("set");
  });
});

describe("generic controls and unset", () => {
  it("visual cards: honest placeholder, real image with zoom, Korean + English term", async () => {
    const { user } = await open();
    await go(user, "얼굴");
    const f = field("x.face.shape");
    expect(within(f).getAllByText("예시 이미지 준비 중").length).toBeGreaterThan(0);
    expect(within(f).getByText("Oval")).toBeInTheDocument();
    await user.click(within(f).getByRole("button", { name: "예시 크게 보기" }));
    const dlg = screen.getByRole("dialog", { name: "계란형" });
    expect(within(dlg).getByRole("img")).toHaveAttribute("alt", "계란형 테스트 예시");
    await user.click(within(dlg).getByRole("button", { name: "닫기" }));
    expect(screen.queryByRole("dialog", { name: "계란형" })).toBeNull();
    await user.click(within(f).getByRole("radio", { name: /계란형/ }));
    expect(prompt()).toBe("Face shape: oval face.");
  });

  it("dropdown: '미설정' returns to unset", async () => {
    const { user } = await open();
    await go(user, "메이크업");
    const select = within(field("x.makeup.finish")).getByRole("combobox");
    await user.selectOptions(select, "matte");
    expect(prompt()).toBe("Makeup: matte finish.");
    await user.selectOptions(select, "");
    expect(field("x.makeup.finish").dataset.state).toBe("unset");
  });

  it("color: palette swatches (single and multi)", async () => {
    const { user } = await open();
    await go(user, "눈");
    await user.click(within(field("x.eyes.color")).getByRole("radio", { name: "헤이즐" }));
    expect(prompt()).toBe("Eye color: hazel eyes.");
    await go(user, "헤어");
    await user.click(within(field("x.hair.colors")).getByRole("checkbox", { name: "은발" }));
    await user.click(within(field("x.hair.colors")).getByRole("checkbox", { name: "검은색" }));
    expect(prompt()).toContain("Hair color: black, silver.");
  });

  it("searchable list: filters by alias and keeps the selection visible", async () => {
    const { user } = await open();
    await go(user, "의상");
    const f = field("x.wardrobe.style");
    await user.type(within(f).getByRole("searchbox"), "정장");
    expect(within(f).getAllByRole("radio")).toHaveLength(1);
    await user.click(within(f).getByRole("radio", { name: /비즈니스 정장/ }));
    await user.clear(within(f).getByRole("searchbox"));
    await user.type(within(f).getByRole("searchbox"), "jeans");
    expect(within(f).getAllByRole("radio").map((r) => (r as HTMLInputElement).checked)).toEqual([true, false]);
  });

  it("slider: showing a position stores nothing; only user input stores; clear returns to unset", async () => {
    const { user, store } = await open();
    await go(user, "표정 및 시각적 인상");
    const slider = within(field("x.expression.smile")).getByRole("slider");
    expect(slider).toHaveAttribute("aria-valuetext", "미설정");
    slider.focus();
    await waitFor(() => expect(screen.getByTestId("storage-status").textContent).toMatch(/로컬에 저장됨/));
    expect(saved(store)["x.expression.smile"]).toBeUndefined();
    expect(field("x.expression.smile").dataset.state).toBe("unset");
    fireEvent.change(slider, { target: { value: "35" } });
    // degree sliders show only the qualitative band, never the number (Sprint 2-B.2 §5)
    expect(screen.getByTestId("slider-value-x.expression.smile")).toHaveTextContent(/^부드럽게$/);
    expect(slider).toHaveAttribute("aria-valuetext", "부드럽게");
    expect(prompt()).toBe("Expression: a gentle smile.");
    await waitFor(() => expect(saved(store)["x.expression.smile"]?.value).toEqual({ kind: "number", value: 35 }));
    await user.click(within(field("x.expression.smile")).getByRole("button", { name: /선택 해제/ }));
    expect(field("x.expression.smile").dataset.state).toBe("unset");
    expect(slider).toHaveAttribute("aria-valuetext", "미설정");
  });

  it("number input: invalid values are shown but not stored", async () => {
    const { user } = await open();
    await go(user, "신체");
    const input = within(field("x.body.height")).getByRole("spinbutton");
    await user.type(input, "999");
    expect(within(field("x.body.height")).getByRole("alert")).toHaveTextContent("100~230");
    expect(field("x.body.height").dataset.state).toBe("unset");
    await user.clear(input);
    await user.type(input, "172");
    expect(prompt()).toBe("Height: about 172 cm.");
  });

  it("range: half input is never stored or completed with defaults; cancel, invalid, clear and reload behave", async () => {
    const store = createMemoryStore();
    const { user, unmount } = await open(store);
    await go(user, "장소와 배경");
    const f = () => field("x.scene.people_count");
    const min = () => within(f()).getByRole("spinbutton", { name: /최솟값/ });
    const max = () => within(f()).getByRole("spinbutton", { name: /최댓값/ });
    await user.type(min(), "3");
    expect(screen.getByTestId("range-hint-x.scene.people_count")).toHaveTextContent("모두 입력해야 저장");
    expect(f().dataset.state).toBe("unset");
    await waitFor(() => expect(saved(store)["x.scene.people_count"]).toBeUndefined());
    await user.type(max(), "2"); // 3..2 invalid
    expect(within(f()).getByRole("alert")).toHaveTextContent("최솟값은 최댓값 이하");
    expect(f().dataset.state).toBe("unset");
    await user.clear(max());
    await user.type(max(), "6");
    expect(prompt()).toContain("Number of people: 3 to 6.");
    await waitFor(() => expect(saved(store)["x.scene.people_count"]?.value).toEqual({ kind: "range", min: 3, max: 6 }));
    await user.clear(max());
    await user.type(max(), "9"); // edit in progress → stored value follows valid drafts only
    await user.clear(max());
    expect(within(f()).getByRole("button", { name: "입력 취소" })).toBeInTheDocument();
    await user.click(within(f()).getByRole("button", { name: "입력 취소" }));
    expect(max()).toHaveValue(9);
    unmount();
    // reload: the last complete valid value is restored
    await open(store);
    await user.click(within(nav()).getByRole("button", { name: "장소와 배경" }));
    expect(within(field("x.scene.people_count")).getByRole("spinbutton", { name: /최댓값/ })).toHaveValue(9);
    await user.click(within(field("x.scene.people_count")).getByRole("button", { name: /선택 해제/ }));
    expect(field("x.scene.people_count").dataset.state).toBe("unset");
    expect(within(field("x.scene.people_count")).getByRole("spinbutton", { name: /최솟값/ })).toHaveValue(null);
  });

  it("single-line text input stores and clears", async () => {
    const { user } = await open();
    await go(user, "인물 기본 정보");
    await user.type(within(field("x.identity.note")).getByRole("textbox"), "wears glasses");
    expect(prompt()).toBe("Character note: wears glasses.");
    await user.click(within(field("x.identity.note")).getByRole("button", { name: /선택 해제/ }));
    expect(field("x.identity.note").dataset.state).toBe("unset");
  });
});

describe("policy restrictions in the UI", () => {
  it("restricted option is disabled with the reason; adults can select it", async () => {
    const { user } = await open();
    await go(user, "인물 기본 정보");
    await user.click(within(field("x.identity.age_group")).getByRole("radio", { name: "미성년" }));
    await go(user, "표정 및 시각적 인상");
    const appeal = field("x.expression.appeal");
    expect(within(appeal).getByRole("radio", { name: "매혹적인" })).toBeDisabled();
    expect(within(appeal).getByTestId("restricted-note")).toHaveTextContent("미성년자에게는 성적 매력 표현을 제공하지 않습니다");
    await go(user, "인물 기본 정보");
    await user.click(within(field("x.identity.age_group")).getByRole("radio", { name: "성인" }));
    await go(user, "표정 및 시각적 인상");
    expect(within(field("x.expression.appeal")).getByRole("radio", { name: "매혹적인" })).toBeEnabled();
  });

  it("an imported restricted combination blocks output (desktop preview and mobile copy)", async () => {
    const { user } = await open();
    const json = exportSpecJson(buildSpec(fx, [["x.identity.age_group", single("minor")], ["x.expression.appeal", single("alluring")]]));
    await user.upload(screen.getByTestId("import-input"), new File([json], "x.json", { type: "application/json" }));
    expect(await screen.findByTestId("prompt-blocked")).toHaveTextContent(/사용이 제한된 선택지/);
    expect(screen.getByRole("button", { name: "프롬프트 복사" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "하단 도구: 프롬프트 복사" })).toBeDisabled();
    expect(screen.getByTestId("mobile-status")).toHaveTextContent("차단됨");
  });
});

describe("composite presets (UI)", () => {
  it("previews changes, asks before overwriting, applies only what it lists, and undo spares user edits", async () => {
    const { user } = await open();
    // existing explicit choices
    await user.click(within(field("subject.kind")).getByRole("radio", { name: "인물 (1인)" }));
    await go(user, "카메라");
    await user.click(within(field("composition.framing")).getByRole("radio", { name: "전신" }));
    await go(user, "분위기");
    await user.click(within(field("mood.tone")).getByRole("checkbox", { name: "평온한" }));

    await go(user, "표정 및 시각적 인상");
    await user.click(screen.getByRole("button", { name: /변경 내용 확인… 부드러운 인물 사진/ }));
    const dlg = screen.getByRole("dialog", { name: /프리셋 적용: 부드러운 인물 사진/ });
    expect(within(dlg).getByText("기존 값 변경 (1)")).toBeInTheDocument();
    expect(within(dlg).getByText("새로 설정 (3)")).toBeInTheDocument();
    expect(within(dlg).getByText(/그대로 유지되는 기존 설정 \(2\)/)).toBeInTheDocument();
    expect(within(dlg).getByText(/전신/)).toBeInTheDocument();
    expect(prompt()).not.toContain("head-and-shoulders"); // nothing applied yet

    await user.click(within(dlg).getByRole("button", { name: "기존 값을 덮어쓰고 적용" }));
    expect(await screen.findByText(/프리셋 ‘부드러운 인물 사진 \(테스트\)’을\(를\) 적용했습니다 \(속성 4개\)/)).toBeInTheDocument();
    expect(prompt()).toContain("Framing: head-and-shoulders portrait.");
    expect(prompt()).toContain("Mood: calm."); // untouched
    expect(within(field("x.expression.smile")).getByText(/프리셋에서 설정됨/)).toBeInTheDocument();

    // user edits one preset-set attribute after applying
    fireEvent.change(within(field("x.expression.smile")).getByRole("slider"), { target: { value: "90" } });
    await user.click(screen.getByRole("button", { name: "최근 프리셋 되돌리기" }));
    expect(screen.getByText(/되돌렸습니다/)).toBeInTheDocument();
    expect(screen.getByText(/직접 수정해서 유지한 항목: 미소 정도/)).toBeInTheDocument();
    expect(prompt()).toContain("Framing: full-body shot."); // restored
    expect(prompt()).toContain("Expression: a broad, beaming smile."); // user edit kept
    expect(prompt()).not.toContain("softbox");
    expect(prompt()).toContain("Mood: calm.");
  });

  it("'apply only to empty attributes' keeps existing values", async () => {
    const { user } = await open();
    await user.click(within(field("subject.kind")).getByRole("radio", { name: "인물 (1인)" }));
    await go(user, "카메라");
    await user.click(within(field("composition.framing")).getByRole("radio", { name: "전신" }));
    await go(user, "표정 및 시각적 인상");
    await user.click(screen.getByRole("button", { name: /변경 내용 확인… 부드러운 인물 사진/ }));
    await user.click(screen.getByRole("button", { name: "비어 있는 항목만 적용" }));
    expect(prompt()).toContain("Framing: full-body shot.");
    expect(prompt()).toContain("Lighting: even studio softbox lighting.");
  });

  it("cancel applies nothing", async () => {
    const { user } = await open();
    await go(user, "조명");
    await user.click(screen.getByRole("button", { name: /변경 내용 확인… 골든 장면/ }));
    await user.click(screen.getByRole("button", { name: "취소" }));
    expect(prompt()).toMatch(/아직 선택한 항목이 없습니다/);
  });

  it("restricted and inapplicable patches are listed as skipped", async () => {
    const { user } = await open();
    await go(user, "인물 기본 정보");
    await user.click(within(field("x.identity.age_group")).getByRole("radio", { name: "미성년" }));
    await go(user, "표정 및 시각적 인상");
    await user.click(screen.getByRole("button", { name: /변경 내용 확인… 매혹적인 분위기/ }));
    expect(screen.getByText("건너뜀 — 정책상 사용 제한 (1)")).toBeInTheDocument();
  });
});

describe("semantic units in the UI", () => {
  it("a direct light property equal to the preset's meaning is output once and attributed to the direct setting", async () => {
    const { user } = await open();
    await go(user, "조명");
    await user.click(within(field("lighting.preset")).getByRole("radio", { name: "골든아워" }));
    await user.click(within(field("lighting.color_temperature")).getByRole("radio", { name: "따뜻한" }));
    expect(prompt()).toBe("Lighting: golden-hour sunlight. Color temperature: warm.");
    expect(screen.getByTestId("takeover-lighting.color_temperature")).toHaveTextContent("‘조명 (빠른 프리셋)’에도 포함된 표현");
    await user.click(within(field("lighting.color_temperature")).getByRole("radio", { name: "차가운" }));
    expect(prompt()).toBe("Lighting: golden-hour sunlight. Color temperature: cool.");
    expect(screen.getByTestId("takeover-lighting.color_temperature")).toHaveTextContent("직접 설정으로 대체했습니다");
    expect(field("lighting.preset").dataset.state).toBe("set");
  });
});

describe("mobile toolbar", () => {
  it("shows the applied count and status, toggles the preview and copies through the same gate", async () => {
    const { user } = await open();
    expect(screen.getByTestId("mobile-applied")).toHaveTextContent("0개 설정");
    expect(screen.getByTestId("mobile-status")).toHaveTextContent("정상");
    expect(screen.getByRole("button", { name: "하단 도구: 프롬프트 복사" })).toBeDisabled();
    await user.click(within(field("subject.kind")).getByRole("radio", { name: "동물" }));
    expect(screen.getByTestId("mobile-applied")).toHaveTextContent("1개 설정");
    const toggle = screen.getByRole("button", { name: "미리보기" });
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    const writeText = vi.spyOn(navigator.clipboard, "writeText");
    await user.click(screen.getByRole("button", { name: "하단 도구: 프롬프트 복사" }));
    expect(writeText).toHaveBeenCalledWith("Main subject: an animal.");
    await go(user, "장소와 배경");
    await user.click(within(field("scene.setting")).getByRole("radio", { name: "스튜디오" }));
    await go(user, "조명");
    await user.click(within(field("lighting.preset")).getByRole("radio", { name: "달빛" }));
    expect(screen.getByTestId("mobile-status")).toHaveTextContent("⚠ 1");
  });
});
