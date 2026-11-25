import { readFileSync, writeFileSync } from "node:fs";
import { countTokens } from "gpt-tokenizer/encoding/o200k_base";
import { expect, it } from "vitest";
import { applyRandomComposition, compilePrompt, composeRandom, createEmptySpec, getCoreRegistry, PROMPT_DETAILS, RANDOM_STYLES, viewPrompt } from "@/domain";

/**
 * Sprint 2-D.7 — docs/examples/random-prompts.md: real Natural / Creative / Chaos prompts at Compact / Balanced / Full.
 * The document is generated from the code (PRINT_PROMPT_EXAMPLES=1 rewrites it) and this test keeps it in sync.
 */
const SEED = 20261125;
const DOC = "docs/examples/random-prompts.md";

const render = () => {
  const core = getCoreRegistry();
  const table: string[] = [
    "# 랜덤 생성 프롬프트 예시 (Sprint 2-D.7)",
    "",
    `같은 시드(${SEED}), 아무것도 설정하지 않은 상태에서 각 랜덤 방식으로 한 번 생성한 결과입니다. 코드에서 생성되며 \`tests/unit/prompt-examples.test.ts\`가 내용이 최신인지 확인합니다(다시 만들기: \`PRINT_PROMPT_EXAMPLES=1 pnpm vitest run tests/unit/prompt-examples.test.ts\`).`,
    "",
    "토큰은 로컬 o200k_base 토크나이저로 센 값입니다. 비용은 GPT Image 1.5 공개 가격(텍스트 입력 $5 / 100만 토큰, 2026-11-25 확인) 기준 **텍스트 입력 비용만**이며, 이미지 생성 비용은 포함하지 않습니다.",
    "",
    "| 방식 | 설정 값 | 출력 방식 | 출력 속성 | 글자 | 토큰 | 텍스트 입력 비용 |",
    "|---|---:|---|---:|---:|---:|---:|",
  ];
  const sections: string[] = [];
  for (const style of RANDOM_STYLES) {
    const spec = applyRandomComposition(createEmptySpec(core), core, composeRandom(createEmptySpec(core), core, SEED, style)).spec;
    const c = compilePrompt(spec, core);
    const values = Object.keys(spec.selections).length;
    sections.push(`## ${style[0]!.toUpperCase()}${style.slice(1)}`, "");
    for (const d of PROMPT_DETAILS) {
      const v = viewPrompt(c, spec, core, d);
      const tokens = countTokens(v.prompt);
      table.push(`| ${style} | ${values} | ${d} | ${v.fragments.length} | ${v.prompt.length} | ${tokens} | $${((tokens * 5) / 1e6).toFixed(5)} |`);
      sections.push(`### ${style} · ${d} — 출력 속성 ${v.fragments.length}개, ${v.prompt.length}자, 토큰 ${tokens}${v.omitted.length ? ` (생략 ${v.omitted.length}개)` : ""}`, "", "```text", v.prompt, "```", "");
    }
  }
  return [...table, "", ...sections].join("\n");
};

it("docs/examples/random-prompts.md matches the current generation", () => {
  const text = render();
  if (process.env.PRINT_PROMPT_EXAMPLES) writeFileSync(DOC, text);
  expect(readFileSync(DOC, "utf8")).toBe(text);
});
