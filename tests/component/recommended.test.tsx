// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { PrompterApp } from "@/components/PrompterApp";
import { createMemoryStore, getCoreRegistry, WORKSPACE_STORAGE_KEY } from "@/domain";

afterEach(() => cleanup());

/** Sprint 2-D.5 — Recommended mode: concept cards → confirm (keeping the user's values) → apply → edit / undo. */
const core = getCoreRegistry();
const saved = (store: ReturnType<typeof createMemoryStore>) => JSON.parse(store.getItem(WORKSPACE_STORAGE_KEY) ?? "{}").spec?.selections ?? {};
const prompt = () => screen.queryByTestId("prompt-output")?.textContent ?? "";

const setUp = async () => {
  const user = userEvent.setup();
  const store = createMemoryStore();
  render(<PrompterApp registry={core} store={store} />);
  await waitFor(() => expect(screen.getByTestId("storage-status").textContent).not.toMatch(/불러오는 중/));
  return { user, store };
};

describe("Recommended mode", () => {
  it("shows 12 concepts with a description, a sketch and the main suggested settings", async () => {
    const { user } = await setUp();
    await user.click(screen.getByRole("tab", { name: /Recommended/ }));
    const cards = document.querySelectorAll("li.concept");
    expect(cards).toHaveLength(12);
    const film = document.querySelector<HTMLElement>('[data-preset-id="concept_vintage_film"]')!;
    expect(within(film).getByRole("heading", { name: /빈티지 감성/ })).toBeInTheDocument();
    expect(within(film).getByRole("img", { name: "빈티지 감성: 추천 카메라·조명 스케치" })).toBeInTheDocument();
    expect(within(film).getByText("필름 사진")).toBeInTheDocument(); // a key setting, as its option label
    expect(within(film).getByRole("button", { name: "변경 내용 확인 후 적용: 빈티지 감성" })).toBeInTheDocument();
  });

  it("applies a concept after confirmation, keeping a value the user set; it can be undone and then edited in Detailed", async () => {
    const { user, store } = await setUp();
    await user.click(within(document.querySelector<HTMLElement>('[data-attribute-id="mood.tone"]')!).getByText("아늑한", { exact: true }).closest("label")!);
    await user.click(screen.getByRole("tab", { name: /Recommended/ }));
    await user.click(screen.getByRole("button", { name: "변경 내용 확인 후 적용: 빈티지 감성" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("직접 설정한 값 1개는 그대로 유지됩니다(기본).")).toBeInTheDocument();
    expect(within(dialog).getByTestId("kept-by-default")).toHaveTextContent("기본으로 유지");
    expect(saved(store)["style.preset"]).toBeUndefined(); // nothing is written before confirming
    await user.click(within(dialog).getByRole("button", { name: "직접 설정한 값은 유지하고 적용" }));

    const s = saved(store);
    expect(s["mood.tone"]).toMatchObject({ source: "user", value: { kind: "multi", optionIds: ["cozy"] } });
    expect(s["style.preset"]).toMatchObject({ source: "preset", value: { kind: "single", optionId: "film_photography" }, origin: { presetId: "concept_vintage_film" } });
    expect(prompt()).toMatch(/film/i);
    expect(screen.getByTestId("concept-bar")).toHaveTextContent("마지막 콘셉트: 빈티지 감성");
    expect(document.querySelector('[data-preset-id="concept_vintage_film"]')).toHaveAttribute("data-applied", "true");

    await user.click(within(screen.getByTestId("concept-bar")).getByRole("button", { name: "되돌리기" }));
    expect(Object.keys(saved(store))).toEqual(["mood.tone"]);

    await user.click(screen.getByRole("button", { name: "변경 내용 확인 후 적용: 빈티지 감성" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "직접 설정한 값은 유지하고 적용" }));
    await user.click(within(screen.getByTestId("concept-bar")).getByRole("button", { name: "Detailed에서 편집" }));
    expect(screen.getByRole("tab", { name: /Detailed/ })).toHaveAttribute("aria-selected", "true");
  });
});
