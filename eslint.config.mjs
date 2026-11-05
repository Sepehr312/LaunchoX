import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  { rules: { "@typescript-eslint/no-explicit-any": "error" } },
  {
    // Standalone deployment helpers run directly in Node.js as CommonJS.
    files: ["LaunchoX-Deploy/**/*.js"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "tmp/**",
    "test-results/**",
    "playwright-report/**",
    "tests/local/**",
  ]),
]);

export default eslintConfig;
