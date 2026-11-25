// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PrompterApp } from "@/components/PrompterApp";
import { createEmptySpec, createMemoryStore, exportSpecJson, getCoreRegistry, WORKSPACE_STORAGE_KEY, type KeyValueStore } from "@/domain";
import { extendedRegistry } from "../fixtures/catalogs";
import { buildSpec, single } from "../fixtures/specs";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  vi.restoreAllMocks();
});

const core = getCoreRegistry();
const prompt = () => screen.queryByTestId("prompt-output")?.textContent ?? "";
const tab = (name: RegExp) => screen.getByRole("tab", { name });
const fieldFor = (attributeId: string) => document.querySelector<HTMLElement>(`[data-attribute-id="${attributeId}"]`);
const field = (attributeId: string) => fieldFor(attributeId)!;
const chipIds = (attributeId: string) => [...field(attributeId).querySelectorAll<HTMLElement>("[data-option-id]")].map((e) => e.dataset.optionId);

const setUp = async (store: KeyValueStore | null = createMemoryStore(), noticeTimeoutMs?: number) => {
  const user = userEvent.setup();
  const utils = render(<PrompterApp store={store} {...(noticeTimeoutMs ? { noticeTimeoutMs } : {})} />);
  await waitFor(() => expect(screen.getByTestId("storage-status").textContent).not.toMatch(/불러오는 중|Loading/));
  return { user, store, ...utils };
};

const fillBasics = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(within(field("subject.kind")).getByRole("radio", { name: "인물 (1인)" }));
  await user.click(within(field("style.preset")).getByRole("radio", { name: "수채화" }));
  await user.type(screen.getByRole("textbox", { name: /이미지 설명/ }), "A quiet harbor");
};

const EXPECTED = "A quiet harbor. Main subject: a single person. Visual style: watercolor painting.";

describe("Basic mode essentials (Sprint 0 coverage kept)", () => {
  it("renders five modes (Recommended 2-D.5, Random 2-D.6) with Basic selected and an empty preview", async () => {
    await setUp();
    expect(screen.getAllByRole("tab").map((x) => x.textContent?.replace(/예정$/, ""))).toEqual(["Recommended", "Random", "Basic", "Detailed", "Precision"]);
    expect(tab(/Basic/)).toHaveAttribute("aria-selected", "true");
    expect(prompt()).toMatch(/아직 선택한 항목이 없습니다/);
    expect(screen.getByRole("button", { name: "프롬프트 복사" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "프롬프트 .txt 내보내기" })).toBeDisabled();
  });

  it("selecting subject, style and free text updates the live preview", async () => {
    const { user } = await setUp();
    await fillBasics(user);
    expect(prompt()).toBe(EXPECTED);
    expect(field("subject.kind").dataset.state).toBe("set");
  });

  it("clear returns an attribute to unset and removes it from the prompt", async () => {
    const { user } = await setUp();
    await fillBasics(user);
    await user.click(within(field("style.preset")).getByRole("button", { name: /선택 해제/ }));
    expect(field("style.preset").dataset.state).toBe("unset");
    expect(prompt()).toBe("A quiet harbor. Main subject: a single person.");
  });

  it("copy writes the compiled prompt to the clipboard", async () => {
    const { user } = await setUp();
    await fillBasics(user);
    const writeText = vi.spyOn(navigator.clipboard, "writeText");
    await user.click(screen.getByRole("button", { name: "프롬프트 복사" }));
    expect(writeText).toHaveBeenCalledWith(EXPECTED);
    expect(await screen.findByRole("button", { name: "복사됨!" })).toBeInTheDocument();
  });

  it("Korean is the default UI language; switching to English changes labels, not the spec or prompt", async () => {
    const { user } = await setUp();
    expect(screen.getByRole("heading", { name: "피사체" })).toBeInTheDocument();
    await fillBasics(user);
    await user.selectOptions(screen.getByRole("combobox"), "en");
    expect(screen.getByRole("radio", { name: "Person" })).toBeChecked();
    expect(prompt()).toBe(EXPECTED);
  });

  it("each set attribute shows the prompt text it contributes (provenance)", async () => {
    const { user } = await setUp();
    await fillBasics(user);
    expect(screen.getByTestId("provenance-style.preset")).toHaveTextContent("Visual style: watercolor painting.");
  });
});

