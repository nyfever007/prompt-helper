import { describe, expect, it } from "vitest";
import {
  applySelection,
  clearSelection,
  compilePrompt,
  createEmptySpec,
  exportSpecJson,
  getCoreRegistry,
  importSpecJson,
  isSet,
} from "@/domain";
import { extendedRegistry } from "../fixtures/catalogs";
import { buildSpec, single, text } from "../fixtures/specs";

const core = getCoreRegistry();

describe("2. unset state is preserved", () => {
  it("a new spec has every attribute unset and compiles to an empty prompt", () => {
    const spec = createEmptySpec(core);
    for (const a of core.attributes()) expect(isSet(spec, a.id)).toBe(false);
    const c = compilePrompt(spec, core);
    expect(c.prompt).toBe("");
    expect(c.fragments).toEqual([]);
    expect(c.diagnostics.map((d) => d.code)).toContain("compiler.empty");
  });

  it("setting one attribute leaves all others unset (no implicit fill-in)", () => {
    const spec = buildSpec(core, [["subject.kind", single("person")]]);
    expect(Object.keys(spec.selections)).toEqual(["subject.kind"]);
    expect(compilePrompt(spec, core).prompt).toBe("Main subject: a single person.");
  });

  it("clearing returns to unset by removing the key (not null/empty/default)", () => {
    const set = buildSpec(core, [["style.visual", single("photography")]]);
    const cleared = clearSelection(set, "style.visual");
    expect("style.visual" in cleared.selections).toBe(false);
    expect(cleared).toEqual(createEmptySpec(core));
  });

  it("blank free text is treated as unset, not as an empty selection", () => {
    const spec = buildSpec(core, [["intent.description", text("hello")]]);
    const r = applySelection(spec, core, "intent.description", { kind: "text", text: "  \n " });
    expect(r.ok && isSet(r.value, "intent.description")).toBe(false);
  });

  it("unset survives export/import", () => {
    const spec = buildSpec(core, [["style.visual", single("watercolor")]]);
    const r = importSpecJson(exportSpecJson(spec), core);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(isSet(r.value, "subject.kind")).toBe(false);
      expect(isSet(r.value, "intent.description")).toBe(false);
    }
  });
});

describe("3. explicit default vs unset", () => {
  const reg = extendedRegistry(); // output.aspect_ratio has a suggested default "square"

  it("catalog defaults are never applied implicitly", () => {
    const spec = createEmptySpec(reg);
    expect(isSet(spec, "output.aspect_ratio")).toBe(false);
    expect(compilePrompt(spec, reg).prompt).not.toContain("Aspect ratio");
  });

  it("explicitly choosing the default value is a real, distinguishable selection", () => {
    const unset = createEmptySpec(reg);
    const explicit = buildSpec(reg, [["output.aspect_ratio", reg.getAttribute("output.aspect_ratio")!.defaultValue!]]);
    expect(isSet(explicit, "output.aspect_ratio")).toBe(true);
    expect(explicit.selections["output.aspect_ratio"]).toEqual({ value: { kind: "single", optionId: "square" }, source: "user" });
    expect(exportSpecJson(explicit)).not.toBe(exportSpecJson(unset));
    expect(compilePrompt(explicit, reg).prompt).toBe("Aspect ratio: square (1:1).");
    expect(compilePrompt(unset, reg).prompt).toBe("");
  });

  it("explicit default round-trips and clearing it returns to unset, not to the default", () => {
    const explicit = buildSpec(reg, [["output.aspect_ratio", single("square")]]);
    const r = importSpecJson(exportSpecJson(explicit), reg);
    expect(r.ok && r.value.selections["output.aspect_ratio"]).toEqual(explicit.selections["output.aspect_ratio"]);
    const cleared = clearSelection(explicit, "output.aspect_ratio");
    expect(isSet(cleared, "output.aspect_ratio")).toBe(false);
  });
});
