// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PrompterApp } from "@/components/PrompterApp";
import { createMemoryStore, getCoreRegistry, HISTORY_STORAGE_KEY, SNAPSHOTS_STORAGE_KEY, WORKSPACE_STORAGE_KEY } from "@/domain";

afterEach(() => cleanup());

/** Sprint 3.4 — Undo / Redo, the History panel and snapshots in the app. */
const core = getCoreRegistry();
const field = (id: string) => document.querySelector<HTMLElement>(`[data-attribute-id="${id}"]`)!;
const saved = (store: ReturnType<typeof createMemoryStore>) => JSON.parse(store.getItem(WORKSPACE_STORAGE_KEY) ?? "{}").spec?.selections ?? {};

const setUp = async (store = createMemoryStore()) => {
  const user = userEvent.setup();
  render(<PrompterApp registry={core} store={store} />);
  await waitFor(() => expect(screen.getByTestId("storage-status").textContent).not.toMatch(/불러오는 중/));
  return { user, store };
};
const pick = async (user: ReturnType<typeof userEvent.setup>, id: string, name: string) => user.click(within(field(id)).getByRole("radio", { name }));

describe("history", () => {
  it("undo / redo buttons and shortcuts step through edits; text fields keep their own undo", async () => {
    const { user, store } = await setUp();
    expect(screen.getByTestId("history-undo")).toBeDisabled();
    await pick(user, "style.preset", "수채화");
    await pick(user, "style.preset", "유화");
    await user.click(screen.getByTestId("history-undo"));
    expect(saved(store)["style.preset"].value.optionId).toBe("watercolor");
    await user.click(screen.getByTestId("history-redo"));
    expect(saved(store)["style.preset"].value.optionId).toBe("oil_painting");
    fireEvent.keyDown(document.body, { key: "z", ctrlKey: true });
    expect(saved(store)["style.preset"].value.optionId).toBe("watercolor");
    fireEvent.keyDown(document.body, { key: "z", metaKey: true, shiftKey: true });
    expect(saved(store)["style.preset"].value.optionId).toBe("oil_painting");
    fireEvent.keyDown(document.body, { key: "y", ctrlKey: true });
    expect(saved(store)["style.preset"].value.optionId).toBe("oil_painting"); // nothing to redo
    // inside a text field the shortcut is the field's own
    const text = screen.getByRole("textbox", { name: /이미지 설명/ });
    fireEvent.keyDown(text, { key: "z", ctrlKey: true });
    expect(saved(store)["style.preset"].value.optionId).toBe("oil_painting");
  });

  it("the History panel lists actions (time, kind, changed count) and restores a past state — locks included — as an undoable action", async () => {
    const { user, store } = await setUp();
    await pick(user, "style.preset", "수채화");
    await user.click(screen.getByTestId("lock-style.preset"));
    await user.click(screen.getByRole("tab", { name: /Random/ }));
    await user.click(screen.getByTestId("random-generate"));
    await user.click(screen.getByTestId("history-open"));
    const panel = screen.getByTestId("history-panel");
    const items = within(panel).getAllByRole("listitem").filter((li) => li.hasAttribute("data-history-id"));
    expect(items.map((li) => li.querySelector(".history-item__what")!.textContent)).toEqual(["랜덤 생성 (Natural)", "잠금", "이미지 스타일 변경", "작업 시작"]);
    expect(items[0]).toHaveTextContent("현재");
    expect(items[2]).toHaveTextContent("속성 1개 변경");
    // restore the state right after the first edit (before the lock and the random run)
    await user.click(within(items[2]!).getByRole("button", { name: /이미지 스타일 변경” 이후 상태로 복원/ }));
    expect(Object.keys(saved(store))).toEqual(["style.preset"]);
    expect(saved(store)["style.preset"].locked).toBeUndefined(); // the past state had no lock
    await user.click(screen.getByTestId("history-undo"));
    expect(Object.keys(saved(store)).length).toBeGreaterThan(50); // back to the random design
    expect(saved(store)["style.preset"].locked).toBe(true);
  });

  it("existing preset / random undo is recorded too; history and snapshots survive a reload; snapshots can be renamed, restored and deleted", async () => {
    const store = createMemoryStore();
    const { user } = await setUp(store);
    await pick(user, "style.preset", "수채화");
    await user.click(screen.getByRole("tab", { name: /Random/ }));
    await user.click(screen.getByTestId("random-generate"));
    await user.click(screen.getByTestId("random-undo")); // the existing undo of the last run
    await user.click(screen.getByTestId("history-open"));
    let panel = screen.getByTestId("history-panel");
    expect(within(panel).getAllByRole("listitem")[0]).toHaveTextContent("프리셋·랜덤 되돌리기");
    await user.type(within(panel).getByTestId("snapshot-name"), "Watercolor base");
    await user.click(within(panel).getByTestId("snapshot-save"));
    expect(JSON.parse(store.getItem(SNAPSHOTS_STORAGE_KEY)!).snapshots[0].name).toBe("Watercolor base");
    await user.click(within(panel).getByRole("button", { name: "닫기" }));
    await waitFor(() => expect(store.getItem(HISTORY_STORAGE_KEY)).not.toBeNull());

    // reload
    cleanup();
    const again = await setUp(store);
    await waitFor(() => expect(screen.getByTestId("history-undo")).toBeEnabled());
    await again.user.click(screen.getByTestId("history-open"));
    panel = screen.getByTestId("history-panel");
    expect(within(panel).getByText("Watercolor base")).toBeInTheDocument();
    await again.user.click(within(panel).getByRole("button", { name: "이름 변경: Watercolor base" }));
    const input = within(panel).getByTestId("snapshot-rename-input");
    await again.user.clear(input);
    await again.user.type(input, "Base{enter}");
    expect(JSON.parse(store.getItem(SNAPSHOTS_STORAGE_KEY)!).snapshots[0].name).toBe("Base");
    await again.user.click(within(screen.getByTestId("history-panel")).getByRole("button", { name: "닫기" }));

    // change the design, then restore the snapshot (one undoable action)
    await pick(again.user, "style.preset", "유화");
    await again.user.click(screen.getByTestId("history-open"));
    await again.user.click(within(screen.getByTestId("history-panel")).getByRole("button", { name: "복원: Base" }));
    expect(saved(store)["style.preset"].value.optionId).toBe("watercolor");
    await again.user.click(screen.getByTestId("history-undo"));
    expect(saved(store)["style.preset"].value.optionId).toBe("oil_painting");

    vi.spyOn(window, "confirm").mockReturnValue(true);
    await again.user.click(screen.getByTestId("history-open"));
    await again.user.click(within(screen.getByTestId("history-panel")).getByRole("button", { name: "삭제: Base" }));
    expect(store.getItem(SNAPSHOTS_STORAGE_KEY)).toBeNull();
  });
});
