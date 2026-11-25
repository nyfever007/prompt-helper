// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { PrompterApp } from "@/components/PrompterApp";
import { createMemoryStore, getCoreRegistry, WORKSPACE_STORAGE_KEY, type KeyValueStore } from "@/domain";

afterEach(() => cleanup());

/** Sprint 2-C.3 — appearance-direction scope (TD-14) and the age requirement for sexual appeal (TD-15) in the UI. */
const core = getCoreRegistry();
const AD = "person.appearance.direction";
const prompt = () => screen.queryByTestId("prompt-output")?.textContent ?? "";
const field = (id: string) => document.querySelector<HTMLElement>(`[data-attribute-id="${id}"]`);
const nav = () => screen.getByRole("navigation", { name: "카테고리" });
const saved = (store: KeyValueStore) => JSON.parse(store.getItem(WORKSPACE_STORAGE_KEY) ?? "{}").spec?.selections ?? {};

const open = async (store: KeyValueStore = createMemoryStore()) => {
  const user = userEvent.setup();
  render(<PrompterApp registry={core} store={store} />);
  await waitFor(() => expect(screen.getByTestId("storage-status").textContent).not.toMatch(/불러오는 중/));
  const go = async (label: string) => user.click(within(nav()).getByRole("treeitem", { name: label }));
  return { user, store, go };
};

describe("TD-14: person settings start without choosing a subject", () => {
  it("Detailed: the appearance direction is editable and output with no subject; no subject is set or added; Basic then shows the value", async () => {
    const { user, store, go } = await open();
    await user.click(screen.getByRole("tab", { name: /Detailed/ }));
    await go("인상 및 매력");
    expect(field(AD)!.dataset.active).toBe("true");
    await user.click(within(field(AD)!).getByRole("checkbox", { name: /^아름다운/ }));
    expect(prompt()).toBe("Appearance direction: beautiful."); // no invented “Main subject” sentence
    expect(Object.keys(saved(store))).toEqual([AD]); // the subject was not set automatically
    await user.click(screen.getByRole("tab", { name: /Basic/ }));
    expect(within(field(AD)!).getByRole("checkbox", { name: /^아름다운/ })).toBeChecked(); // a set value is shown in Basic
  });

  it("Basic keeps its guided flow: with no subject and no value the appearance direction waits for a person", async () => {
    const { user } = await open();
    expect(field(AD)).toBeNull();
    await user.click(within(field("subject.kind")!).getByRole("radio", { name: "인물 (1인)" }));
    expect(field(AD)).not.toBeNull();
    await user.click(within(field("subject.kind")!).getByRole("radio", { name: "여러 사람" }));
    expect(field(AD)).toBeNull(); // groups are not extended this sprint
  });

  it("an explicit non-person subject keeps the value but does not output it (notice); choosing a person again restores it", async () => {
    const { user, store, go } = await open();
    await user.click(screen.getByRole("tab", { name: /Detailed/ }));
    await go("인상 및 매력");
    await user.click(within(field(AD)!).getByRole("checkbox", { name: /^우아한/ }));
    await go("기본");
    await user.click(within(field("subject.kind")!).getByRole("radio", { name: "풍경" }));
    expect(prompt()).toBe("Main subject: a landscape.");
    await go("인상 및 매력");
    expect(within(field(AD)!).getByText(/현재 선택에는 적용되지 않습니다/)).toBeInTheDocument();
    expect(saved(store)[AD]).toBeDefined();
    await go("기본");
    await user.click(within(field("subject.kind")!).getByRole("radio", { name: "인물 (1인)" }));
    expect(prompt()).toBe("Main subject: a single person. Appearance direction: elegant.");
  });
});

describe("TD-15: sexual appeal waits for a set adult age; general appearance never does", () => {
  it("“섹시한” without an age: output withheld with an explanation on the field; “go to setting” opens the age; an adult age releases it", async () => {
    const { user, go, store } = await open();
    await user.click(screen.getByRole("tab", { name: /Detailed/ }));
    await go("인상 및 매력");
    await user.click(within(field(AD)!).getByRole("checkbox", { name: /^아름다운/ }));
    expect(screen.queryByTestId("prompt-blocked")).toBeNull(); // general appearance: no age needed
    await user.click(within(field(AD)!).getByRole("checkbox", { name: /^섹시한/ }));
    expect(screen.getByTestId("prompt-blocked")).toHaveTextContent("성인 연령 정보를 명확하게 설정해야 합니다");
    expect(screen.queryByTestId("prompt-output")).toBeNull();
    const notice = field(AD)!.querySelector('[data-code="safety.appeal-age-unconfirmed"]')!;
    expect(notice).toHaveTextContent("관련 설정: 연령대 (연령), 외형적 연령 (연령), 실제 연령 (연령)");
    expect(within(notice as HTMLElement).queryByRole("button", { name: /해제/ })).toBeNull(); // no “release” switch, no auto-fix
    await user.click(within(notice as HTMLElement).getByRole("button", { name: "외형적 연령 (연령) — 이 설정으로 이동" }));
    expect(screen.getByRole("heading", { level: 2, name: "연령" })).toBeInTheDocument();
    expect(document.activeElement).toBe(field("person.identity.apparent_age"));
    expect(Object.keys(saved(store))).toEqual([AD]); // navigation never sets an age
    await user.selectOptions(within(field("person.identity.age_group")!).getByRole("combobox"), "middle_aged");
    expect(screen.queryByTestId("prompt-blocked")).toBeNull();
    expect(prompt()).toBe("Appearance direction: beautiful, sexy. Age group: middle-aged adult.");
    // a minor age blocks it again (minor protection, unchanged)
    await user.selectOptions(within(field("person.identity.age_group")!).getByRole("combobox"), "adolescent");
    expect(screen.getByTestId("prompt-blocked")).toHaveTextContent("미성년자");
  });
});
