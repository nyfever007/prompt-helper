import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  compilePrompt,
  createMemoryStore,
  createSpecStorage,
  exportSpecJson,
  getCoreRegistry,
  importSpecJson,
  migrateCatalogSelections,
  MIGRATION_LOG_KEY,
  WORKSPACE_STORAGE_KEY,
} from "@/domain";
import { extendedRegistry } from "../fixtures/catalogs";
import { buildSpec, multi, single } from "../fixtures/specs";

const core = getCoreRegistry();
const fixture = (name: string) => readFileSync(join(__dirname, "../fixtures/sprint0", name), "utf8");

describe("Sprint 0 data compatibility (real Sprint 0 output, catalog 0.1.0 → 0.2.0)", () => {
  it("exported Sprint 0 JSON imports losslessly with a recorded, reasoned rename", () => {
    const raw = JSON.parse(fixture("export-full.json"));
    const r = importSpecJson(fixture("export-full.json"), core);
    expect(r.status).toBe("valid");
    if (r.status !== "valid") return;
    expect(r.migrations).toEqual([
      expect.objectContaining({ op: "renameAttribute", from: "style.visual", to: "style.preset", fromVersion: "0.1.0", toVersion: "0.2.0" }),
    ]);
    expect(r.migrations[0]!.reason.ko).toMatch(/프리셋/);
    expect(r.spec.catalog).toEqual({ id: "prompter.core", version: "0.8.0" });
    expect(r.spec.schemaVersion).toBe("0.3.0");
    // every user value is preserved exactly (same value objects, same sources), only the key moved
    expect(r.spec.selections["style.preset"]).toEqual(raw.selections["style.visual"]);
    expect(r.spec.selections["subject.kind"]).toEqual(raw.selections["subject.kind"]);
    expect(r.spec.selections["intent.description"]).toEqual(raw.selections["intent.description"]);
    expect(Object.keys(r.spec.selections).sort()).toEqual(["intent.description", "style.preset", "subject.kind"]);
    // and the Sprint 0 prompt sentences are reproduced (Korean free text is kept as-is and flagged)
    const c = compilePrompt(r.spec, core);
    expect(c.prompt).toBe("비 오는 카페 창가에서 책을 읽는 사람 — reading by the window. Main subject: a single person. Visual style: watercolor painting.");
    expect(c.diagnostics.map((d) => d.code)).toContain("prompt.mixed_language");
  });

  it("every Sprint 0 subject and style option id migrates losslessly", () => {
    const all = JSON.parse(fixture("export-all-options.json")) as Array<{ selections: Record<string, unknown> }>;
    expect(all).toHaveLength(8);
    for (const old of all) {
      const r = importSpecJson(JSON.stringify(old), core);
      expect(r.status).toBe("valid");
      if (r.status !== "valid") continue;
      expect(r.spec.selections["style.preset"]).toEqual(old.selections["style.visual"]);
      expect(r.spec.selections["subject.kind"]).toEqual(old.selections["subject.kind"]);
    }
  });

  it("an empty Sprint 0 spec migrates without recording changes that did not happen", () => {
    const r = importSpecJson(fixture("export-empty.json"), core);
    expect(r.status === "valid" && r.migrations).toEqual([]);
    expect(r.status === "valid" && r.spec.catalog.version).toBe("0.8.0");
  });

  it("Sprint 0 localStorage data restores, keeps the original, and logs the migration", () => {
    const raw = fixture("localstorage-workspace.txt");
    const store = createMemoryStore({ [WORKSPACE_STORAGE_KEY]: raw });
    const storage = createSpecStorage(store, core);
    const loaded = storage.load(new Date("2026-11-25T00:00:00Z"));
    expect(loaded.status).toBe("loaded");
    if (loaded.status !== "loaded") return;
    expect(loaded.migrations.map((m) => `${m.from}→${m.to}`)).toEqual(["style.visual→style.preset"]);
    expect(store.getItem(loaded.preMigrationBackupKey!)).toBe(raw); // original preserved verbatim
    expect(storage.readMigrationLog()).toEqual([
      { at: "2026-11-25T00:00:00.000Z", sourceSavedAt: "2026-11-24T02:00:00.000Z", records: loaded.migrations },
    ]);
    // loading again (e.g. React StrictMode double effect) does not duplicate the log entry
    storage.load(new Date("2026-11-25T00:00:01Z"));
    expect(storage.readMigrationLog()).toHaveLength(1);
    // after the app saves, the next load needs no migration
    storage.save(loaded.spec);
    const again = createSpecStorage(store, core).load();
    expect(again.status === "loaded" && again.migrations).toEqual([]);
    expect(again.status === "loaded" && again.spec).toEqual(loaded.spec);
    expect(JSON.parse(store.getItem(MIGRATION_LOG_KEY)!)).toHaveLength(1);
  });
});

