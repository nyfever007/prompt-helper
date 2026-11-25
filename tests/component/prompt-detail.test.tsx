// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PrompterApp } from "@/components/PrompterApp";
import { createMemoryStore, getCoreRegistry, WORKSPACE_STORAGE_KEY } from "@/domain";
import { UI_PREFS_KEY } from "@/state/useUiPrefs";

afterEach(() => cleanup());

/** Sprint 2-D.7 — prompt detail (Compact / Balanced / Full) and length / cost in the preview. */
const core = getCoreRegistry();
const prompt = () => screen.getByTestId("prompt-output").textContent ?? "";
const field = (id: string) => document.querySelector<HTMLElement>(`[data-attribute-id="${id}"]`)!;
const detail = (name: string) => within(screen.getByTestId("prompt-detail")).getByRole("radio", { name });

const setUp = async () => {
  const user = userEvent.setup();
  const store = createMemoryStore();
  render(<PrompterApp registry={core} store={store} />);
  await waitFor(() => expect(screen.getByTestId("storage-status").textContent).not.toMatch(/불러오는 중/));
  return { user, store };
};

describe("prompt detail", () => {
  it("an existing (user-made) design stays Full; Compact shortens the text, lists what was left out, and never changes the saved design", async () => {
    const { user, store } = await setUp();
    await user.click(within(field("subject.kind")).getByRole("radio", { name: "인물 (1인)" }));
    await user.click(within(field("style.preset")).getByRole("radio", { name: "수채화" }));
    expect(detail("Full")).toBeChecked();
    const full = prompt();

    // a random design around the user's values, then Compact
    await user.click(screen.getByRole("tab", { name: /Random/ }));
    await user.click(screen.getByRole("radio", { name: "Chaos" }));
    await user.click(screen.getByTestId("random-generate"));
    expect(detail("Balanced")).toBeChecked(); // default for a design with random values
    const balanced = prompt();
    const before = store.getItem(WORKSPACE_STORAGE_KEY);
    await user.click(detail("Compact"));
    const compact = prompt();
    expect(compact.length).toBeLessThan(balanced.length);
    expect(compact).toContain("Main subject: a single person.");
    expect(compact).toContain("Visual style: watercolor painting.");
    expect(full).toContain("Visual style: watercolor painting.");
    expect(within(screen.getByTestId("prompt-omitted")).getAllByRole("listitem").length).toBeGreaterThan(50);
    expect(JSON.parse(store.getItem(WORKSPACE_STORAGE_KEY)!).spec).toEqual(JSON.parse(before!).spec); // design unchanged
    expect(JSON.parse(store.getItem(UI_PREFS_KEY)!).promptDetail).toBe("compact"); // a view preference

    // copy uses the prompt shown
    const writeText = vi.spyOn(navigator.clipboard, "writeText");
    await user.click(screen.getByRole("button", { name: "프롬프트 복사" }));
    expect(writeText).toHaveBeenCalledWith(compact);
    await user.click(detail("Full"));
    expect(prompt().length).toBeGreaterThan(balanced.length);
    expect(screen.queryByTestId("prompt-omitted")).toBeNull();
  });

  it("shows set and output attribute counts, characters, tokens counted locally and the text-input cost; unknown prices are entered by the user", async () => {
    const { user } = await setUp();
    await user.click(within(field("subject.kind")).getByRole("radio", { name: "인물 (1인)" }));
    await user.click(within(field("style.preset")).getByRole("radio", { name: "수채화" }));
    expect(screen.getByTestId("stat-attributes")).toHaveTextContent("2");
    expect(screen.getByTestId("stat-output")).toHaveTextContent("2");
    expect(screen.getByTestId("stat-chars")).toHaveTextContent(String(prompt().length));
    await waitFor(() => expect(screen.getByTestId("stat-tokens")).toHaveTextContent("로컬 계산 (o200k_base)"), { timeout: 4000 });
    expect(screen.getByTestId("stat-tokens").textContent).not.toMatch(/≈/);
    expect(screen.getByTestId("stat-cost").textContent).toMatch(/^\$0\.0000\d+/);
    expect(screen.getByTestId("price-source")).toHaveTextContent("공개 가격, 2026-11-25 확인");
    expect(screen.getByText(/이미지 생성\(출력 이미지·이미지 입력\) 비용은 별도이며 포함하지 않습니다/)).toBeInTheDocument();

    // a model without a confirmed price and without a local tokenizer
    await user.selectOptions(screen.getByTestId("token-model"), "gemini-image");
    expect(screen.getByTestId("stat-cost")).toHaveTextContent("—");
    expect(screen.getByTestId("no-price")).toBeInTheDocument();
    expect(screen.getByTestId("stat-tokens")).toHaveTextContent(/≈.*추정/);
    await user.type(screen.getByTestId("token-price"), "0.3");
    expect(screen.getByTestId("stat-cost").textContent).toMatch(/^≈ \$\d/);
    expect(screen.getByTestId("price-source")).toHaveTextContent("직접 입력한 가격");
  });

  it("a blocked design shows no prompt and counts nothing at every level", async () => {
    const { user } = await setUp();
    await user.click(screen.getByRole("tab", { name: /Detailed/ }));
    await user.click(screen.getByRole("tab", { name: /Basic/ }));
    await user.click(within(field("subject.kind")).getByRole("radio", { name: "인물 (1인)" }));
    await user.click(within(field("person.appearance.direction")).getByText("섹시한", { exact: true }).closest("label")!);
    for (const name of ["Compact", "Balanced", "Full"]) {
      await user.click(detail(name));
      expect(screen.getByTestId("prompt-blocked")).toBeInTheDocument();
      expect(screen.queryByTestId("prompt-output")).toBeNull();
      expect(screen.getByTestId("stat-chars")).toHaveTextContent("0");
    }
  });
});
