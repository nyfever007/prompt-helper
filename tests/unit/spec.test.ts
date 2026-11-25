import { describe, expect, it } from "vitest";
import {
  createEmptySpec,
  getCoreRegistry,
  IMAGE_SPEC_KIND,
  IMAGE_SPEC_SCHEMA_VERSION,
  parseImageSpec,
  validateImageSpec,
  type SelectionValue,
} from "@/domain";
import { extendedRegistry, mulberry32, sampleValues } from "../fixtures/catalogs";
import { buildSpec, buildSpecByFold, single, text } from "../fixtures/specs";

const core = getCoreRegistry();

describe("1. ImageSpec creation and validation", () => {
  it("creates an empty, versioned spec bound to the catalog", () => {
    const spec = createEmptySpec(core);
    expect(spec).toEqual({
      kind: IMAGE_SPEC_KIND,
      schemaVersion: IMAGE_SPEC_SCHEMA_VERSION,
      task: "text-to-image",
      catalog: { id: "prompter.core", version: "0.15.0" },
      selections: {},
    });
    expect(validateImageSpec(spec, core).ok).toBe(true);
  });

  it("accepts a spec with explicit selections, source and priority", () => {
    const spec = buildSpec(core, [["subject.kind", single("person")]]);
    const withPriority = {
      ...spec,
      selections: { ...spec.selections, "subject.kind": { ...spec.selections["subject.kind"]!, priority: 4 } },
    };
    const r = validateImageSpec(withPriority, core);
    expect(r.ok).toBe(true);
  });

  it("rejects structural problems with diagnostics (never throws)", () => {
    const base = createEmptySpec(core);
    const cases: unknown[] = [
      { ...base, extra: true },
      { ...base, task: "image-to-image" },
      { ...base, catalog: { id: "prompter.core", version: "v1" } },
      { ...base, selections: { "Bad Id": { value: { kind: "text", text: "x" }, source: "user" } } },
      { ...base, selections: { "subject.kind": { value: { kind: "single", optionId: "person" }, source: "robot" } } },
      { ...base, selections: { "subject.kind": { value: { kind: "single", optionId: "person" }, source: "user", priority: 9 } } },
      { ...base, selections: { "intent.description": { value: { kind: "text", text: "   " }, source: "user" } } },
      { ...base, selections: { "subject.kind": { value: { kind: "single" }, source: "user" } } },
    ];
    for (const c of cases) {
      const r = parseImageSpec(c);
      expect(r.ok, JSON.stringify(c)).toBe(false);
      expect(r.diagnostics.length).toBeGreaterThan(0);
      expect(r.diagnostics.every((d) => d.severity === "error")).toBe(true);
    }
  });

  it("rejects semantic problems against the catalog", () => {
    const base = createEmptySpec(core);
    const unknownAttr = { ...base, selections: { "person.hair": { value: { kind: "text", text: "x" }, source: "user" } } };
    const unknownOption = { ...base, selections: { "subject.kind": { value: { kind: "single", optionId: "dragon" }, source: "user" } } };
    const kindMismatch = { ...base, selections: { "subject.kind": { value: { kind: "text", text: "person" }, source: "user" } } };
    expect(validateImageSpec(unknownAttr, core).diagnostics.map((d) => d.code)).toContain("selection.unknown_attribute");
    expect(validateImageSpec(unknownOption, core).diagnostics.map((d) => d.code)).toContain("value.unknown_option");
    expect(validateImageSpec(kindMismatch, core).diagnostics.map((d) => d.code)).toContain("value.kind_mismatch");
  });

  it("text longer than the attribute maxLength is rejected", () => {
    const base = createEmptySpec(core);
    const long = { ...base, selections: { "intent.description": { value: { kind: "text", text: "a".repeat(2001) }, source: "user" } } };
    expect(validateImageSpec(long, core).diagnostics.map((d) => d.code)).toContain("value.text_too_long");
    expect(validateImageSpec(buildSpec(core, [["intent.description", text("a".repeat(2000))]]), core).ok).toBe(true);
  });
});

describe("test fixture: buildSpec equals folding applySelection (TD-11)", () => {
  it("same selections and key order for random specs, re-set attributes and cleared (empty) values", () => {
    for (const reg of [getCoreRegistry(), extendedRegistry()]) {
      const all = reg.attributes();
      const rand = mulberry32(7);
      for (let n = 0; n < 40; n++) {
        const entries = all.filter(() => rand() < 0.4).map((a) => [a.id, sampleValues(a)[rand() < 0.5 ? 0 : 1]] as [string, SelectionValue]);
        // re-set some attributes later (position must stay), and clear one with an empty value
        for (const [id] of entries.slice(0, 5)) entries.push([id, sampleValues(reg.getAttribute(id)!)[1]]);
        const multiAttr = all.find((a) => a.type === "multi");
        if (multiAttr) entries.push([multiAttr.id, sampleValues(multiAttr)[0]], [multiAttr.id, { kind: "multi", optionIds: [] }]);
        const fast = buildSpec(reg, entries);
        const fold = buildSpecByFold(reg, entries);
        expect(fast).toEqual(fold);
        expect(Object.keys(fast.selections)).toEqual(Object.keys(fold.selections));
      }
    }
  });
});
