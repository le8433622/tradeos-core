import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@tradeos/product-data-core": path.resolve(
        __dirname,
        "../../packages/product-data-core/src",
      ),
    },
  },
  test: {
    globals: true,
    exclude: ["e2e/**", "node_modules/**"],
  },
});