describe("Basic Composer: context-aware options", () => {
  it("framing choices follow the subject; an inapplicable choice is kept, flagged, excluded and restored", async () => {
    const { user } = await setUp();
    expect(chipIds("composition.framing")).toContain("panoramic"); // no subject yet → unrestricted

    await user.click(within(field("subject.kind")).getByRole("radio", { name: "인물 (1인)" }));
    expect(chipIds("composition.framing")).not.toContain("panoramic");
    await user.click(within(field("composition.framing")).getByRole("radio", { name: "전신" }));
    expect(prompt()).toContain("Framing: full-body shot.");

    await user.click(within(field("subject.kind")).getByRole("radio", { name: "풍경" }));
    expect(field("composition.framing").dataset.state).toBe("set");
    expect(field("composition.framing").dataset.active).toBe("false");
    expect(within(field("composition.framing")).getByText(/선택한 ‘전신’은\(는\) 현재 선택에 적용되지 않습니다/)).toBeInTheDocument();
    expect(field("composition.framing").querySelector('[data-option-id="full_body"]')).toHaveAttribute("data-inactive", "true");
    expect(screen.getByText(/현재 선택에 적용되지 않게 됨: 구도/)).toBeInTheDocument();
    expect(prompt()).toBe("Main subject: a landscape.");
    expect(screen.getByTestId("provenance-composition.framing")).toHaveTextContent("프롬프트에서 제외됨");

    await user.click(within(field("subject.kind")).getByRole("radio", { name: "인물 (1인)" }));
    expect(screen.getByText(/다시 적용되어 프롬프트에 반영됨: 구도/)).toBeInTheDocument();
    expect(prompt()).toContain("Framing: full-body shot.");
  });

  it("secondary attributes sit behind 'More settings' and open automatically when set", async () => {
    const { user } = await setUp();
    expect(fieldFor("composition.view_direction")).toBeNull();
    await user.click(screen.getByRole("button", { name: /추가 설정 \(2\)/ }));
    expect(fieldFor("composition.view_direction")).not.toBeNull();
    await user.click(within(field("composition.view_direction")).getByRole("radio", { name: "3/4 측면" }));
    expect(screen.getByRole("button", { name: /추가 설정 \(2 · 1 설정됨\)/ })).toHaveAttribute("aria-expanded", "true");
  });

  it("viewing direction disappears for a landscape but a chosen value is kept and shown", async () => {
    const { user } = await setUp();
    await user.click(screen.getByRole("button", { name: /추가 설정 \(2\)/ }));
    await user.click(within(field("composition.view_direction")).getByRole("radio", { name: "측면 (옆모습)" }));
    await user.click(within(field("subject.kind")).getByRole("radio", { name: "풍경" }));
    expect(field("composition.view_direction").dataset.active).toBe("false");
    expect(within(field("composition.view_direction")).getByText(/현재 선택에는 적용되지 않습니다/)).toBeInTheDocument();
    expect(prompt()).not.toContain("Viewing direction");
  });
});

