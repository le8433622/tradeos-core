import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    include: ["src/__tests__/**/*.test.ts"],
    env: {
      AI_EXECUTION_ENABLED: "true",
    },
  },
});
