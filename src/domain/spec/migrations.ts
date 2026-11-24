import { error, fail, ok, type Result } from "../shared/diagnostics";
import { IMAGE_SPEC_SCHEMA_VERSION } from "./schema";

/**
 * Schema migration hook. Each migration upgrades raw JSON from one schema
 * version to the next (pure; the input object is never mutated).
 */
export interface SpecMigration {
  from: string;
  to: string;
  migrate(raw: Record<string, unknown>): Record<string, unknown>;
}

export const SPEC_MIGRATIONS: readonly SpecMigration[] = [
  // 0.2.0 only ADDS the optional `origin` field; 0.1.0 data is valid as-is (lossless).
  { from: "0.1.0", to: "0.2.0", migrate: (raw) => ({ ...raw, schemaVersion: "0.2.0" }) },
];

export const migrateRawSpec = (
  raw: Record<string, unknown>,
  migrations: readonly SpecMigration[] = SPEC_MIGRATIONS,
): Result<Record<string, unknown>> => {
  let current = raw;
  const seen = new Set<string>();
  for (;;) {
    const version = current.schemaVersion;
    if (version === IMAGE_SPEC_SCHEMA_VERSION) return ok(current);
    if (typeof version !== "string") {
      return fail([error("spec.missing_version", "schemaVersion is missing or not a string", { path: "schemaVersion" })]);
    }
    const step = migrations.find((m) => m.from === version);
    if (!step || seen.has(version)) {
      return fail([
        error(
          "spec.unsupported_version",
          `Unsupported schemaVersion "${version}" (this build reads ${IMAGE_SPEC_SCHEMA_VERSION})`,
          { path: "schemaVersion", params: { version, supported: IMAGE_SPEC_SCHEMA_VERSION } },
        ),
      ]);
    }
    seen.add(version);
    current = step.migrate(current);
  }
};
