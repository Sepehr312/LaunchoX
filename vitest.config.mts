import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Step 2 introduces the first unit tests; remove this option at that point.
    passWithNoTests: true,
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
  },
});
