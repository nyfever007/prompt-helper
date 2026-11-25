// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { PrompterApp } from "@/components/PrompterApp";
import { createMemoryStore, getCoreRegistry, WORKSPACE_STORAGE_KEY } from "@/domain";

afterEach(() => cleanup());

/** Sprint 2-D.6 — Random Composer: generate from nothing, keep the user's values, regenerate, undo, edit anywhere. */
const core = getCoreRegistry();
const saved = (store: ReturnType<typeof createMemoryStore>) => JSON.parse(store.getItem(WORKSPACE_STORAGE_KEY) ?? "{}").spec?.selections ?? {};
const prompt = () => screen.queryByTestId("prompt-output")?.textContent ?? "";
const field = (id: string) => document.querySelector<HTMLElement>(`[data-attribute-id="${id}"]`)!;
const isRandom = (s: { source: string; origin?: { presetId: string } }) => s.source === "preset" && s.origin?.presetId === "random_composer";

const setUp = async () => {
  const user = userEvent.setup();
  const store = createMemoryStore();
  render(<PrompterApp registry={core} store={store} />);
  await waitFor(() => expect(screen.getByTestId("storage-status").textContent).not.toMatch(/불러오는 중/));
  await user.click(screen.getByRole("tab", { name: /Random/ }));
  return { user, store };
};

describe("Random Composer", () => {
  it("generates a whole design from nothing (Natural by default, Chaos on request); the five basics are optional; results show in sketches and the prompt", async () => {
    const { user, store } = await setUp();
    for (const id of ["person.identity.species", "person.identity.gender", "style.preset", "scene.setting", "person.appearance.direction"]) expect(screen.getByTestId(`basic-state-${id}`)).toHaveTextContent("랜덤");
    expect(screen.getByRole("radio", { name: "Natural" })).toBeChecked();
    await user.click(screen.getByTestId("random-generate"));
    const natural = saved(store);
    expect(Object.keys(natural).length).toBeGreaterThan(50);
    expect(Object.values(natural).every((x) => isRandom(x as never))).toBe(true);
    expect(screen.getByTestId("random-result")).toHaveTextContent("방식: Natural");
    // a random design opens as Balanced in the preview; omitted values are listed
    expect(within(screen.getByTestId("prompt-detail")).getByRole("radio", { name: "Balanced" })).toBeChecked();
    expect(screen.getByTestId("prompt-omitted")).toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: "Chaos" }));
    await user.click(screen.getByTestId("random-generate"));
    const s = saved(store);
    expect(Object.keys(s).length).toBeGreaterThan(150);
    expect(Object.values(s).every((x) => isRandom(x as never))).toBe(true);
    expect(prompt().length).toBeGreaterThan(300);
    expect(screen.getByTestId("random-result")).toHaveTextContent(/랜덤 값 \d+개를 정했습니다/);
    expect(screen.getByRole("img", { name: "얼굴 스케치" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "카메라 스케치" })).toBeInTheDocument();
    expect(screen.getByTestId("random-generate")).toHaveTextContent("다시 랜덤 생성");
  });

  it("keeps a basic the user picked and a value edited in Detailed; regenerates the rest; undo restores the previous run (Chaos)", async () => {
    const { user, store } = await setUp();
    await user.click(screen.getByRole("radio", { name: "Chaos" }));
    await user.click(within(field("person.identity.gender")).getByText("여성", { exact: true }).closest("label")!);
    expect(screen.getByTestId("basic-state-person.identity.gender")).toHaveTextContent("직접 설정");
    await user.click(screen.getByTestId("random-generate"));
    const first = saved(store);
    expect(first["person.identity.gender"]).toMatchObject({ source: "user", value: { optionId: "woman" } });
    expect(screen.getByTestId("random-person.identity.species")).toHaveTextContent("랜덤 생성"); // the field marks random values

    // edit one random value in Detailed → it becomes the user's
    await user.click(screen.getByRole("button", { name: "Detailed에서 편집" }));
    await user.click(within(screen.getByRole("navigation", { name: "카테고리" })).getByRole("treeitem", { name: "프레이밍 및 시점" }));
    // choose a value different from the random one (clicking the checked radio would not change anything)
    const target = first["camera.angle"]?.value.optionId === "worms_eye" ? { id: "eye_level", name: "눈높이" } : { id: "worms_eye", name: "웜즈아이 (바닥에서)" };
    await user.click(within(field("camera.angle")).getByRole("radio", { name: target.name }));
    await user.click(screen.getByRole("tab", { name: /Random/ }));
    await user.click(screen.getByTestId("random-generate"));
    const second = saved(store);
    expect(second["camera.angle"]).toMatchObject({ source: "user", value: { optionId: target.id } });
    expect(second["person.identity.gender"]).toEqual(first["person.identity.gender"]);
    const changed = Object.keys(first).filter((id) => isRandom(first[id]) && JSON.stringify(first[id]) !== JSON.stringify(second[id]));
    expect(changed.length).toBeGreaterThan(20);

    await user.click(screen.getByTestId("random-undo"));
    const undone = saved(store);
    expect(undone["camera.angle"]).toMatchObject({ source: "user" }); // the edit after the run is protected
    expect(Object.keys(undone).filter((id) => isRandom(undone[id])).length).toBeGreaterThan(100); // the first run is back
  });
});
