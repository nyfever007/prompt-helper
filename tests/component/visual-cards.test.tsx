// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { PrompterApp } from "@/components/PrompterApp";
import { createMemoryStore, getCoreRegistry, WORKSPACE_STORAGE_KEY } from "@/domain";

afterEach(() => cleanup());

/** Sprint 2-D.1 — visual choice cards (face, eye and eyebrow shape) in the Detailed editor. */
const core = getCoreRegistry();
const field = (id: string) => document.querySelector<HTMLElement>(`[data-attribute-id="${id}"]`)!;
const prompt = () => screen.queryByTestId("prompt-output")?.textContent ?? "";

const open = async () => {
  const user = userEvent.setup();
  const store = createMemoryStore();
  render(<PrompterApp registry={core} store={store} />);
  await waitFor(() => expect(screen.getByTestId("storage-status").textContent).not.toMatch(/불러오는 중/));
  await user.click(screen.getByRole("tab", { name: /Detailed/ }));
  await user.click(within(screen.getByRole("navigation", { name: "카테고리" })).getByRole("treeitem", { name: "얼굴" }));
  return { user, store };
};

describe("visual choice cards", () => {
  it("show lazily loaded line art with Korean + English labels; choosing a card stores the same value and outputs the same phrase", async () => {
    const { user, store } = await open();
    const f = field("person.face.shape");
    const imgs = within(f).getAllByRole("img");
    expect(imgs).toHaveLength(8);
    expect(imgs[0]).toHaveAttribute("loading", "lazy");
    expect(imgs.map((i) => i.getAttribute("src"))).toContain("/visual/person/face-shape/oval.svg");
    expect(within(f).getByRole("img", { name: "계란형 얼굴형 선화" })).toBeInTheDocument();
    expect(within(f).getByText("Oval")).toBeInTheDocument();
    await user.click(within(f).getByRole("radio", { name: /^계란형/ }));
    expect(prompt()).toBe("Face shape: oval.");
    expect(JSON.parse(store.getItem(WORKSPACE_STORAGE_KEY)!).spec.selections["person.face.shape"].value).toEqual({ kind: "single", optionId: "oval" });
    // selection is shown with a ✓ badge too (not colour alone)
    expect(f.querySelector('[data-option-id="oval"] .card__check')).not.toBeNull();
    expect(f.querySelector('[data-option-id="round"] .card__check')).toBeNull();
  });

  it("each example opens in an accessible dialog named after the option; Escape returns focus", async () => {
    const { user } = await open();
    const zoom = within(field("person.face.shape")).getByRole("button", { name: "하트형 예시 크게 보기" });
    await user.click(zoom);
    const dlg = screen.getByRole("dialog", { name: "하트형" });
    expect(within(dlg).getByRole("img")).toHaveAttribute("src", "/visual/person/face-shape/heart.svg");
    expect(dlg).toHaveTextContent("Heart-shaped");
    await user.keyboard("{Escape}");
    expect(document.activeElement).toBe(zoom);
  });

  it("an image that fails to load leaves a working text card", async () => {
    const { user } = await open();
    const f = field("person.face.shape");
    fireEvent.error(within(f).getByRole("img", { name: "둥근형 얼굴형 선화" }));
    expect(within(f).queryByRole("img", { name: "둥근형 얼굴형 선화" })).toBeNull();
    await user.click(within(f).getByRole("radio", { name: /^둥근형/ }));
    expect(prompt()).toBe("Face shape: round.");
  });
});
