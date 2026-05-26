import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    env: {
      BILLING_SIDE_EFFECTS_ENABLED: "true",
    },
  },
});