describe("Basic Composer: search, presets, conflicts, parameters", () => {
  it("style search filters by Korean/English labels and aliases and keeps the selection visible", async () => {
    const { user } = await setUp();
    const search = within(field("style.preset")).getByRole("searchbox");
    await user.type(search, "수채");
    expect(chipIds("style.preset")).toEqual(["watercolor"]);
    await user.click(within(field("style.preset")).getByRole("radio", { name: "수채화" }));
    await user.clear(search);
    await user.type(search, "anime");
    expect(chipIds("style.preset")).toEqual(["watercolor", "anime"]); // selected one pinned first
    await user.clear(search);
    await user.type(search, "zzzz");
    expect(within(field("style.preset")).getByText(/검색 결과가 없습니다/)).toBeInTheDocument();
  });

  it("a style preset shows its characteristics for reference only — nothing else gets set", async () => {
    const { user } = await setUp();
    await user.click(within(field("style.preset")).getByRole("radio", { name: "애니메이션풍" }));
    const panel = screen.getByTestId("classification-style.preset");
    expect(panel).toHaveTextContent("매체: 디지털 아트");
    expect(panel).toHaveTextContent("‘이미지 스타일’ 항목만 설정됩니다");
    // Detailed: the style category edits the preset; the deferred style axes are not exposed
    await user.click(tab(/Detailed/));
    await user.click(screen.getByRole("treeitem", { name: "스타일" }));
    expect(field("style.preset").dataset.state).toBe("set");
    expect(fieldFor("style.medium")).toBeNull();
    // Precision summary (read-only) shows set values only for exposed/set attributes
    await user.click(tab(/Precision/));
    const summary = screen.getByRole("region", { name: "현재 공유 명세" });
    expect(summary.querySelector('[data-attribute-id="style.medium"]')).toBeNull();
    expect(summary.querySelector('[data-attribute-id="style.preset"]')).toHaveAttribute("data-state", "set");
  });

  it("a conflict names the attributes, explains how to resolve, and only acts when the user clicks", async () => {
    const { user } = await setUp();
    await user.click(within(field("scene.setting")).getByRole("radio", { name: "스튜디오" }));
    await user.click(within(field("lighting.preset")).getByRole("radio", { name: "골든아워" }));
    const lighting = field("lighting.preset");
    expect(within(lighting).getByText(/스튜디오 안에서 햇빛·달빛 조명은 어울리지 않을 수 있습니다/)).toBeInTheDocument();
    expect(within(lighting).getByText(/해결 방법:/)).toBeInTheDocument();
    expect(within(field("scene.setting")).getByText(/스튜디오 안에서 햇빛/)).toBeInTheDocument(); // shown on both involved fields
    expect(prompt()).toContain("Lighting: warm golden-hour sunlight.");
    expect(prompt()).toContain("Setting: a studio.");

    await user.click(within(lighting).getByRole("button", { name: "‘장소 / 환경’ 선택 해제" }));
    expect(field("scene.setting").dataset.state).toBe("unset");
    expect(field("lighting.preset").dataset.state).toBe("set");
  });

  it("aspect ratio: suggested default is offered, not applied; chosen value is also a structured parameter", async () => {
    const { user } = await setUp();
    expect(field("output.aspect_ratio").dataset.state).toBe("unset");
    expect(screen.queryByTestId("prompt-parameters")).toBeNull();
    await user.click(within(field("output.aspect_ratio")).getByRole("radio", { name: "와이드 16:9" }));
    expect(screen.getByTestId("prompt-parameters")).toHaveTextContent("aspectRatio=16:9");
    expect(prompt()).toBe("Aspect ratio: widescreen 16:9.");
    await user.click(within(field("output.aspect_ratio")).getByRole("button", { name: /선택 해제/ }));
    await user.click(within(field("output.aspect_ratio")).getByRole("button", { name: /권장 기본값 사용: 정사각 1:1/ }));
    expect(prompt()).toBe("Aspect ratio: square 1:1.");
  });

  it("mixed-language notice appears for Korean free text; the text is kept exactly", async () => {
    const { user } = await setUp();
    await user.type(screen.getByRole("textbox", { name: /이미지 설명/ }), "비 오는 카페");
    expect(screen.getByTestId("mixed-language")).toHaveTextContent(/영어가 아닌 텍스트\(Hangul\)/);
    expect(prompt()).toBe("비 오는 카페.");
  });
});

