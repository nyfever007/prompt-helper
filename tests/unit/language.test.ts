import { describe, expect, it } from "vitest";
import { compilePrompt, detectNonLatinScripts, exportSpecJson, getCoreRegistry, importSpecJson } from "@/domain";
import { buildSpec, single, text } from "../fixtures/specs";

const core = getCoreRegistry();

describe("language policy", () => {
  it("structured selections compile into English", () => {
    const c = compilePrompt(buildSpec(core, [["subject.kind", single("person")], ["scene.setting", single("cafe")], ["lighting.preset", single("golden_hour")]]), core);
    expect(detectNonLatinScripts(c.prompt)).toEqual([]);
    expect(c.diagnostics.map((d) => d.code)).not.toContain("prompt.mixed_language");
  });

  it("Korean free text is preserved exactly, passed through untranslated, and flagged", () => {
    const raw = "비 오는 카페 창가에서  책을 읽는 사람";
    const spec = buildSpec(core, [["intent.description", text(raw)], ["style.preset", single("watercolor")]]);
    const c = compilePrompt(spec, core);
    expect(c.prompt).toBe("비 오는 카페 창가에서 책을 읽는 사람. Visual style: watercolor painting.");
    const d = c.diagnostics.find((x) => x.code === "prompt.mixed_language")!;
    expect(d.severity).toBe("warning");
    expect(d.attributeId).toBe("intent.description");
    expect(d.params?.scripts).toBe("Hangul");
    // the stored spec keeps the exact original (double space included)
    expect(spec.selections["intent.description"]!.value).toEqual({ kind: "text", text: raw });
    const r = importSpecJson(exportSpecJson(spec), core);
    expect(r.status === "valid" && r.spec.selections["intent.description"]!.value).toEqual({ kind: "text", text: raw });
  });

  it.each([
    ["日本の桜", ["Han", "Hiragana"]],
    ["カフェ", ["Katakana"]],
    ["кофейня", ["Cyrillic"]],
    ["café crème brûlée, Ærøskøbing", []],
    ["plain English", []],
  ])("script detection: %s", (input, scripts) => {
    expect(detectNonLatinScripts(input)).toEqual(scripts);
  });
});
