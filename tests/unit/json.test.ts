import { describe, expect, it } from "vitest";
import {
  createEmptySpec,
  exportSpecJson,
  getCoreRegistry,
  importSpecJson,
  MAX_IMPORT_BYTES,
  migrateRawSpec,
  parseImageSpec,
  SPEC_MIGRATIONS,
} from "@/domain";
import { extendedRegistry } from "../fixtures/catalogs";
import { buildSpec, multi, single, text } from "../fixtures/specs";

const core = getCoreRegistry();

describe("6. JSON export/import round-trip", () => {
  it("export → import is lossless (all Basic Composer attributes)", () => {
    const spec = buildSpec(core, [
      ["intent.description", text("A lighthouse at dusk,\nwith “quotes”, emoji 🌊 and 한국어")],
      ["subject.kind", single("architecture")],
      ["style.preset", single("oil_painting")],
      ["composition.framing", single("panoramic")],
      ["composition.view_direction", single("side")],
      ["camera.angle", single("low_angle")],
      ["scene.setting", single("beach")],
      ["scene.background", single("detailed")],
      ["mood.tone", multi("epic", "mysterious", "calm")],
      ["lighting.preset", single("blue_hour")],
      ["output.aspect_ratio", single("ultrawide_21_9")],
    ]);
    const json = exportSpecJson(spec);
    const r = importSpecJson(json, core);
    expect(r.status).toBe("valid");
    if (r.status !== "valid") return;
    expect(r.spec).toEqual(spec);
    expect(r.migrations).toEqual([]);
    expect(exportSpecJson(r.spec)).toBe(json); // byte-identical re-export
  });

  it("round-trips every value kind (extended catalog)", () => {
    const reg = extendedRegistry();
    const spec = buildSpec(reg, [
      ["x.palette", multi("pastel", "warm")],
      ["x.focal_length", { kind: "number", value: 50.5 }],
      ["x.people_count", { kind: "range", min: 1, max: 3 }],
      ["output.aspect_ratio", single("square")],
      ["intent.description", text("x")],
    ]);
    const r = importSpecJson(exportSpecJson(spec), reg);
    expect(r.status === "valid" && r.spec).toEqual(spec);
  });

  it("round-trips inapplicable selections untouched", () => {
    const spec = buildSpec(core, [
      ["composition.framing", single("full_body")],
      ["composition.view_direction", single("front")],
      ["subject.kind", single("landscape")], // makes full_body + view direction inapplicable
    ]);
    const r = importSpecJson(exportSpecJson(spec), core);
    expect(r.status === "valid" && r.spec).toEqual(spec);
  });

  it("export is canonical: selection keys sorted regardless of edit order", () => {
    const a = buildSpec(core, [["style.preset", single("anime")], ["subject.kind", single("animal")]]);
    const b = buildSpec(core, [["subject.kind", single("animal")], ["style.preset", single("anime")]]);
    expect(exportSpecJson(a)).toBe(exportSpecJson(b));
    expect(exportSpecJson(a).indexOf('"style.preset"')).toBeLessThan(exportSpecJson(a).indexOf('"subject.kind"'));
  });

  it("a spec from another catalog version without a migration path imports with a warning, not silently", () => {
    const reg = extendedRegistry(); // 0.3.0, chain 0.1.0 → 0.2.0 → 0.3.0
    const raw = JSON.parse(exportSpecJson(buildSpec(core, [["subject.kind", single("person")]])));
    raw.catalog.version = "0.1.5";
    const r = importSpecJson(JSON.stringify(raw), reg);
    expect(r.status).toBe("valid");
    expect(r.status !== "invalid" && r.diagnostics.map((d) => d.code)).toEqual(expect.arrayContaining(["migration.no_path", "spec.catalog_version_mismatch"]));
  });
});