describe("safety in the UI", () => {
  it("blocks preview, copy and .txt export; JSON export stays available; guidance shown", async () => {
    const { user } = await setUp();
    await user.type(screen.getByRole("textbox", { name: /이미지 설명/ }), "sexy schoolgirl");
    const blocked = screen.getByTestId("prompt-blocked");
    expect(blocked).toHaveTextContent("안전 정책에 의해 프롬프트 출력이 차단되었습니다");
    expect(blocked).toHaveTextContent("schoolgirl, sexy");
    expect(blocked).toHaveTextContent(/성인 여성\/adult woman/);
    expect(screen.queryByTestId("prompt-output")).toBeNull();
    expect(screen.getByRole("button", { name: "프롬프트 복사" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "프롬프트 .txt 내보내기" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "JSON 내보내기" })).toBeEnabled();
    expect(screen.getByRole("textbox", { name: /이미지 설명/ })).toHaveValue("sexy schoolgirl"); // not rewritten
    expect(screen.getByTestId("provenance-intent.description")).toHaveTextContent("안전 정책에 의해 프롬프트 출력이 차단됨");
  });

  it("policy 0.3.0 (TD-15): adult fashion wording with sexual appeal waits for a set adult age — guidance links to the age setting; an adult age releases it", async () => {
    const { user } = await setUp();
    await user.type(screen.getByRole("textbox", { name: /이미지 설명/ }), "Confident adult model in lingerie, editorial");
    // 0.2.0 output this directly; “adult” in free text is not a set age.
    const blocked = screen.getByTestId("prompt-blocked");
    expect(blocked).toHaveTextContent("이 표현을 사용하려면 인물의 성인 연령 정보를 명확하게 설정해야 합니다");
    expect(within(blocked).getByTestId("related-settings")).toHaveTextContent("관련 설정: 연령대 (연령), 외형적 연령 (연령), 실제 연령 (연령)");
    await user.click(within(blocked).getByRole("button", { name: "연령대 (연령) — 이 설정으로 이동" }));
    // Basic → Detailed › 연령, focused on the setting; nothing was set automatically
    expect(tab(/Detailed/)).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("heading", { level: 2, name: "연령" })).toBeInTheDocument();
    expect(document.activeElement).toBe(field("person.identity.age_group"));
    expect(screen.getByTestId("prompt-blocked")).toBeInTheDocument();
    await user.selectOptions(within(field("person.identity.age_group")).getByRole("combobox"), "young_adult");
    expect(screen.queryByTestId("prompt-blocked")).toBeNull();
    expect(prompt()).toBe("Confident adult model in lingerie, editorial. Age group: young adult.");
  });
});

describe("9. mode switching keeps settings (Basic ⊂ Detailed, one spec)", () => {
  it("Basic → Detailed (edit) → Precision → Basic preserves and shares the same spec", async () => {
    const { user } = await setUp();
    await fillBasics(user);
    await user.click(tab(/Detailed/));
    // Detailed shows the same values (essentials category first)
    expect(within(field("subject.kind")).getByRole("radio", { name: "인물 (1인)" })).toBeChecked();
    expect(screen.getByRole("textbox", { name: /이미지 설명/ })).toHaveValue("A quiet harbor");
    expect(prompt()).toBe(EXPECTED);
    // edit a camera attribute in Detailed
    await user.click(screen.getByRole("treeitem", { name: "프레이밍 및 시점" })); // Camera › subcategory (Sprint 2-C.1)
    await user.click(within(field("camera.angle")).getByRole("radio", { name: "로우 앵글 (올려다봄)" }));
    const withAngle = `${EXPECTED} Camera angle: low angle looking up.`;
    expect(prompt()).toBe(withAngle);

    await user.click(tab(/Precision/));
    expect(screen.getByText(/Precision 모드는 후속 개발 예정/)).toBeInTheDocument();
    expect(prompt()).toBe(withAngle);

    await user.click(tab(/Basic/));
    expect(screen.getByRole("radio", { name: "수채화" })).toBeChecked();
    expect(within(field("camera.angle")).getByRole("radio", { name: "로우 앵글 (올려다봄)" })).toBeChecked(); // "more settings" auto-opened
    expect(prompt()).toBe(withAngle);
  });
});

