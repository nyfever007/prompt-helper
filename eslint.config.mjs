import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Domain logic must stay framework-free (see docs/ARCHITECTURE.md).
    files: ["src/domain/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["react", "react-dom", "next", "next/*"], message: "src/domain must not depend on UI frameworks." },
            { group: ["@/components/*", "@/state/*", "@/app/*"], message: "src/domain must not depend on UI layers." },
          ],
        },
      ],
    },
  },
  globalIgnores([".next/**", ".next-e2e/**", "out/**", "build/**", "next-env.d.ts", "coverage/**", "playwright-report/**", "test-results/**"]),
]);