describe("7. invalid JSON and schema input", () => {
  const valid = JSON.parse(exportSpecJson(buildSpec(core, [["subject.kind", single("person")]]))) as Record<string, unknown>;
  const variant = (patch: Record<string, unknown>) => JSON.stringify({ ...valid, ...patch });

  const unusable: Array<[string, string, string]> = [
    ["empty file", "", "import.invalid_json"],
    ["truncated JSON", '{"kind": "prompter.image-spec",', "import.invalid_json"],
    ["plain text", "hello", "import.invalid_json"],
    ["JSON null", "null", "spec.not_object"],
    ["JSON array", "[]", "spec.not_object"],
    ["JSON number", "42", "spec.not_object"],
    ["wrong kind", variant({ kind: "something-else" }), "spec.wrong_kind"],
    ["missing schemaVersion", variant({ schemaVersion: undefined }), "spec.missing_version"],
    ["future schemaVersion", variant({ schemaVersion: "9.0.0" }), "spec.unsupported_version"],
    ["selections not an object", variant({ selections: [] }), "spec.schema"],
    ["bad task", variant({ task: "video" }), "spec.schema"],
    ["different catalog", variant({ catalog: { id: "someone.else", version: "1.0.0" } }), "spec.catalog_mismatch"],
  ];

  it.each(unusable)("%s → invalid (%s); nothing can be recovered", (_name, input, code) => {
    const r = importSpecJson(input, core);
    expect(r.status).toBe("invalid");
    expect(r.diagnostics.map((d) => d.code)).toContain(code);
  });

  const partial: Array<[string, Record<string, unknown>, string, string]> = [
    ["unknown top-level field", { prompt: "a cat" }, "prompt", "spec.unknown_field"],
    ["unknown attribute", { selections: { ...(valid.selections as object), "person.hair": { value: { kind: "text", text: "x" }, source: "user" } } }, "selections.person.hair", "selection.unknown_attribute"],
    ["unknown option", { selections: { ...(valid.selections as object), "style.preset": { value: { kind: "single", optionId: "nope" }, source: "user" } } }, "selections.style.preset", "value.unknown_option"],
    ["value kind mismatch", { selections: { ...(valid.selections as object), "style.preset": { value: { kind: "multi", optionIds: ["anime"] }, source: "user" } } }, "selections.style.preset", "value.kind_mismatch"],
    ["malformed selection", { selections: { ...(valid.selections as object), "scene.setting": { value: "forest" } } }, "selections.scene.setting", "spec.schema"],
    ["invalid attribute id", { selections: { ...(valid.selections as object), "Bad Key": { value: { kind: "text", text: "x" }, source: "user" } } }, "selections.Bad Key", "selection.invalid_id"],
  ];

  it.each(partial)("%s → recoverable; valid parts kept, bad part excluded with reason", (_name, patch, path, code) => {
    const r = importSpecJson(variant(patch), core);
    expect(r.status).toBe("recoverable");
    if (r.status !== "recoverable") return;
    expect(r.excluded.map((e) => e.path)).toEqual([path]);
    expect(r.excluded[0]!.diagnostics.map((d) => d.code)).toContain(code);
    // the valid selection survives in the proposal
    expect(r.spec.selections["subject.kind"]).toEqual({ value: single("person"), source: "user" });
  });

  it("rejects oversized input before parsing", () => {
    const r = importSpecJson(" ".repeat(MAX_IMPORT_BYTES + 1), core);
    expect(r.status).toBe("invalid");
    expect(r.diagnostics[0]?.code).toBe("import.too_large");
  });

  it("the schema migration hook upgrades older raw specs when a migration exists", () => {
    const old = { ...JSON.parse(exportSpecJson(createEmptySpec(core))), schemaVersion: "0.0.9", legacy: true };
    expect(parseImageSpec(old).ok).toBe(false);
    const migrated = migrateRawSpec(old, [
      ...SPEC_MIGRATIONS,
      {
        from: "0.0.9",
        to: "0.1.0",
        migrate: (raw) => {
          const rest = { ...raw };
          delete rest.legacy;
          return { ...rest, schemaVersion: "0.1.0" };
        },
      },
    ]);
    expect(migrated.ok).toBe(true);
    if (migrated.ok) expect(parseImageSpec(migrated.value).ok).toBe(true);
  });

  it("schema migration loops are detected", () => {
    const loop = migrateRawSpec({ schemaVersion: "a" }, [
      { from: "a", to: "b", migrate: (r) => ({ ...r, schemaVersion: "b" }) },
      { from: "b", to: "a", migrate: (r) => ({ ...r, schemaVersion: "a" }) },
    ]);
    expect(loop.ok).toBe(false);
  });
});
