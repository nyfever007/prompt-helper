import { describe, expect, it } from "vitest";
import {
  createEmptySpec,
  createMemoryStore,
  createSpecStorage,
  getCoreRegistry,
  WORKSPACE_STORAGE_KEY,
  type KeyValueStore,
} from "@/domain";
import { buildSpec, single, text } from "../fixtures/specs";

const core = getCoreRegistry();
const spec = () =>
  buildSpec(core, [
    ["subject.kind", single("landscape")],
    ["intent.description", text("Misty mountains at dawn")],
  ]);

describe("10. local save and restore", () => {
  it("save → load restores the identical spec", () => {
    const store = createMemoryStore();
    const storage = createSpecStorage(store, core);
    const saved = storage.save(spec(), new Date("2026-11-24T00:00:00Z"));
    expect(saved.ok && saved.value.savedAt).toBe("2026-11-24T00:00:00.000Z");

    // a fresh storage instance over the same backing store (= page reload)
    const loaded = createSpecStorage(store, core).load();
    expect(loaded.status).toBe("loaded");
    if (loaded.status === "loaded") {
      expect(loaded.spec).toEqual(spec());
      expect(loaded.savedAt).toBe("2026-11-24T00:00:00.000Z");
    }
  });

  it("an empty store loads as empty", () => {
    expect(createSpecStorage(createMemoryStore(), core).load()).toEqual({ status: "empty" });
  });

  it("an empty spec is saved and restored as empty (unset preserved)", () => {
    const store = createMemoryStore();
    createSpecStorage(store, core).save(createEmptySpec(core));
    const loaded = createSpecStorage(store, core).load();
    expect(loaded.status === "loaded" && loaded.spec.selections).toEqual({});
    expect(loaded.status === "loaded" && loaded.migrations).toEqual([]);
  });

  it.each([
    ["corrupt JSON", "{not json"],
    ["unknown envelope", JSON.stringify({ hello: "world" })],
    ["future storage version", JSON.stringify({ kind: "prompter.workspace", storageVersion: 99, spec: {} })],
    ["spec of another catalog", JSON.stringify({ kind: "prompter.workspace", storageVersion: 1, savedAt: "x", spec: { ...createEmptySpec(core), catalog: { id: "x.y", version: "1.0.0" } } })],
  ])("%s → invalid, raw data backed up, no throw", (_n, raw) => {
    const store = createMemoryStore({ [WORKSPACE_STORAGE_KEY]: raw });
    const loaded = createSpecStorage(store, core).load();
    expect(loaded.status).toBe("invalid");
    if (loaded.status === "invalid") {
      expect(loaded.diagnostics.length).toBeGreaterThan(0);
      expect(store.getItem(loaded.backupKey)).toBe(raw);
    }
  });

  it("partially invalid saved spec → recoverable proposal; nothing applied; raw kept", () => {
    const raw = JSON.stringify({
      kind: "prompter.workspace",
      storageVersion: 1,
      savedAt: "2026-11-24T00:00:00.000Z",
      spec: {
        ...createEmptySpec(core),
        selections: {
          "subject.kind": { value: { kind: "single", optionId: "dragon" }, source: "user" },
          "intent.description": { value: { kind: "text", text: "Keep me" }, source: "user" },
          "person.hair": { value: { kind: "text", text: "unknown attr" }, source: "user" },
        },
      },
    });
    const store = createMemoryStore({ [WORKSPACE_STORAGE_KEY]: raw });
    const loaded = createSpecStorage(store, core).load();
    expect(loaded.status).toBe("recoverable");
    if (loaded.status !== "recoverable") return;
    expect(loaded.excluded.map((e) => e.path)).toEqual(["selections.person.hair", "selections.subject.kind"]);
    expect(loaded.excluded.find((e) => e.attributeId === "person.hair")!.original).toEqual({ value: { kind: "text", text: "unknown attr" }, source: "user" });
    expect(Object.keys(loaded.spec.selections)).toEqual(["intent.description"]);
    // original untouched in the main key AND copied to the backup key
    expect(store.getItem(WORKSPACE_STORAGE_KEY)).toBe(raw);
    expect(store.getItem(loaded.backupKey)).toBe(raw);
  });

  it("write failures (e.g. quota) are reported, not thrown", () => {
    const failing: KeyValueStore = {
      getItem: () => null,
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
      removeItem: () => {},
    };
    const r = createSpecStorage(failing, core).save(spec());
    expect(r.ok).toBe(false);
    expect(r.diagnostics[0]?.code).toBe("storage.write_failed");
  });

  it("read failures (storage blocked) are reported, not thrown", () => {
    const blocked: KeyValueStore = {
      getItem: () => {
        throw new Error("SecurityError");
      },
      setItem: () => {},
      removeItem: () => {},
    };
    const r = createSpecStorage(blocked, core).load();
    expect(r.status).toBe("invalid");
  });

  it("clear removes the saved workspace", () => {
    const store = createMemoryStore();
    const storage = createSpecStorage(store, core);
    storage.save(spec());
    storage.clear();
    expect(storage.load()).toEqual({ status: "empty" });
  });
});
