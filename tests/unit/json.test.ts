import { describe, expect, it } from "vitest";
import {
  createEmptySpec,
  exportSpecJson,
  getCoreRegistry,
  importSpecJson,
  MAX_IMPORT_BYTES,
  migrateRawSpec,
  parseImageSpec,
} from "@/domain";
import { extendedRegistry } from "../fixtures/catalogs";
import { buildSpec, multi, single, text } from "../fixtures/specs";

const core = getCoreRegistry();

describe("6. JSON export/import round-trip", () => {
  it("export → import is lossless (core)", () => {
    const spec = buildSpec(core, [
      ["intent.description", text("A lighthouse at dusk,\nwith “quotes”, emoji 🌊 and 한국어")],
      ["subject.kind", single("architecture")],
      ["style.visual", single("oil_painting")],
    ]);
    const json = exportSpecJson(spec);
    const r = importSpecJson(json, core);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value).toEqual(spec);
    expect(exportSpecJson(r.value)).toBe(json); // byte-identical re-export
  });

  it("round-trips every value kind (extended catalog)", () => {
    const reg = extendedRegistry();
    const spec = buildSpec(reg, [
      ["mood.tone", multi("playful", "calm")],
      ["camera.focal_length", { kind: "number", value: 50.5 }],
      ["scene.people_count", { kind: "range", min: 1, max: 3 }],
      ["output.aspect_ratio", single("square")],
      ["intent.description", text("x")],
    ]);
    const r = importSpecJson(exportSpecJson(spec), reg);
    expect(r.ok && r.value).toEqual(spec);
  });

  it("export is canonical: selection keys sorted regardless of edit order", () => {
    const a = buildSpec(core, [["style.visual", single("anime")], ["subject.kind", single("animal")]]);
    const b = buildSpec(core, [["subject.kind", single("animal")], ["style.visual", single("anime")]]);
    expect(exportSpecJson(a)).toBe(exportSpecJson(b));
    expect(exportSpecJson(a).indexOf('"style.visual"')).toBeLessThan(exportSpecJson(a).indexOf('"subject.kind"'));
  });

  it("an older catalog version imports with a warning, not silently", () => {
    const reg = extendedRegistry(); // version 0.2.0, same id
    const r = importSpecJson(exportSpecJson(buildSpec(core, [["subject.kind", single("person")]])), reg);
    expect(r.ok).toBe(true);
    expect(r.diagnostics.map((d) => d.code)).toContain("spec.catalog_version_mismatch");
  });
});

describe("7. invalid JSON and schema input", () => {
  const valid = JSON.parse(exportSpecJson(buildSpec(core, [["subject.kind", single("person")]]))) as Record<string, unknown>;
  const variant = (patch: Record<string, unknown>) => JSON.stringify({ ...valid, ...patch });

  const cases: Array<[string, string, string]> = [
    ["empty file", "", "import.invalid_json"],
    ["truncated JSON", '{"kind": "prompter.image-spec",', "import.invalid_json"],
    ["plain text", "hello", "import.invalid_json"],
    ["JSON null", "null", "spec.not_object"],
    ["JSON array", "[]", "spec.not_object"],
    ["JSON number", "42", "spec.not_object"],
    ["wrong kind", variant({ kind: "something-else" }), "spec.wrong_kind"],
    ["missing schemaVersion", variant({ schemaVersion: undefined }), "spec.missing_version"],
    ["future schemaVersion", variant({ schemaVersion: "9.0.0" }), "spec.unsupported_version"],
    ["unknown top-level field", variant({ prompt: "a cat" }), "spec.schema"],
    ["selections not an object", variant({ selections: [] }), "spec.schema"],
    ["unknown attribute", variant({ selections: { "person.hair": { value: { kind: "text", text: "x" }, source: "user" } } }), "selection.unknown_attribute"],
    ["unknown option", variant({ selections: { "style.visual": { value: { kind: "single", optionId: "nope" }, source: "user" } } }), "value.unknown_option"],
    ["value kind mismatch", variant({ selections: { "style.visual": { value: { kind: "multi", optionIds: ["anime"] }, source: "user" } } }), "value.kind_mismatch"],
    ["different catalog", variant({ catalog: { id: "someone.else", version: "1.0.0" } }), "spec.catalog_mismatch"],
  ];

  it.each(cases)("%s → rejected with %s", (_name, input, code) => {
    const r = importSpecJson(input, core);
    expect(r.ok).toBe(false);
    expect(r.diagnostics.map((d) => d.code)).toContain(code);
  });

  it("rejects oversized input before parsing", () => {
    const r = importSpecJson(" ".repeat(MAX_IMPORT_BYTES + 1), core);
    expect(r.ok).toBe(false);
    expect(r.diagnostics[0]?.code).toBe("import.too_large");
  });

  it("the migration hook upgrades older raw specs when a migration exists", () => {
    const old = { ...JSON.parse(exportSpecJson(createEmptySpec(core))), schemaVersion: "0.0.9", legacy: true };
    expect(parseImageSpec(old).ok).toBe(false);
    const migrated = migrateRawSpec(old, [
      { from: "0.0.9", to: "0.1.0", migrate: (raw) => {
        const rest = { ...raw };
        delete rest.legacy;
        return { ...rest, schemaVersion: "0.1.0" };
      } },
    ]);
    expect(migrated.ok).toBe(true);
    if (migrated.ok) expect(parseImageSpec(migrated.value).ok).toBe(true);
  });

  it("migration loops are detected", () => {
    const loop = migrateRawSpec({ schemaVersion: "a" }, [
      { from: "a", to: "b", migrate: (r) => ({ ...r, schemaVersion: "b" }) },
      { from: "b", to: "a", migrate: (r) => ({ ...r, schemaVersion: "a" }) },
    ]);
    expect(loop.ok).toBe(false);
  });
});
