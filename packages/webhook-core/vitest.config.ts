import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    env: {
      WEBHOOK_PROCESSING_ENABLED: "true",
    },
  },
});