describe("10. local save and restore (UI)", () => {
  it("restores after a remount with the same store; the restore notice dismisses itself", async () => {
    const store = createMemoryStore();
    const first = await setUp(store);
    await fillBasics(first.user);
    await waitFor(() => expect(screen.getByTestId("storage-status").textContent).toMatch(/로컬에 저장됨/));
    first.unmount();

    await setUp(store, 80);
    expect(await screen.findByText("마지막 작업을 복원했습니다.")).toBeInTheDocument();
    expect(prompt()).toBe(EXPECTED);
    await waitFor(() => expect(screen.queryByText("마지막 작업을 복원했습니다.")).toBeNull());
  });

  it("uses window.localStorage by default and restores the mode tab too", async () => {
    const user = userEvent.setup();
    const first = render(<PrompterApp />);
    await user.click(screen.getByRole("radio", { name: "동물" }));
    await user.click(tab(/Precision/));
    await waitFor(() => expect(window.localStorage.getItem(WORKSPACE_STORAGE_KEY)).toContain('"animal"'));
    first.unmount();
    render(<PrompterApp />);
    await waitFor(() => expect(prompt()).toBe("Main subject: an animal."));
    expect(tab(/Precision/)).toHaveAttribute("aria-selected", "true");
  });

  it("corrupt saved data does not crash the app; it starts fresh, warns, and keeps a backup", async () => {
    const store = createMemoryStore({ [WORKSPACE_STORAGE_KEY]: "{broken" });
    await setUp(store);
    expect(screen.getByRole("alert")).toHaveTextContent(/복원할 수 없어/);
    expect(store.getItem(`${WORKSPACE_STORAGE_KEY}:corrupt-backup`)).toBe("{broken");
  });

  it("Sprint 0 saved data is migrated on load, with the change and reason shown", async () => {
    const raw = readFileSync(join(__dirname, "../fixtures/sprint0/localstorage-workspace.txt"), "utf8");
    const store = createMemoryStore({ [WORKSPACE_STORAGE_KEY]: raw });
    await setUp(store);
    expect(screen.getByText("이전 버전 데이터를 현재 카탈로그에 맞게 변환했습니다")).toBeInTheDocument();
    expect(screen.getByText(/style\.visual → style\.preset \(0\.1\.0 → 0\.2\.0\) — .*프리셋/)).toBeInTheDocument();
    expect(prompt()).toContain("Visual style: watercolor painting.");
    expect(store.getItem(`${WORKSPACE_STORAGE_KEY}:pre-migration-backup`)).toBe(raw);
  });
});

describe("partial recovery (UI) — explicit confirmation, original preserved", () => {
  const damaged = () =>
    JSON.stringify({
      kind: "prompter.workspace",
      storageVersion: 1,
      savedAt: "2026-11-24T00:00:00.000Z",
      spec: {
        ...createEmptySpec(core),
        selections: {
          "intent.description": { value: { kind: "text", text: "Keep me" }, source: "user" },
          "subject.kind": { value: { kind: "single", optionId: "dragon" }, source: "user" },
        },
      },
    });

  it("saved data: shows what will be excluded, pauses autosave, applies only on confirm", async () => {
    const raw = damaged();
    const store = createMemoryStore({ [WORKSPACE_STORAGE_KEY]: raw });
    const { user } = await setUp(store);
    const panel = screen.getByRole("alertdialog", { name: "저장된 작업 일부를 복원할 수 없습니다" });
    expect(within(panel).getByText("selections.subject.kind")).toBeInTheDocument();
    expect(within(panel).getByText(/현재 카탈로그에 없는 선택지입니다/)).toBeInTheDocument();
    expect(screen.getByTestId("storage-status")).toHaveTextContent("일시 중지");
    expect(prompt()).toMatch(/아직 선택한 항목이 없습니다/); // nothing applied yet
    expect(store.getItem(WORKSPACE_STORAGE_KEY)).toBe(raw); // not overwritten

    await user.click(within(panel).getByRole("button", { name: "이 항목을 제외하고 복구" }));
    expect(prompt()).toBe("Keep me.");
    expect(screen.queryByRole("alertdialog")).toBeNull();
    await waitFor(() => expect(store.getItem(WORKSPACE_STORAGE_KEY)).not.toBe(raw));
    expect(store.getItem(`${WORKSPACE_STORAGE_KEY}:corrupt-backup`)).toBe(raw);
  });

  it("saved data: 'start fresh' applies nothing and keeps the backup", async () => {
    const raw = damaged();
    const store = createMemoryStore({ [WORKSPACE_STORAGE_KEY]: raw });
    const { user } = await setUp(store);
    await user.click(screen.getByRole("button", { name: "복구하지 않고 새로 시작" }));
    expect(prompt()).toMatch(/아직 선택한 항목이 없습니다/);
    expect(store.getItem(`${WORKSPACE_STORAGE_KEY}:corrupt-backup`)).toBe(raw);
  });

  it("import: partially invalid file needs confirmation; cancel keeps current work", async () => {
    const { user } = await setUp();
    await fillBasics(user);
    const file = JSON.stringify({
      ...JSON.parse(exportSpecJson(buildSpec(core, [["subject.kind", single("vehicle")]]))),
      selections: {
        "subject.kind": { value: { kind: "single", optionId: "vehicle" }, source: "user" },
        "person.hair": { value: { kind: "text", text: "x" }, source: "user" },
      },
    });
    await user.upload(screen.getByTestId("import-input"), new File([file], "spec.json", { type: "application/json" }));
    const panel = await screen.findByRole("alertdialog", { name: "가져온 파일 일부를 사용할 수 없습니다" });
    expect(within(panel).getByText("selections.person.hair")).toBeInTheDocument();
    expect(prompt()).toBe(EXPECTED);
    await user.click(within(panel).getByRole("button", { name: "가져오기 취소" }));
    expect(prompt()).toBe(EXPECTED);

    await user.upload(screen.getByTestId("import-input"), new File([file], "spec.json", { type: "application/json" }));
    await user.click(await screen.findByRole("button", { name: "이 항목을 제외하고 가져오기 (현재 작업을 대체)" }));
    expect(prompt()).toBe("Main subject: a vehicle.");
  });
});

