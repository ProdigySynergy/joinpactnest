import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    deps: {
      // Noble ships modern ESM that Vitest should load natively
      optimizer: { ssr: { enabled: false } },
    },
  },
});
