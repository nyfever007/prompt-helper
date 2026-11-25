// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { PrompterApp } from "@/components/PrompterApp";
import { createMemoryStore, getCoreRegistry, WORKSPACE_STORAGE_KEY, type KeyValueStore } from "@/domain";

afterEach(() => cleanup());

/** Sprint 2-C.2 — category reset history (TD-09) and contradiction / convention diagnostics (TD-10) in the UI. */
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
  const resetPage = async (n: number) => {
    await user.click(screen.getByTestId("category-reset"));
    await user.click(within(screen.getByTestId("category-reset-dialog")).getByRole("button", { name: `${n}개 값 초기화` }));
  };
  return { user, store, go, resetPage };
};

describe("TD-09 reset history in the Detailed editor", () => {
  it("two resets: the latest is one click away, the earlier one is listed and restorable on its own; later edits are kept and reported", async () => {
    const { user, store, go, resetPage } = await open();
    await go("렌즈 및 원근감");
    await user.click(chip("camera.lens_type", "망원"));
    await go("주광");
    await user.click(chip("lighting.direction", "측광"));
    await user.click(chip("lighting.softness", "부드러운"));

    await go("렌즈 및 원근감");
    await resetPage(1);
    await go("주광");
    await resetPage(2);
    expect(saved(store)).toEqual({});

    const bar = screen.getByTestId("category-reset-bar");
    expect(bar).toHaveTextContent("‘주광’을(를) 초기화했습니다 (값 2개)");
    const history = within(bar).getByTestId("category-reset-history");
    expect(history).toHaveTextContent("이전 초기화 1개");
    await user.click(within(history).getByText("이전 초기화 1개"));
    expect(within(history).getByText(/‘렌즈 및 원근감’ — 값 1개/)).toBeInTheDocument();

    // After the resets the user sets the light direction again: that value wins on restore.
    await user.click(chip("lighting.direction", "역광"));
    expect(bar).toHaveTextContent("이후 1개 직접 수정 — 현재 값 유지");

    // Restore the OLDER reset (lens) first — the lighting reset stays available.
    await user.click(within(history).getByRole("button", { name: /‘렌즈 및 원근감’ 초기화 되돌리기/ }));
    expect(saved(store)["camera.lens_type"].value).toEqual({ kind: "single", optionId: "telephoto" });
    expect(screen.getByTestId("category-restore-notice")).toHaveTextContent("‘렌즈 및 원근감’의 값 1개를 복원했습니다.");
    expect(within(screen.getByTestId("category-reset-bar")).queryByTestId("category-reset-history")).toBeNull();

    await user.click(screen.getByRole("button", { name: "카테고리 초기화 되돌리기" }));
    expect(saved(store)["lighting.direction"].value).toEqual({ kind: "single", optionId: "back" }); // the later edit is kept
    expect(saved(store)["lighting.softness"].value).toEqual({ kind: "single", optionId: "soft" });
    expect(screen.getByTestId("category-restore-notice")).toHaveTextContent("초기화 후 직접 수정해서 현재 상태를 유지한 항목: 빛의 방향.");
    expect(screen.queryByTestId("category-reset-bar")).toBeNull();
    expect(prompt()).toBe("Lens: telephoto lens. Light direction: backlighting. Light quality: soft light.");
  });
});

describe("TD-10 diagnostics: meaning vs convention, related settings, non-blocking", () => {
  it("a slider contradiction shows a “의미 충돌” notice on both fields with the related setting and its page; the prompt keeps both values", async () => {
    const { user, go } = await open();
    await go("코");
    await user.click(chip("person.nose.shape", "들린 코"));
    fireEvent.change(within(field("person.nose.tip_angle")).getByRole("slider"), { target: { value: "2" } }); // slightly downward
    const notice = field("person.nose.shape").querySelector('[data-code="rule.nose-upturned-shape-vs-downward-tip"]')!;
    expect(notice).toHaveAttribute("data-basis", "contradiction");
    expect(notice).toHaveTextContent("의미 충돌");
    expect(notice).toHaveTextContent("선택된 코 모양(들린 코)과 코끝 각도(아래로) 설정의 표현이 서로 충돌할 수 있습니다.");
    expect(notice).toHaveTextContent("관련 설정: 코끝 각도 (코)");
    expect(field("person.nose.tip_angle").querySelector('[data-code="rule.nose-upturned-shape-vs-downward-tip"]')).toHaveTextContent("관련 설정: 코 전체 모양 (코)");
    expect(prompt()).toBe("Nose shape: upturned. Nasal tip angle: slightly downward-pointing.");
    expect(screen.queryByText(/출력이 차단/)).toBeNull();
  });

  it("a convention notice is labelled “관례와 다름” (info), in the field and in the preview notes", async () => {
    const { user, go } = await open();
    await go("렌즈 및 원근감");
    await user.click(chip("camera.lens_type", "망원"));
    await user.click(chip("camera.perspective", "과장된"));
    const notice = field("camera.lens_type").querySelector('[data-code="rule.camera-telephoto-vs-exaggerated-perspective"]')!;
    expect(notice).toHaveClass("diag--info");
    expect(notice).toHaveTextContent("관례와 다름");
    expect(notice).toHaveTextContent("일반적인 사진 촬영 관례와 다를 수 있습니다");
    expect(notice).toHaveTextContent("관련 설정: 원근감 (렌즈 및 원근감)");
    const preview = document.querySelector('.preview__notes [data-code="rule.camera-telephoto-vs-exaggerated-perspective"]')!;
    expect(preview).toHaveAttribute("data-basis", "convention");
    expect(prompt()).toBe("Lens: telephoto lens. Perspective: exaggerated perspective.");
  });
});
