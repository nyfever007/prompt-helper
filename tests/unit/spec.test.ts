import { describe, expect, it } from "vitest";
import {
  createEmptySpec,
  getCoreRegistry,
  IMAGE_SPEC_KIND,
  IMAGE_SPEC_SCHEMA_VERSION,
  parseImageSpec,
  validateImageSpec,
} from "@/domain";
import { buildSpec, single, text } from "../fixtures/specs";

const core = getCoreRegistry();

describe("1. ImageSpec creation and validation", () => {
  it("creates an empty, versioned spec bound to the catalog", () => {
    const spec = createEmptySpec(core);
    expect(spec).toEqual({
      kind: IMAGE_SPEC_KIND,
      schemaVersion: IMAGE_SPEC_SCHEMA_VERSION,
      task: "text-to-image",
      catalog: { id: "prompter.core", version: "0.2.0" },
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