describe("reset / undo / import (UI)", () => {
  it("reset asks for confirmation; the pre-reset state can be restored even after further edits", async () => {
    const { user } = await setUp();
    await fillBasics(user);
    const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
    await user.click(screen.getByRole("button", { name: "설정 초기화" }));
    expect(prompt()).toBe(EXPECTED);
    await user.click(screen.getByRole("button", { name: "설정 초기화" }));
    expect(confirm).toHaveBeenCalledTimes(2);
    expect(prompt()).toMatch(/아직 선택한 항목이 없습니다/);

    await user.click(within(field("subject.kind")).getByRole("radio", { name: "동물" })); // new edit after reset
    confirm.mockReturnValueOnce(true);
    await user.click(screen.getByRole("button", { name: "초기화 이전 상태 복원" }));
    expect(confirm).toHaveBeenLastCalledWith(expect.stringMatching(/덮어써집니다/));
    expect(prompt()).toBe(EXPECTED);
    expect(screen.queryByRole("button", { name: "초기화 이전 상태 복원" })).toBeNull();
  });

  it("restoring when the current spec is empty needs no extra confirmation", async () => {
    const { user } = await setUp();
    await fillBasics(user);
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    await user.click(screen.getByRole("button", { name: "설정 초기화" }));
    await user.click(screen.getByRole("button", { name: "초기화 이전 상태 복원" }));
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(prompt()).toBe(EXPECTED);
  });

  it("importing a valid file replaces the spec", async () => {
    const { user } = await setUp();
    const json = exportSpecJson(buildSpec(core, [["subject.kind", single("vehicle")], ["style.preset", single("pixel_art")]]));
    await user.upload(screen.getByTestId("import-input"), new File([json], "spec.json", { type: "application/json" }));
    expect(await screen.findByText("명세를 가져왔습니다.")).toBeInTheDocument();
    expect(prompt()).toBe("Main subject: a vehicle. Visual style: pixel art.");
  });

  it("importing an invalid file shows errors and leaves the current spec unchanged", async () => {
    const { user } = await setUp();
    await fillBasics(user);
    await user.upload(screen.getByTestId("import-input"), new File(["{nope"], "bad.json", { type: "application/json" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/가져오기에 실패했습니다/);
    expect(screen.getByRole("alert")).toHaveTextContent(/올바른 JSON 파일이 아닙니다/);
    expect(prompt()).toBe(EXPECTED);
  });
});

describe("8. catalog extensibility (UI)", () => {
  it("new catalog attributes and sub-categories render and compile with no UI code changes", async () => {
    const user = userEvent.setup();
    render(<PrompterApp registry={extendedRegistry()} store={null} />);
    await user.click(within(field("x.palette")).getByRole("checkbox", { name: "Pastel" }));
    await user.click(within(field("x.palette")).getByRole("checkbox", { name: "Warm" }));
    expect(prompt()).toBe("Palette: warm tones, pastel colors.");

    expect(fieldFor("x.expression")).toBeNull();
    await user.click(within(field("subject.kind")).getByRole("radio", { name: "개" })); // child of "animal"
    expect(chipIds("composition.framing")).toContain("full_body"); // inherits animal context
    await user.click(within(field("subject.kind")).getByRole("radio", { name: "인물 (1인)" }));
    await user.click(within(field("x.expression")).getByRole("radio", { name: "Smiling" }));
    expect(prompt()).toContain("Facial expression: smiling.");
    expect(fieldFor("x.focal_length")).toBeNull(); // detailed tier is not shown in Basic
  });
});
