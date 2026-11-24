// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { PrompterApp } from "@/components/PrompterApp";
import { createMemoryStore, getCoreRegistry, WORKSPACE_STORAGE_KEY, type KeyValueStore } from "@/domain";

afterEach(() => cleanup());

const core = getCoreRegistry();
const prompt = () => screen.queryByTestId("prompt-output")?.textContent ?? "";
const field = (id: string) => document.querySelector<HTMLElement>(`[data-attribute-id="${id}"]`)!;
const nav = () => screen.getByRole("navigation", { name: "카테고리" });
const saved = (store: KeyValueStore) => JSON.parse(store.getItem(WORKSPACE_STORAGE_KEY) ?? "{}").spec?.selections ?? {};
const chip = (id: string, label: string) => within(field(id)).getByText(label, { exact: true }).closest("label")!;

const open = async (store: KeyValueStore = createMemoryStore()) => {
  const user = userEvent.setup();
  render(<PrompterApp registry={core} store={store} />);
  await waitFor(() => expect(screen.getByTestId("storage-status").textContent).not.toMatch(/불러오는 중/));
  await user.click(screen.getByRole("tab", { name: /Detailed/ }));
  const go = async (label: string) => user.click(within(nav()).getByRole("treeitem", { name: label }));
  return { user, store, go };
};

describe("body area in the Detailed editor", () => {
  it("shows 신체 with its 7 subcategories and the approved attribute counts", async () => {
    const { go } = await open();
    await go("신체");
    expect(screen.queryByTestId("draft-placeholder")).toBeNull();
    for (const [label, n] of [["전체 신체", 8], ["신체 비율", 5], ["목·어깨", 5], ["몸통", 9], ["엉덩이·골반", 4], ["팔·손", 7], ["다리·발", 7]] as const) {
      await go(label);
      expect(document.querySelectorAll(".cat-panel .attribute-list > [data-attribute-id]"), label).toHaveLength(n);
    }
  });

  it("relative sliders show band labels only; the heads-tall slider shows its value and stores nothing until moved", async () => {
    const { go, store } = await open();
    await go("신체 비율");
    const heads = within(field("person.body.heads_tall")).getByRole("slider");
    expect(heads).toHaveAttribute("aria-valuetext", "미설정");
    heads.focus();
    await waitFor(() => expect(screen.getByTestId("storage-status").textContent).toMatch(/로컬에 저장됨/));
    expect(saved(store)["person.body.heads_tall"]).toBeUndefined();
    fireEvent.change(heads, { target: { value: "8" } });
    expect(screen.getByTestId("slider-value-person.body.heads_tall")).toHaveTextContent("8 heads tall");
    fireEvent.change(within(field("person.body.head_size")).getByRole("slider"), { target: { value: "4" } });
    expect(screen.getByTestId("slider-value-person.body.head_size")).toHaveTextContent(/^큼$/);
    expect(prompt()).toBe("Head size relative to body: large. Head-to-body proportions: 8 heads tall.");
    expect(saved(store)["person.body.heads_tall"].value).toEqual({ kind: "number", value: 8 });
  });

  it("the overall build sets nothing else; resetting 신체 clears all its subcategories and can be undone", async () => {
    const { user, go, store } = await open();
    await go("전체 신체");
    await user.click(chip("person.body.build", "운동형"));
    expect(Object.keys(saved(store))).toEqual(["person.body.build"]);
    await go("다리·발");
    await user.click(chip("person.body.leg_alignment", "곧은 다리"));
    await go("신체");
    await user.click(screen.getByTestId("category-reset"));
    await user.click(within(screen.getByTestId("category-reset-dialog")).getByRole("button", { name: "2개 값 초기화" }));
    expect(saved(store)).toEqual({});
    await user.click(screen.getByRole("button", { name: "카테고리 초기화 되돌리기" }));
    expect(Object.keys(saved(store)).sort()).toEqual(["person.body.build", "person.body.leg_alignment"]);
    expect(prompt()).toBe("Body build: athletic. Leg alignment: straight.");
  });
});
