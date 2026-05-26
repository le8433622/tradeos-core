import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    env: {
      BILLING_SIDE_EFFECTS_ENABLED: "true",
    },
  },
});
