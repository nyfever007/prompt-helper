// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { PrompterApp } from "@/components/PrompterApp";
import { createMemoryStore, getCoreRegistry, WORKSPACE_STORAGE_KEY } from "@/domain";

afterEach(() => cleanup());

/** Sprint 2-D.2 — Face Builder and live slider previews in the Detailed editor (read-only views of the ImageSpec). */
const core = getCoreRegistry();
const field = (id: string) => document.querySelector<HTMLElement>(`[data-attribute-id="${id}"]`)!;
const prompt = () => screen.queryByTestId("prompt-output")?.textContent ?? "";
const builder = () => screen.getByTestId("face-builder");
const front = () => within(builder()).getByRole("img", { name: /^정면 스케치/ });
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

describe("Face Builder", () => {
  it("draws the current settings live; a slider redraws its preview and the face, storing only the slider's own value", async () => {
    const { store } = await open("눈");
    expect(front()).toHaveAccessibleName("정면 스케치 — 설정 0개 반영");
    expect(within(builder()).getByText(/저장되지 않고 프롬프트에도 추가되지 않습니다/)).toBeInTheDocument();
    const preview = screen.getByTestId("slider-preview-person.eyes.size");
    expect(within(preview).getByText("미설정 — 중립 형태 표시")).toBeInTheDocument();
    const [faceBefore, previewBefore] = [front().innerHTML, preview.innerHTML];
    expect(saved(store)).toEqual({}); // showing the sketch stores nothing

    fireEvent.change(within(field("person.eyes.size")).getByRole("slider"), { target: { value: "5" } });
    expect(front().innerHTML).not.toBe(faceBefore);
    expect(screen.getByTestId("slider-preview-person.eyes.size").innerHTML).not.toBe(previewBefore);
    expect(front()).toHaveAccessibleName("정면 스케치 — 설정 1개 반영");
    expect(Object.keys(saved(store))).toEqual(["person.eyes.size"]);
    expect(prompt()).toBe("Eye size: very large.");
  });

  it("a setting excluded from the prompt is not drawn and is listed; its link and the area buttons navigate", async () => {
    const { user } = await open("코");
    const empty = front().innerHTML;
    await user.click(within(field("person.nose.tip_shape")).getByRole("radio", { name: /^뾰족한/ }));
    expect(front().innerHTML).not.toBe(empty);
    await user.click(within(field("person.nose.tip_shape")).getByRole("switch", { name: /프롬프트에 포함/ }));
    expect(front().innerHTML).toBe(empty);
    const listed = screen.getByTestId("face-builder-excluded");
    expect(listed).toHaveTextContent("프롬프트에서 제외되어 그리지 않음: 코끝 모양");

    // a trait without a drawing is reported too
    await user.click(within(screen.getByRole("navigation", { name: "얼굴 영역" })).getByRole("button", { name: /^얼굴/ }));
    expect(screen.getByRole("heading", { level: 2, name: /^얼굴/ })).toBeInTheDocument();
    await user.click(within(field("person.face.cheekbones")).getByText("높은", { exact: true }).closest("label")!);
    expect(screen.getByTestId("face-builder-not-drawn")).toHaveTextContent("광대");
    await user.click(within(screen.getByTestId("face-builder-excluded")).getByRole("button", { name: "코끝 모양" }));
    expect(field("person.nose.tip_shape")).toHaveFocus();
  });

  it("card zoom buttons sit beside the label, not over the drawing", async () => {
    await open("입술");
    const card = field("person.lips.cupids_bow").querySelector<HTMLElement>('[data-option-id="deep"]')!;
    const zoom = within(card).getByRole("button", { name: "깊은 예시 크게 보기" });
    expect(zoom.closest(".card__media")).toBeNull();
    expect(zoom.closest(".card__foot")).not.toBeNull();
  });
});
