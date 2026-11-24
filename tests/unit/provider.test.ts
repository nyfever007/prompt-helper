import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { compilePrompt, createEmptySpec, disabledImageProvider, getCoreRegistry } from "@/domain";

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });

describe("provider boundary — no paid/network calls in Sprint 0", () => {
  it("the disabled provider performs no network I/O and reports itself disabled", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const core = getCoreRegistry();
    const spec = createEmptySpec(core);
    const request = { spec, compilation: compilePrompt(spec, core) };
    expect(disabledImageProvider.capabilities.isPaid).toBe(false);
    expect(disabledImageProvider.estimateCost(request)).toBeNull();
    const result = await disabledImageProvider.generate(request, {});
    expect(result.status).toBe("failed");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("application source contains no network/API client calls", () => {
    const offenders = walk(join(process.cwd(), "src"))
      .filter((f) => /\.(ts|tsx)$/.test(f))
      .filter((f) => /\bfetch\s*\(|XMLHttpRequest|WebSocket|EventSource|from ["'](openai|@anthropic-ai|axios)/.test(readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
  });

  it("domain layer does not import UI frameworks", () => {
    const offenders = walk(join(process.cwd(), "src/domain")).filter((f) =>
      /from ["'](react|react-dom|next)(\/|["'])/.test(readFileSync(f, "utf8")),
    );
    expect(offenders).toEqual([]);
  });
});