describe("catalog ID migration mechanics", () => {
  it("chains multiple steps (0.1.0 → … → 0.8.0 → 0.9.0) and renames options in single and multi values", () => {
    const reg = extendedRegistry(); // 0.9.0 renames style render_3d→cgi_render, mood eerie→uncanny
    const old = {
      "style.visual": { value: { kind: "single", optionId: "render_3d" }, source: "user" },
      "mood.tone": { value: { kind: "multi", optionIds: ["calm", "eerie"] }, source: "import" },
    };
    const r = migrateCatalogSelections(old, "0.1.0", reg);
    expect(r.version).toBe("0.9.0");
    expect(r.selections).toEqual({
      "style.preset": { value: { kind: "single", optionId: "cgi_render" }, source: "user" },
      "mood.tone": { value: { kind: "multi", optionIds: ["calm", "uncanny"] }, source: "import" },
    });
    expect(r.records.map((x) => `${x.op}:${x.attributeId}:${x.from}→${x.to}`)).toEqual([
      "renameAttribute:style.preset:style.visual→style.preset",
      "renameOption:style.preset:render_3d→cgi_render",
      "renameOption:mood.tone:eerie→uncanny",
    ]);
    // the input object was not mutated (original preserved)
    expect(old["style.visual"].value.optionId).toBe("render_3d");
  });

  it("does not overwrite: a rename whose target already exists is reported, not applied", () => {
    const sel = {
      "style.visual": { value: { kind: "single", optionId: "anime" }, source: "user" },
      "style.preset": { value: { kind: "single", optionId: "watercolor" }, source: "user" },
    };
    const r = migrateCatalogSelections(sel, "0.1.0", core);
    expect(r.diagnostics.map((d) => d.code)).toEqual(["migration.collision"]);
    expect(r.selections).toEqual(sel);
    // …and the leftover old key then surfaces through recovery, never silently dropped
    const imported = importSpecJson(JSON.stringify({ ...JSON.parse(exportSpecJson(buildSpec(core, []))), catalog: { id: "prompter.core", version: "0.1.0" }, selections: sel }), core);
    expect(imported.status).toBe("recoverable");
    expect(imported.status === "recoverable" && imported.excluded.map((e) => e.path)).toEqual(["selections.style.visual"]);
  });

  it("unknown attributes and options are never guessed or re-mapped", () => {
    const sel = {
      "style.visul": { value: { kind: "single", optionId: "anime" }, source: "user" }, // typo
      "subject.kind": { value: { kind: "single", optionId: "persn" }, source: "user" }, // typo
    };
    const r = migrateCatalogSelections(sel, "0.1.0", core);
    expect(r.selections).toEqual(sel);
    expect(r.records).toEqual([]);
  });

  it("specs from a newer catalog or an unknown older version are reported, not transformed", () => {
    expect(migrateCatalogSelections({}, "9.0.0", core).diagnostics[0]!.code).toBe("migration.catalog_newer");
    expect(migrateCatalogSelections({}, "0.0.1", core).diagnostics[0]!.code).toBe("migration.no_path");
  });

  it("current-version specs pass through untouched (same object)", () => {
    const sel = { "mood.tone": { value: multi("calm"), source: "user" } };
    expect(migrateCatalogSelections(sel, "0.8.0", core).selections).toBe(sel);
    void single;
  });
});
