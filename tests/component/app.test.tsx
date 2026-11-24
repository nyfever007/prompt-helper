// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PrompterApp } from "@/components/PrompterApp";
import { createMemoryStore, exportSpecJson, getCoreRegistry, WORKSPACE_STORAGE_KEY } from "@/domain";
import { extendedRegistry } from "../fixtures/catalogs";
import { buildSpec, single } from "../fixtures/specs";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

const prompt = () => screen.getByTestId("prompt-output").textContent ?? "";
const tab = (name: RegExp) => screen.getByRole("tab", { name });
const fieldFor = (attributeId: string) => document.querySelector<HTMLElement>(`[data-attribute-id="${attributeId}"]`)!;

const setUp = async (store = createMemoryStore()) => {
  const user = userEvent.setup();
  const utils = render(<PrompterApp store={store} />);
  await waitFor(() => expect(screen.getByTestId("storage-status").textContent).not.toMatch(/불러오는 중|Loading/));
  return { user, store, ...utils };
};

const fillBasics = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole("radio", { name: "인물 (1인)" }));
  await user.click(screen.getByRole("radio", { name: "수채화" }));
  await user.type(screen.getByRole("textbox", { name: /이미지 설명/ }), "A quiet harbor");
};

const EXPECTED = "A quiet harbor. Main subject: a single person. Visual style: watercolor painting.";

describe("Basic mode", () => {
  it("renders three modes with Basic selected and an empty preview", async () => {
    await setUp();
    expect(screen.getAllByRole("tab")).toHaveLength(3);
    expect(tab(/Basic/)).toHaveAttribute("aria-selected", "true");
    expect(prompt()).toMatch(/아직 선택한 항목이 없습니다/);
    expect(screen.getByRole("button", { name: "프롬프트 복사" })).toBeDisabled();
  });

  it("selecting subject, style and free text updates the live preview", async () => {
    const { user } = await setUp();
    await fillBasics(user);
    expect(prompt()).toBe(EXPECTED);
    expect(fieldFor("subject.kind").dataset.state).toBe("set");
  });

  it("clear returns an attribute to unset and removes it from the prompt", async () => {
    const { user } = await setUp();
    await fillBasics(user);
    await user.click(within(fieldFor("style.visual")).getByRole("button", { name: /선택 해제/ }));
    expect(fieldFor("style.visual").dataset.state).toBe("unset");
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

  it("UI language switch changes labels but not the (English) prompt or spec", async () => {
    const { user } = await setUp();
    await fillBasics(user);
    await user.selectOptions(screen.getByRole("combobox"), "en");
    expect(screen.getByRole("radio", { name: "Person" })).toBeChecked();
    expect(prompt()).toBe(EXPECTED);
  });
});

describe("9. mode switching keeps settings", () => {
  it("Basic → Detailed → Precision → Basic preserves the same spec", async () => {
    const { user } = await setUp();
    await fillBasics(user);

    await user.click(tab(/Detailed/));
    expect(screen.getByText(/Detailed 모드는 후속 개발 예정/)).toBeInTheDocument();
    const summary = screen.getByRole("region", { name: "현재 공유 명세" });
    expect(within(summary).getByText("인물 (1인)")).toBeInTheDocument();
    expect(within(summary).getByText("수채화")).toBeInTheDocument();
    expect(within(summary).getByText("A quiet harbor")).toBeInTheDocument();
    expect(prompt()).toBe(EXPECTED);

    await user.click(tab(/Precision/));
    expect(screen.getByText(/Precision 모드는 후속 개발 예정/)).toBeInTheDocument();
    expect(prompt()).toBe(EXPECTED);

    await user.click(tab(/Basic/));
    expect(screen.getByRole("radio", { name: "인물 (1인)" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "수채화" })).toBeChecked();
    expect(screen.getByRole("textbox", { name: /이미지 설명/ })).toHaveValue("A quiet harbor");
    expect(prompt()).toBe(EXPECTED);
  });
});

describe("10. local save and restore (UI)", () => {
  it("restores the spec after a remount with the same store (= reload)", async () => {
    const store = createMemoryStore();
    const first = await setUp(store);
    await fillBasics(first.user);
    await waitFor(() => expect(screen.getByTestId("storage-status").textContent).toMatch(/로컬에 저장됨/));
    first.unmount();

    await setUp(store);
    expect(await screen.findByText("마지막 작업을 복원했습니다.")).toBeInTheDocument();
    expect(prompt()).toBe(EXPECTED);
    expect(screen.getByRole("radio", { name: "수채화" })).toBeChecked();
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

  it("corrupt saved data does not crash the app; it starts fresh and warns", async () => {
    const store = createMemoryStore({ [WORKSPACE_STORAGE_KEY]: "{broken" });
    await setUp(store);
    expect(screen.getByRole("alert")).toHaveTextContent(/복원할 수 없어/);
    expect(store.getItem(`${WORKSPACE_STORAGE_KEY}:corrupt-backup`)).toBe("{broken");
  });
});

describe("reset / import (UI)", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("reset asks for confirmation; cancel keeps everything, confirm unsets everything", async () => {
    const { user } = await setUp();
    await fillBasics(user);
    const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
    await user.click(screen.getByRole("button", { name: "설정 초기화" }));
    expect(prompt()).toBe(EXPECTED);
    await user.click(screen.getByRole("button", { name: "설정 초기화" }));
    expect(confirm).toHaveBeenCalledTimes(2);
    expect(prompt()).toMatch(/아직 선택한 항목이 없습니다/);
    for (const id of ["intent.description", "subject.kind", "style.visual"]) expect(fieldFor(id).dataset.state).toBe("unset");
  });

  it("importing a valid file replaces the spec", async () => {
    const { user } = await setUp();
    const json = exportSpecJson(
      buildSpec(getCoreRegistry(), [
        ["subject.kind", single("vehicle")],
        ["style.visual", single("pixel_art")],
      ]),
    );
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
  it("new catalog attributes render and compile with no UI code changes", async () => {
    const user = userEvent.setup();
    render(<PrompterApp registry={extendedRegistry()} store={null} />);

    // multi-select rendered from data
    await user.click(screen.getByRole("checkbox", { name: "Dramatic" }));
    await user.click(screen.getByRole("checkbox", { name: "Calm" }));
    expect(prompt()).toBe("Mood: calm, dramatic.");

    // suggested default is offered but not applied until clicked
    expect(fieldFor("output.aspect_ratio").dataset.state).toBe("unset");
    await user.click(within(fieldFor("output.aspect_ratio")).getByRole("button", { name: /권장 기본값 사용/ }));
    expect(fieldFor("output.aspect_ratio").dataset.state).toBe("set");
    expect(prompt()).toBe("Mood: calm, dramatic. Aspect ratio: square (1:1).");

    // conditional attribute appears only when applicable…
    expect(fieldFor("person.expression")).toBeNull();
    await user.click(screen.getByRole("radio", { name: "인물 (1인)" }));
    await user.click(screen.getByRole("radio", { name: "Smiling" }));
    expect(prompt()).toContain("Facial expression: smiling.");
    // …and is kept (with a note) when the subject changes
    await user.click(screen.getByRole("radio", { name: "풍경" }));
    expect(fieldFor("person.expression")).not.toBeNull();
    expect(within(fieldFor("person.expression")).getByText(/적용되지 않습니다/)).toBeInTheDocument();
    expect(prompt()).not.toContain("expression");

    // non-basic tiers are not shown in Basic
    expect(fieldFor("camera.focal_length")).toBeNull();
  });
});
