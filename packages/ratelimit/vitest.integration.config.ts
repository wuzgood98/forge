import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    globals: false,
    restoreMocks: true,
    include: ["src/**/*.integration.test.ts"],
    exclude: ["**/node_modules/**"],
    setupFiles: ["src/integration.setup.ts"],
    testTimeout: 30_000,
  },
});
